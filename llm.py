import os
from groq import Groq
from dotenv import load_dotenv
load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

response = client.chat.completions.create(
    model="groq/compound",
    messages=[
        {"role": "user", "content": "Explain why a tea shop near a bus stand is profitable."}
    ],
)

print(response.choices[0].message.content)
