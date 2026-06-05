import os
import fitz  # PyMuPDF
import yaml
import requests
import tiktoken
import base64
import google.generativeai as genai
from typing import List, Dict, Any

from .config import supabase, GITHUB_USERNAME, RESUME_PDF_PATH, BIO_YAML_PATH

# Initialize tokenizer for chunking
tokenizer = tiktoken.get_encoding("cl100k_base")

def chunk_text(text: str, max_tokens: int = 512, overlap_pct: float = 0.1) -> List[str]:
    """
    Chunks text into segments of `max_tokens` with `overlap_pct` overlap.
    """
    if not text:
        return []
    
    tokens = tokenizer.encode(text)
    overlap_tokens = int(max_tokens * overlap_pct)
    step = max_tokens - overlap_tokens
    
    chunks = []
    for i in range(0, len(tokens), step):
        chunk_tokens = tokens[i:i + max_tokens]
        chunk_text = tokenizer.decode(chunk_tokens)
        chunks.append(chunk_text)
        
    return chunks

def load_resume(pdf_path: str) -> List[Dict[str, Any]]:
    """
    Parses a resume PDF and chunks it.
    """
    if not os.path.exists(pdf_path):
        print(f"Resume PDF not found at {pdf_path}")
        return []

    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n"

    chunks = chunk_text(text, max_tokens=512, overlap_pct=0.1)
    
    docs = []
    for i, chunk in enumerate(chunks):
        docs.append({
            "text": chunk,
            "metadata": {
                "source": "resume",
                "chunk_index": i
            }
        })
    return docs

def load_github_readmes(username: str) -> List[Dict[str, Any]]:
    """
    Fetches README.md from all public repos of the given username.
    """
    if not username:
        return []

    docs = []
    url = f"https://api.github.com/users/{username}/repos"
    # No auth needed for public repos, but rate limited to 60 req/hr
    response = requests.get(url)
    
    if response.status_code != 200:
        print(f"Failed to fetch repos for {username}: {response.text}")
        return docs
        
    repos = response.json()
    
    for repo in repos:
        repo_name = repo['name']
        readme_url = f"https://api.github.com/repos/{username}/{repo_name}/readme"
        
        # Request raw content directly
        headers = {"Accept": "application/vnd.github.v3.raw"}
        readme_response = requests.get(readme_url, headers=headers)
        
        if readme_response.status_code == 200:
            text = readme_response.text
            chunks = chunk_text(text, max_tokens=512, overlap_pct=0.1)
            for i, chunk in enumerate(chunks):
                docs.append({
                    "text": chunk,
                    "metadata": {
                        "source": "github",
                        "repo_name": repo_name,
                        "chunk_index": i
                    }
                })
        else:
            print(f"No README found or error fetching for {repo_name}")
            
    return docs

def load_bio(yaml_path: str) -> List[Dict[str, Any]]:
    """
    Loads handwritten bio.yaml.
    """
    if not os.path.exists(yaml_path):
        print(f"Bio YAML not found at {yaml_path}")
        return []

    with open(yaml_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
        
    if not data:
        return []
        
    # Convert yaml dict to a readable string format
    text_parts = []
    for key in ['name', 'role', 'skills', 'projects', 'fit_for_role']:
        if key in data:
            val = data[key]
            if isinstance(val, list):
                val_str = ", ".join(map(str, val))
            else:
                val_str = str(val)
            text_parts.append(f"{key.replace('_', ' ').title()}: {val_str}")
            
    full_text = "\n".join(text_parts)
    
    chunks = chunk_text(full_text, max_tokens=512, overlap_pct=0.1)
    docs = []
    for i, chunk in enumerate(chunks):
        docs.append({
            "text": chunk,
            "metadata": {
                "source": "bio",
                "chunk_index": i
            }
        })
    return docs

def embed_and_store(docs: List[Dict[str, Any]]):
    """
    Embeds chunks using Gemini text-embedding-004 and stores them in Supabase.
    """
    if not docs:
        print("No documents to store.")
        return

    print(f"Embedding {len(docs)} chunks...")
    
    # We can batch embed if needed, but doing sequentially for simplicity and to avoid hitting limits
    # The generativeai SDK supports batching by passing a list of texts
    texts = [doc["text"] for doc in docs]
    
    # Use text-embedding-004
    try:
        response = genai.embed_content(
            model="models/text-embedding-004",
            content=texts,
            task_type="retrieval_document"
        )
        embeddings = response['embedding']
        
        # Prepare data for Supabase
        records = []
        for i, doc in enumerate(docs):
            records.append({
                "content": doc["text"],
                "metadata": doc["metadata"],
                "embedding": embeddings[i]
            })
            
        # Store in Supabase
        if supabase:
            # We first delete existing data to prevent duplicates on re-ingestion
            # A more robust solution would use unique constraints or versioning
            supabase.table("documents").delete().neq("id", 0).execute()
            
            # Insert new records (can be batched if records list is very large)
            batch_size = 100
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                supabase.table("documents").insert(batch).execute()
            print("Successfully stored documents in Supabase.")
        else:
            print("Supabase client not configured. Skipping storage.")
            
    except Exception as e:
        print(f"Error during embedding or storage: {e}")

def run_ingest_pipeline():
    """
    Runs the full ingestion pipeline.
    """
    print("Starting ingestion pipeline...")
    all_docs = []
    
    # 1. Parse Resume
    resume_docs = load_resume(RESUME_PDF_PATH)
    all_docs.extend(resume_docs)
    
    # 2. Fetch GitHub READMEs
    github_docs = load_github_readmes(GITHUB_USERNAME)
    all_docs.extend(github_docs)
    
    # 3. Load Bio
    bio_docs = load_bio(BIO_YAML_PATH)
    all_docs.extend(bio_docs)
    
    # 4. Embed and Store
    embed_and_store(all_docs)
    print("Ingestion pipeline completed.")
