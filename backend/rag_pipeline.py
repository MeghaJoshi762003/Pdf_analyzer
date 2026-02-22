import io
import os
from typing import List, Dict, Any, Optional

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from PyPDF2 import PdfReader
from dotenv import load_dotenv
from groq import Groq

load_dotenv()


class RAGPipeline:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in .env file!")

        self.client = Groq(api_key=api_key)

        print("Loading embedding model (first run downloads ~90MB)...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True}
        )
        print("Ready!")

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " "]
        )

        self.vectorstore: Optional[FAISS] = None
        self.uploaded_files: List[str] = []
        self.chat_history: List[Dict] = []

    def process_pdf(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        pdf_reader = PdfReader(io.BytesIO(file_bytes))
        raw_text = ""
        for page_num, page in enumerate(pdf_reader.pages):
            text = page.extract_text()
            if text:
                raw_text += f"\n[Page {page_num + 1}]\n{text}"

        if not raw_text.strip():
            raise ValueError("Could not extract text. PDF might be scanned/image-based.")

        chunks = self.text_splitter.create_documents(
            texts=[raw_text],
            metadatas=[{"source": filename, "total_pages": len(pdf_reader.pages)}]
        )

        if self.vectorstore is None:
            self.vectorstore = FAISS.from_documents(chunks, self.embeddings)
        else:
            new_store = FAISS.from_documents(chunks, self.embeddings)
            self.vectorstore.merge_from(new_store)

        self.uploaded_files.append(filename)
        return {"filename": filename, "chunks": len(chunks), "pages": len(pdf_reader.pages)}

    def query(self, question: str) -> Dict[str, Any]:
        if not self.is_ready():
            raise ValueError("No documents loaded. Please upload a PDF first.")

        retriever = self.vectorstore.as_retriever(search_kwargs={"k": 4})
        source_docs = retriever.invoke(question)
        context = "\n\n".join([doc.page_content for doc in source_docs])

        history_text = ""
        for exchange in self.chat_history[-5:]:
            history_text += f"Human: {exchange['question']}\nAssistant: {exchange['answer']}\n"

        messages = [
            {
                "role": "system",
                "content": "You are a helpful assistant that answers questions based strictly on the provided document context. If the answer is not in the context, say 'I couldn't find that information in the uploaded document.'"
            },
            {
                "role": "user",
                "content": f"""Context from document:
{context}

Chat History:
{history_text}

Question: {question}"""
            }
        ]

        response = self.client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Free, fast, no quota issues
            messages=messages,
            temperature=0,
            max_tokens=1024
        )
        answer = response.choices[0].message.content
        self.chat_history.append({"question": question, "answer": answer})

        sources = []
        seen = set()
        for doc in source_docs:
            preview = doc.page_content[:200] + "..."
            if preview not in seen:
                seen.add(preview)
                sources.append({
                    "content": preview,
                    "source": doc.metadata.get("source", "Unknown"),
                    "page": str(doc.metadata.get("page", "N/A"))
                })

        return {"answer": answer, "sources": sources}

    def is_ready(self) -> bool:
        return self.vectorstore is not None

    def get_documents(self) -> List[str]:
        return self.uploaded_files

    def reset(self):
        self.vectorstore = None
        self.uploaded_files = []
        self.chat_history = []