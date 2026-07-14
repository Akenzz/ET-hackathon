import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

client = None
if GROQ_API_KEY:
    client = Groq(api_key=GROQ_API_KEY)



MODEL = "llama-3.3-70b-versatile"


def ask_groq(prompt: str):
    global client
    if not client:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "GROQ_API_KEY is not set. Please set it in your environment or .env file."
            )
        client = Groq(api_key=api_key)

    response = client.chat.completions.create(


        model=MODEL,

        temperature=0.2,

        messages=[

            {
                "role": "system",
                "content":
                """
You are the CPCB Citizen Health Advisory AI.

Generate only valid JSON.

Do NOT use markdown.

Do NOT explain yourself.

Return concise advisories.

Output format:

{
  "english": {
      "headline":"",
      "general_public":"",
      "schools":"",
      "elderly":"",
      "outdoor_workers":""
  },

  "hindi": {
      ...
  },

  "kannada": {
      ...
  }

}
                """
            },

            {
                "role": "user",
                "content": prompt
            }

        ]

    )

    return response.choices[0].message.content