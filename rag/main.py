from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import sys
import os

# Ensure the parent directory is in sys.path so we can run this directly if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag.ingest import run_ingest_pipeline
from rag.retrieve import query_rag

app = FastAPI(
    title="RAG Pipeline API",
    description="API for ingesting data and querying a RAG pipeline powered by Gemini and Supabase.",
    version="1.0.0"
)

class QueryRequest(BaseModel):
    question: str

@app.post("/query")
def query_endpoint(request: QueryRequest):
    """
    Queries the RAG pipeline with a question.
    """
    if not request.question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    result = query_rag(request.question)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result

@app.post("/ingest")
def ingest_endpoint():
    """
    Triggers the ingestion pipeline to parse documents, embed them, and store in Supabase.
    """
    try:
        run_ingest_pipeline()
        return {"status": "success", "message": "Ingestion pipeline completed successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

from rag.vapi.cal_functions import get_availability, book_meeting

class BookMeetingRequest(BaseModel):
    name: str
    email: str
    slot_iso: str

@app.get("/get_availability")
def get_availability_endpoint():
    slots_string = get_availability()
    return {"result": slots_string}

@app.post("/book_meeting")
def book_meeting_endpoint(request: BookMeetingRequest):
    confirmation = book_meeting(request.name, request.email, request.slot_iso)
    return {"result": confirmation}

@app.post("/vapi-webhook")
async def vapi_webhook(payload: dict):
    message = payload.get("message", {})
    user_message = message.get("content", "")
    
    rag_result = query_rag(user_message)
    answer = rag_result.get("answer", "")
    
    return {
      "assistant": {
        "model": {
          "systemPrompt": f"You are Janhavi's AI representative. Use ONLY this context to answer: {answer}. Never invent facts."
        }
      }
    }

if __name__ == "__main__":
    # Run the server locally
    uvicorn.run("rag.main:app", host="0.0.0.0", port=8000, reload=True)
