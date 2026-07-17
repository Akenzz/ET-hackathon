import json
import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

MODEL = "llama-3.3-70b-versatile"

_client = None


def get_client() -> Groq:
    """
    Lazy-initializes and returns the Groq client.
    """
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY is not set. Please set it in your environment or a .env file."
            )
        _client = Groq(api_key=api_key)
    return _client


def ask_groq(prompt: str):
    """
    Sends prompt to Groq and returns parsed JSON.
    """

    client = get_client()

    response = client.chat.completions.create(

        model=MODEL,

        temperature=0.2,

        messages=[

            {
                "role": "system",

                "content": """
You are the CPCB Citizen Health Advisory AI.

Always return ONLY valid JSON.

Never use markdown.

Never explain your reasoning.

Never surround JSON using ```.

Return exactly the schema requested by the user.
"""
            },

            {
                "role": "user",

                "content": prompt
            }

        ]

    )

    content = response.choices[0].message.content.strip()

    # Remove accidental markdown if returned
    content = content.replace("```json", "")
    content = content.replace("```", "")
    content = content.strip()

    try:
        return json.loads(content)

    except Exception as e:

        raise Exception(
            f"Groq returned invalid JSON:\n\n{content}"
        ) from e