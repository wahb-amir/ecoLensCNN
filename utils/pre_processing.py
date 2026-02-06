# utils_preprocessing.py
from typing import Tuple
from PIL import Image
import torch
from torchvision import transforms
import torchvision.transforms.functional as F

# Standard ImageNet normalization (matches your training pipeline)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

# Basic deterministic inference transform (safe, matches training center-crop pipeline)
_basic_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
])

def _tensor_from_pil(img: Image.Image) -> torch.Tensor:
    """Convert PIL RGB image -> normalized tensor (C,H,W)."""
    return _basic_transform(img)

def pre_processing(image: Image.Image, tta: bool = False, device: torch.device = torch.device("cpu")) -> torch.Tensor:
    """
    Preprocess a PIL image for model inference.

    Args:
        image: PIL.Image in any mode (will be converted to RGB).
        tta: If True, return a batch of 5 crops (five-crop TTA). If False, return a single image tensor.
        device: torch.device to put the returned tensor on.

    Returns:
        Tensor of shape (N, C, H, W). N==1 for no TTA, N==5 for five-crop TTA.
    """
    if image is None:
        raise ValueError("No image provided to pre_processing")

    pil = image.convert("RGB")

    if not tta:
        x = _tensor_from_pil(pil).unsqueeze(0).to(device)  # (1, C, H, W)
        return x

    # TTA: FiveCrop -> returns 5 PIL.Image crops (top-left, top-right, bottom-left, bottom-right, center)
    # We use Resize -> FiveCrop(224) to produce consistent crops
    resized = transforms.Resize(256)(pil)
    crops = F.five_crop(resized, (224, 224))  # returns tuple of 5 PIL images

    tensors = [ _tensor_from_pil(c).unsqueeze(0) for c in crops ]  # list of (1,C,H,W)
    batch = torch.cat(tensors, dim=0).to(device)  # (5, C, H, W)
    return batch
