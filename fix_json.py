import json

with open("rag/vapi/vapi_agent_config.json", "r") as f:
    data = json.load(f)

if "voice" in data:
    del data["voice"]

with open("rag/vapi/vapi_agent_config.json", "w") as f:
    json.dump(data, f, indent=2)
