import os
from dotenv import load_dotenv
from groq import Groq

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

load_dotenv()

DB_PATH = "vectordb"

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

vectorstore = FAISS.load_local(DB_PATH, embeddings, allow_dangerous_deserialization=True)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def ask_bizmind(question, k=4):
    docs = vectorstore.similarity_search(question, k=k)
    context = "\n\n".join([d.page_content for d in docs])

    prompt = f"""
You are BizMind, an AI advisor for Indian MSME businesses.

Context:
{context}

Question:
{question}

Answer:
"""

    response = client.chat.completions.create(
        model="groq/compound",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return response.choices[0].message.content


if __name__ == "__main__":
    print("\n📊 BizMind RAG Assistant Ready (type 'exit' to quit)\n")

    while True:
        q = input("Ask: ")
        if q.lower() == "exit":
            break

        print("\n🤖", ask_bizmind(q), "\n")
