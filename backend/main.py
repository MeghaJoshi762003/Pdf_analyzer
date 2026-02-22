from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

import uvicorn
from rag_pipeline import RAGPipeline

app = FastAPI(title="DocMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag = RAGPipeline()


class QueryRequest(BaseModel):
    question: str

class SourceChunk(BaseModel):
    content: str
    source: str
    page: str

class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]


@app.get("/")
def root():
    return {"message": "DocMind API is live!", "status": "ok"}

@app.get("/health")
def health():
    return {
        "status": "ok",
        "documents_loaded": rag.get_documents(),
        "ready": rag.is_ready()
    }

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")
    try:
        result = rag.process_pdf(contents, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
    return {
        "message": f"'{file.filename}' processed successfully!",
        "chunks_created": result["chunks"],
        "pages": result["pages"],
        "filename": file.filename
    }

@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    if not rag.is_ready():
        raise HTTPException(status_code=400, detail="No documents uploaded yet.")
    try:
        result = rag.query(request.question)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
    return QueryResponse(
        answer=result["answer"],
        sources=[SourceChunk(**s) for s in result["sources"]]
    )

@app.get("/documents")
def list_documents():
    return {"documents": rag.get_documents(), "count": len(rag.get_documents())}

@app.delete("/reset")
def reset():
    rag.reset()
    return {"message": "All documents and chat history cleared."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
