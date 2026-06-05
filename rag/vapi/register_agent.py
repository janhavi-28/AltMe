import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

VAPI_PRIVATE_KEY = os.getenv("VAPI_PRIVATE_KEY")
if not VAPI_PRIVATE_KEY:
    print("Error: VAPI_PRIVATE_KEY not found in environment. Please add it to your .env file.")
    exit(1)

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "vapi_agent_config.json")

def register_assistant():
    """
    Registers the Vapi Assistant using the REST API.
    """
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    url = "https://api.vapi.ai/assistant"
    headers = {
        "Authorization": f"Bearer {VAPI_PRIVATE_KEY}",
        "Content-Type": "application/json"
    }

    print("Registering Vapi assistant...")
    response = requests.post(url, headers=headers, json=config)

    if response.status_code in [200, 201]:
        data = response.json()
        assistant_id = data.get("id")
        print(f"Success! Assistant registered.")
        print(f"Assistant ID: {assistant_id}")
        print("\nNote: To interact via phone, you must assign a phone number to this Assistant ID in the Vapi dashboard or via the /phone-number endpoint.")
    else:
        print(f"Failed to register assistant: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    register_assistant()
