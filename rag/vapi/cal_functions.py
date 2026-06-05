import os
import requests
import json
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

CAL_API_KEY = os.getenv("CAL_API_KEY")
# Provide your Cal.com EVENT_TYPE_ID here
EVENT_TYPE_ID = os.getenv("CAL_EVENT_TYPE_ID", "default_event_id")

def get_availability() -> str:
    """
    Calls the Cal.com API to get available slots for the next 5 days.
    """
    if not CAL_API_KEY:
        return "Error: CAL_API_KEY is not configured."

    now = datetime.now(timezone.utc)
    date_from = now.isoformat()
    date_to = (now + timedelta(days=5)).isoformat()

    url = "https://api.cal.com/v1/slots"
    params = {
        "apiKey": CAL_API_KEY,
        "startTime": date_from,
        "endTime": date_to,
        "eventTypeId": EVENT_TYPE_ID
    }

    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        slots_data = data.get("slots", {})
        
        available_slots = []
        for date_str, times in slots_data.items():
            for t in times:
                if isinstance(t, dict) and "time" in t:
                    available_slots.append(t["time"])
                elif isinstance(t, str):
                    available_slots.append(t)
                    
        if not available_slots:
            return "No available slots found."
            
        return "Available slots: " + ", ".join(available_slots[:10])
    else:
        return f"Failed to fetch availability: {response.text}"

def book_meeting(name: str, email: str, slot_iso: str) -> str:
    """
    Calls the Cal.com API to book a meeting.
    """
    if not CAL_API_KEY:
        return "Error: CAL_API_KEY is not configured."

    url = "https://api.cal.com/v1/bookings"
    params = {
        "apiKey": CAL_API_KEY
    }
    
    payload = {
        "eventTypeId": int(EVENT_TYPE_ID) if EVENT_TYPE_ID.isdigit() else EVENT_TYPE_ID,
        "start": slot_iso,
        "responses": {
            "name": name,
            "email": email,
            "location": "Vapi Phone Call"
        },
        "timeZone": "UTC"
    }

    response = requests.post(url, params=params, json=payload)
    
    if response.status_code in [200, 201]:
        return f"Successfully booked meeting for {name} at {slot_iso}."
    else:
        return f"Failed to book meeting: {response.text}"
