# api_predict.py
import io
import time
from typing import Dict, Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from PIL import Image
from utils.verify import verifyAuth  
from utils.predict import predict as pred 

router = APIRouter()

@router.post("/predict")
async def predict_endpoint(request: Request, file: Optional[UploadFile] = File(None)):
    # 0) Verify auth first; verifyAuth should raise HTTPException on failure
    claims = verifyAuth(request)

    pil_img = None
    source = None

    # 1) If multipart UploadFile was provided, prefer it
    if file is not None:
        content_type = (file.content_type or "").lower()
        if not content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"Unsupported content type for uploaded file: {file.content_type}")
        try:
            body = await file.read()
            pil_img = Image.open(io.BytesIO(body)).convert("RGB")
            source = "upload"
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read uploaded image: {e}")

    # 2) If no UploadFile, check for raw image binary in request body
    if pil_img is None:
        content_type = (request.headers.get("content-type") or "").lower()
        # Accept image/* content types for raw binary payloads
        if content_type.startswith("image/"):
            try:
                body = await request.body()
                if not body:
                    raise ValueError("Empty request body")
                pil_img = Image.open(io.BytesIO(body)).convert("RGB")
                source = "binary"
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to parse raw image body: {e}")

    # 3) If still no image, return 400
    if pil_img is None:
        raise HTTPException(status_code=400, detail="No image provided. Send a multipart UploadFile or raw image bytes with Content-Type: image/*")

    # 4) Run blocking predict() in a threadpool
    start = time.perf_counter()
    try:
        result = await run_in_threadpool(pred, pil_img)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")
    end = time.perf_counter()

    # 5) response metadata
    w, h = pil_img.size
    return JSONResponse({
        "predictions": result,
        "inference_time_s": end - start,
        "width": w,
        "height": h,
        "source": source,
        "auth_claims": claims  
    })
