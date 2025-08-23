import os
from groq import Groq

# Set your Groq API Key here (or use an environment variable)
GROQ_API_KEY = os.getenv("GROQ_API_KEY") or ""

client = Groq(api_key=GROQ_API_KEY)

# Initialize chat history, can add a system prompt if you like
messages = [
    {"role": "system", "content": "You are a helpful assistant."}
]

print("Groq Chatbot is ready! Type 'exit' to quit.\n")

while True:
    user_input = input("You: ").strip()
    if user_input.lower() in {"exit", "quit"}:
        print("Goodbye!")
        break

    messages.append({"role": "user", "content": user_input})

    response = client.chat.completions.create(
        messages=messages,
        model="llama-3.3-70b-versatile"
    )
    bot_reply = response.choices[0].message.content
    print(f"Groq: {bot_reply}\n")

    messages.append({"role": "assistant", "content": bot_reply})
