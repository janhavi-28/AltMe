import google.generativeai as genai
from typing import Dict, Any

from config import supabase

def query_rag(question: str) -> Dict[str, Any]:
    """
    Embeds the question, searches Supabase for top 5 chunks, 
    and generates an answer citing the sources.
    """
    if not supabase:
        return {"error": "Supabase client not configured", "answer": "", "sources": []}

    # 1. Embed the question
    try:
        response = genai.embed_content(
            model="models/gemini-embedding-2",
            content=question,
            task_type="retrieval_query",
            output_dimensionality=768
        )
        query_embedding = response['embedding']
    except Exception as e:
        return {"error": f"Failed to embed question: {e}", "answer": "", "sources": []}

    # 2. Retrieve top 5 matching chunks from Supabase
    try:
        # Call the match_documents RPC function created via schema.sql
        result = supabase.rpc(
            "match_documents",
            {
                "query_embedding": query_embedding,
                "match_threshold": 0.0, # Adjust as needed
                "match_count": 5
            }
        ).execute()
        
        retrieved_chunks = result.data
    except Exception as e:
        return {"error": f"Failed to retrieve from Supabase: {e}", "answer": "", "sources": []}

    if not retrieved_chunks:
        return {
            "answer": "No relevant information found in the knowledge base.",
            "sources": []
        }

    # 3. Format context and prompt for Gemini
    context_parts = []
    sources = []
    
    for i, chunk in enumerate(retrieved_chunks):
        content = chunk.get('content', '')
        metadata = chunk.get('metadata', {})
        source_type = metadata.get('source', 'unknown')
        
        # Build a readable source identifier
        if source_type == 'github':
            source_id = f"GitHub Repo: {metadata.get('repo_name')}"
        elif source_type == 'resume':
            source_id = "Resume"
        elif source_type == 'bio':
            source_id = "Bio"
        else:
            source_id = "Unknown"
            
        context_parts.append(f"[Source {i+1} - {source_id}]:\n{content}\n")
        sources.append({
            "id": i+1,
            "source_type": source_type,
            "repo_name": metadata.get('repo_name'),
            "similarity": chunk.get('similarity')
        })

    context_str = "\n".join(context_parts)
    
    prompt = f"""You are a helpful assistant answering questions based on the provided context.
Answer the user's question using ONLY the provided context.
If the answer is not contained in the context, say "I don't have enough information to answer that."
When you state a fact, you MUST cite the source using the source number in brackets, e.g., [Source 1].

CONTEXT:
{context_str}

QUESTION:
{question}

ANSWER:
"""

    # 4. Generate answer using Gemini 2.0 Flash
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        answer = response.text
    except Exception as e:
        return {"error": f"Failed to generate answer: {e}", "answer": "", "sources": sources}

    return {
        "answer": answer,
        "sources": sources
    }
