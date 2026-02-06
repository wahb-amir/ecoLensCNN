# utils/predict.py  (single-model version)
import io
import os
import hashlib
from typing import Dict, Optional
from PIL import Image
import numpy as np
import torch
from torchvision import models

# Try multiple likely import names for your preprocessing util
try:
    from .pre_processing import pre_processing
except Exception:
    try:
        from utils.pre_processing import pre_processing
    except Exception:
        raise ImportError("Could not import pre_processing.")

# -----------------------
# Config / labels
# -----------------------
CLASSES = [
    "battery", "biological", "cardboard", "clothes", "glass",
    "metal", "paper", "plastic", "shoes", "trash"
]
NUM_CLASSES = len(CLASSES)

CONFIDENCE_THRESHOLD = 0.35
TOPK = 3
USE_TTA = False

# -----------------------
# Helpers
# -----------------------
def softmax_numpy(x: np.ndarray) -> np.ndarray:
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum(axis=-1, keepdims=True)

def bytes_to_md5(b: bytes) -> str:
    return hashlib.md5(b).hexdigest()

# Simple in-memory cache
PRED_CACHE: Dict[str, Dict] = {}
CACHE_MAX = 500

def cache_put(key: str, value: Dict):
    if len(PRED_CACHE) >= CACHE_MAX:
        PRED_CACHE.pop(next(iter(PRED_CACHE)))
    PRED_CACHE[key] = value

def cache_get(key: str) -> Optional[Dict]:
    return PRED_CACHE.get(key)

# -----------------------
# Model Loading Logic (single model)
# -----------------------
LOADED_MODEL: Optional[torch.nn.Module] = None
MODEL_PATH = "./CNN/v4.pth"

def _strip_module_prefix(state_dict):
    return {k.replace("module.", ""): v for k, v in state_dict.items()}

def _looks_like_state_dict(d):
    if not isinstance(d, dict) or len(d) == 0:
        return False
    tensor_vals = sum(1 for v in d.values() if isinstance(v, torch.Tensor))
    return tensor_vals >= max(1, int(0.6 * len(d)))

def load_single_model(path: str) -> torch.nn.Module:
    """
    Robust loader that handles JIT, state_dict (ResNet/EfficientNet), or full objects.
    Returns model on CPU in eval mode.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model path not found: {path}")

    # 1. Try JIT
    try:
        m = torch.jit.load(path, map_location="cpu")
        m.eval()
        return m
    except Exception:
        pass

    # 2. Try torch.load
    ckpt = torch.load(path, map_location="cpu")

    # Helper to instantiate architecture
    def instantiate_arch(state_keys):
        keys_str = " ".join(state_keys)
        # EfficientNet-like vs ResNet-like heuristic
        if "features" in keys_str and "classifier" in keys_str:
            model = models.efficientnet_b0(pretrained=False)
            # Replace classifier robustly
            try:
                # torchvision efficientnet classifier usually Sequential([Dropout, Linear])
                if isinstance(model.classifier, torch.nn.Sequential) and hasattr(model.classifier[-1], "in_features"):
                    in_f = model.classifier[-1].in_features
                    model.classifier[-1] = torch.nn.Linear(in_f, NUM_CLASSES)
                else:
                    model.classifier = torch.nn.Sequential(torch.nn.Dropout(0.2), torch.nn.Linear(1280, NUM_CLASSES))
            except Exception:
                model.classifier = torch.nn.Sequential(torch.nn.Dropout(0.2), torch.nn.Linear(1280, NUM_CLASSES))
            return model
        else:
            model = models.resnet18(pretrained=False)
            model.fc = torch.nn.Linear(model.fc.in_features, NUM_CLASSES)
            return model

    # Case A: Plain state_dict
    if _looks_like_state_dict(ckpt):
        state = _strip_module_prefix(ckpt)
        model = instantiate_arch(state.keys())
        model.load_state_dict(state, strict=False)
        model.eval()
        return model

    # Case B: Nested dict (checkpoint)
    if isinstance(ckpt, dict):
        for key in ["model_state_dict", "state_dict", "model_state"]:
            if key in ckpt and _looks_like_state_dict(ckpt[key]):
                state = _strip_module_prefix(ckpt[key])
                model = instantiate_arch(state.keys())
                model.load_state_dict(state, strict=False)
                model.eval()
                return model

    # Case C: Full model object saved (torch.save(model))
    try:
        ckpt.eval()
        return ckpt
    except Exception:
        raise RuntimeError(f"Could not load model from {path}")

def initialize_model():
    """
    Load the single configured model into LOADED_MODEL (CPU).
    """
    global LOADED_MODEL
    if LOADED_MODEL is not None:
        return LOADED_MODEL

    print(f"--- Loading single model from {MODEL_PATH} ---")
    try:
        m = load_single_model(MODEL_PATH)
        # ensure on CPU and eval mode
        m.to(torch.device("cpu"))
        m.eval()
        LOADED_MODEL = m
        print(f"✅ Successfully loaded model: {MODEL_PATH}")
    except Exception as e:
        LOADED_MODEL = None
        print(f"❌ Failed to load model {MODEL_PATH}: {e}")
    return LOADED_MODEL

# Auto-init on import
initialize_model()

# -----------------------
# Prediction Logic (Single model)
# -----------------------
def predict(image: Image.Image) -> Dict[str, float]:
    if image is None:
        return {"error": "no image provided"}

    model = LOADED_MODEL
    if model is None:
        return {"error": "no model loaded on server"}

    # cache key includes TTA flag and model path
    bio = io.BytesIO()
    image.save(bio, format="JPEG")
    image_bytes = bio.getvalue()
    key = bytes_to_md5(image_bytes + f"_tta{USE_TTA}_{os.path.basename(MODEL_PATH)}".encode())

    cached = cache_get(key)
    if cached is not None:
        return cached

    pil = image.convert("RGB")
    # try to infer device the model is on; default to cpu
    try:
        device = next(model.parameters()).device
    except Exception:
        device = torch.device("cpu")

    # preprocess (should return tensor on specified device)
    x = pre_processing(pil, tta=USE_TTA, device=device)  # expected shape: (N, C, H, W) or (C,H,W)
    if isinstance(x, torch.Tensor) and x.dim() == 3:
        x = x.unsqueeze(0)

    # forward
    with torch.no_grad():
        logits = model(x)  # expecting (N, C) or (C,) or (1,C)
        if isinstance(logits, torch.Tensor):
            logits_np = logits.cpu().numpy()
        else:
            # some models return numpy directly (unlikely) — try to convert
            logits_np = np.asarray(logits)

    # Handle shapes: if TTA produced multiple crops => average; else flatten
    if logits_np.ndim == 2:
        model_logits = logits_np.mean(axis=0)
    elif logits_np.ndim == 1:
        model_logits = logits_np
    else:
        # fallback: flatten last dim
        model_logits = logits_np.reshape(-1)[:NUM_CLASSES]

    # Convert to probability and normalize
    probs = softmax_numpy(model_logits)
    # Ensure length
    if probs.shape[-1] != NUM_CLASSES:
        # If shape mismatch, try to pad/truncate safely
        if probs.shape[-1] < NUM_CLASSES:
            padded = np.zeros(NUM_CLASSES, dtype=float)
            padded[:probs.shape[-1]] = probs
            probs = padded
        else:
            probs = probs[:NUM_CLASSES]

    # Format output
    prob_dict = {CLASSES[i]: float(probs[i]) for i in range(NUM_CLASSES)}

    max_conf = float(probs.max())
    if max_conf < CONFIDENCE_THRESHOLD:
        result = {"Unknown/Mixed": max_conf}
        cache_put(key, result)
        return result

    cache_put(key, prob_dict)
    return prob_dict

def predict_label(image: Image.Image) -> Dict[str, float]:
    """
    Wrapper for UI: returns top K classes or Unknown.
    """
    result = predict(image)

    if "error" in result:
        return result

    if "Unknown/Mixed" in result:
        return {"Unknown/Mixed": result["Unknown/Mixed"]}

    items = sorted(result.items(), key=lambda x: x[1], reverse=True)[:TOPK]
    return {k: float(v) for k, v in items}
