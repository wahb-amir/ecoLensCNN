from fastapi import FastAPI
from api.predict.route import router as predict_router
from dotenv import load_dotenv
import os
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI not set in .env")

client = AsyncIOMotorClient(MONGO_URI)
db = client.get_default_database()  

app = FastAPI()
app.include_router(predict_router, prefix="/api", tags=["predict"])

@app.get("/health")
async def root():
    return {"message": "Alive and Thriving!"}
