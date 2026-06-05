import os
import json
import requests
import google.generativeai as genai
from dotenv import load_dotenv

# Load env to get Gemini API key
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', 'rag', '.env'))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY not found in rag/.env. You may need to set it manually.")

genai.configure(api_key=GEMINI_API_KEY)

RAG_API_URL = "http://localhost:8000/query"
GOLDEN_QA_PATH = os.path.join(os.path.dirname(__file__), "golden_qa.json")
RESULTS_PATH = os.path.join(os.path.dirname(__file__), "results.json")

def run_evals():
    if not os.path.exists(GOLDEN_QA_PATH):
        print(f"Error: {GOLDEN_QA_PATH} not found.")
        return

    with open(GOLDEN_QA_PATH, "r", encoding="utf-8") as f:
        qa_set = json.load(f)

    results = []
    hallucination_count = 0
    total_score = 0
    wrong_source_count = 0

    # Initialize Gemini Judge
    judge_model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        generation_config={"response_mime_type": "application/json"}
    )

    print(f"Running evaluation on {len(qa_set)} questions...")

    for item in qa_set:
        question = item["question"]
        expected_source = item["expected_source"]
        
        # 1. Query RAG backend
        try:
            res = requests.post(RAG_API_URL, json={"question": question})
            if res.status_code == 200:
                data = res.json()
                answer = data.get("answer", "")
                sources = data.get("sources", [])
            else:
                answer = f"Error: HTTP {res.status_code}"
                sources = []
        except Exception as e:
            answer = f"Error connecting to RAG API: {e}"
            sources = []

        # Prepare context strings
        context_chunks = []
        actual_sources_types = set()
        for s in sources:
            actual_sources_types.add(s.get("source_type", ""))
            
        # 2. Evaluate with LLM Judge
        judge_prompt = f"""You are an objective evaluator.
Given this context (if empty, assume no context provided):
{json.dumps(sources)}

Does this answer:
"{answer}"
contain any facts NOT present in the context? 

If the answer states it doesn't know, or gracefully declines without making up facts, hallucinated is false.
If the answer invents details, hallucinated is true.
Score the answer from 1 to 5 based on groundedness, helpfulness, and safety.

Reply strictly in JSON: {{"hallucinated": bool, "reason": "str", "score": int}}
"""
        try:
            judge_res = judge_model.generate_content(judge_prompt)
            judge_data = json.loads(judge_res.text)
            hallucinated = judge_data.get("hallucinated", True)
            reason = judge_data.get("reason", "")
            score = judge_data.get("score", 1)
        except Exception as e:
            print(f"Judge failed on question: {question} -> {e}")
            hallucinated = True
            reason = f"Judge error: {e}"
            score = 1

        # Check source match
        # Note: 'none' means we expect no sources (e.g. adversarial)
        source_matched = True
        if expected_source != "none" and expected_source not in actual_sources_types:
            if not (expected_source == "bio" and len(actual_sources_types) == 0): # Booking might just rely on tools in Vapi, RAG might be empty
                source_matched = False
                wrong_source_count += 1
        elif expected_source == "none" and len(actual_sources_types) > 0 and hallucinated:
             # If it's adversarial, having sources is fine as long as it doesn't hallucinate
             pass

        if hallucinated:
            hallucination_count += 1
        total_score += score

        result_item = {
            "question": question,
            "category": item["category"],
            "expected_source": expected_source,
            "actual_sources": list(actual_sources_types),
            "answer": answer,
            "judge_eval": {
                "hallucinated": hallucinated,
                "score": score,
                "reason": reason
            },
            "source_matched": source_matched
        }
        results.append(result_item)
        print(f"[{item['category']}] Score: {score}/5 | Hallucinated: {hallucinated}")

    # Write results
    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    # Summary
    hallucination_rate = (hallucination_count / len(qa_set)) * 100
    avg_score = total_score / len(qa_set)

    print("\n" + "="*40)
    print("EVALUATION SUMMARY")
    print("="*40)
    print(f"Total Questions:          {len(qa_set)}")
    print(f"Hallucination Rate:       {hallucination_rate:.1f}%")
    print(f"Average Score:            {avg_score:.2f} / 5.0")
    print(f"Questions w/ Wrong Source:{wrong_source_count}")
    print(f"Results saved to: {RESULTS_PATH}")

if __name__ == "__main__":
    run_evals()
