import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GROQ_API_KEY')
if not api_key:
    print("No API key")
    exit(1)

client = Groq(api_key=api_key)
try:
    response = client.chat.completions.create(
        model="groq/compound",
        messages=[{"role": "user", "content": "Hello"}],
        max_tokens=10
    )
    print("Success")
except Exception as e:
    print("Error:", type(e).__name__, str(e))
