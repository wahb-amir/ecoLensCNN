# utils/predict.py
import io
import os
import hashlib
from typing import Dict, Optional
from PIL import Image
import numpy as np
import torch

# Try multiple likely import names for your preprocessing util
try:
 
    from .pre_processing import pre_processing
except Exception:
    try:
        from .pre_processing import pre_processing
    except Exception:
        raise ImportError("Could not import pre_processing. Make sure utils_preprocessing.py exists and defines pre_processing().")
      

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

USE_TTA = False  # toggle if you want five-crop TTA at inference time

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
# Model loading utilities
# -----------------------
MODEL: Optional[torch.nn.Module] = None
MODEL_PATHS = [
    "./model/efficientnet_b0_waste_classifier_v4.pth"
]

def _strip_module_prefix(state_dict):
    return {k.replace("module.", ""): v for k, v in state_dict.items()}

def _looks_like_state_dict(d):
    if not isinstance(d, dict) or len(d) == 0:
        return False
    tensor_vals = sum(1 for v in d.values() if isinstance(v, torch.Tensor))
    return tensor_vals >= max(1, int(0.6 * len(d)))

def load_model_from_path(path: str) -> torch.nn.Module:
    """
    Try to load a model from path. This attempts:
      - torch.jit.load (scripted)
      - torch.load + state_dict detection (instantiates EfficientNet or ResNet fallback)
      - torch.load full model object
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found: {path}")

    # 1) scripted/traced
    try:
        m = torch.jit.load(path, map_location="cpu")
        m.eval()
        print(f"Loaded scripted model from {path}")
        return m
    except Exception:
        pass

    # 2) torch.load
    ckpt = torch.load(path, map_location="cpu")
    # if plain state_dict
    if _looks_like_state_dict(ckpt):
        state = _strip_module_prefix(ckpt)
        keys = " ".join(state.keys())
        from torchvision import models
        try:
            # detect EfficientNet-like
            if "features" in keys:
                print("Instantiating EfficientNet-B0 (inference loader)")
                model = models.efficientnet_b0(pretrained=False)
                try:
                    in_f = model.classifier[1].in_features
                    model.classifier[1] = torch.nn.Linear(in_f, NUM_CLASSES)
                except Exception:
                    model.classifier = torch.nn.Sequential(torch.nn.Dropout(0.3), torch.nn.Linear(model.classifier.in_features, NUM_CLASSES))
            else:
                print("Instantiating ResNet18 (inference loader)")
                model = models.resnet18(pretrained=False)
                model.fc = torch.nn.Linear(model.fc.in_features, NUM_CLASSES)

            missing, unexpected = model.load_state_dict(state, strict=False)
            model.eval()
            print(f"Loaded state_dict into model (strict=False). Missing: {missing}, Unexpected: {unexpected}")
            return model
        except Exception as e:
            raise RuntimeError(f"Failed to instantiate model from state_dict: {e}")

    # 3) nested dicts
    if isinstance(ckpt, dict):
        for key in ["model_state_dict", "state_dict", "model_state"]:
            if key in ckpt and _looks_like_state_dict(ckpt[key]):
                state = _strip_module_prefix(ckpt[key])
                from torchvision import models
                try:
                    model = models.efficientnet_b0(pretrained=False)
                    in_f = model.classifier[1].in_features
                    model.classifier[1] = torch.nn.Linear(in_f, NUM_CLASSES)
                    missing, unexpected = model.load_state_dict(state, strict=False)
                    model.eval()
                    print(f"Loaded nested state_dict into EfficientNet (strict=False). Missing: {missing}, Unexpected: {unexpected}")
                    return model
                except Exception:
                    model = models.resnet18(pretrained=False)
                    model.fc = torch.nn.Linear(model.fc.in_features, NUM_CLASSES)
                    missing, unexpected = model.load_state_dict(state, strict=False)
                    model.eval()
                    print(f"Loaded nested state_dict into ResNet18 (strict=False). Missing: {missing}, Unexpected: {unexpected}")
                    return model

    # 4) Maybe full model object
    try:
        ckpt.eval()
        print("Loaded full model object via torch.load")
        return ckpt
    except Exception as e:
        raise RuntimeError(f"Unable to interpret model file: {e}")

def initialize_model():
    global MODEL
    if MODEL is not None:
        return MODEL

    for path in MODEL_PATHS:
        if os.path.exists(path):
            try:
                MODEL = load_model_from_path(path)
                print(f"Model loaded from: {path}")
                return MODEL
            except Exception as e:
                print(f"Failed to load {path}: {e}")

    print("Warning: No model loaded. Set MODEL manually or place model file in one of MODEL_PATHS.")
    return None

# Try to auto-initialize on import (safe - will only print warnings if absent)
initialize_model()

# -----------------------
# Prediction
# -----------------------
def predict(image: Image.Image) -> Dict[str, float]:
    if image is None:
        return {"error": "no image provided"}

    # bytes for cache key
    bio = io.BytesIO()
    image.save(bio, format="JPEG")
    image_bytes = bio.getvalue()
    key = bytes_to_md5(image_bytes + (b"_tta" if USE_TTA else b"_no_tta"))

    cached = cache_get(key)
    if cached is not None:
        return cached

    pil = image.convert("RGB")

    if MODEL is None:
        return {"error": "model not loaded on server"}

    # determine device
    try:
        model_device = next(MODEL.parameters()).device
    except Exception:
        model_device = torch.device("cpu")

    x = pre_processing(pil, tta=USE_TTA, device=model_device)  # returns (N, C, H, W)

    with torch.no_grad():
        logits = MODEL(x)
        if isinstance(logits, torch.Tensor):
            logits = logits.cpu().numpy()
        else:
            logits = np.array(logits)

    # average across TTA crops if present
    if logits.ndim == 2:
        avg_logits = logits.mean(axis=0)
    elif logits.ndim == 1:
        avg_logits = logits
    else:
        avg_logits = logits.reshape(-1)

    probs = softmax_numpy(avg_logits)

    prob_dict = {CLASSES[i]: float(probs[i]) for i in range(NUM_CLASSES)}

    if float(probs.max()) < CONFIDENCE_THRESHOLD:
        prob_dict = {"Unknown/Mixed": float(probs.max())}
        cache_put(key, prob_dict)
        return prob_dict

    cache_put(key, prob_dict)
    return prob_dict

# Small convenience wrapper used previously by your Gradio UI
def predict_label(image: Image.Image) -> Dict[str, float]:
    result = predict(image)
    if "error" in result:
        return result
    if "Unknown/Mixed" in result:
        return {"Unknown/Mixed": result["Unknown/Mixed"]}
    items = sorted(result.items(), key=lambda x: x[1], reverse=True)[:TOPK]
    return {k: float(v) for k, v in items}
