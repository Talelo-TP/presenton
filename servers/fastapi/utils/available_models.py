import asyncio
import os


async def list_available_openai_compatible_models(url: str, api_key: str) -> list[str]:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key, base_url=url)
    models = (await client.models.list()).data
    if models:
        return list(map(lambda x: x.id, models))
    return []


async def list_available_anthropic_models(api_key: str) -> list[str]:
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=api_key)
    return list(map(lambda x: x.id, (await client.models.list(limit=50)).data))


async def list_available_google_models(api_key: str) -> list[str]:
    from google import genai

    client = genai.Client(api_key=api_key)
    timeout_s = float(os.getenv("GOOGLE_MODEL_LIST_TIMEOUT_S") or "10")

    def _list_models_sync() -> list[str]:
        return list(map(lambda x: x.name, client.models.list(config={"page_size": 50})))

    return await asyncio.wait_for(asyncio.to_thread(_list_models_sync), timeout=timeout_s)
