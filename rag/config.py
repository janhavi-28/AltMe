import os
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GITHUB_USERNAME = os.getenv("GITHUB_USERNAME")
RESUME_PDF_PATH = os.getenv("RESUME_PDF_PATH", "data/resume.pdf")
BIO_YAML_PATH = os.getenv("BIO_YAML_PATH", "data/bio.yaml")

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Initialize Supabase client
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
