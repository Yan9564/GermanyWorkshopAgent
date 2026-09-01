from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from openai import AsyncAzureOpenAI
from pydantic import BaseModel

from config import settings

router = APIRouter()

_az_client = AsyncAzureOpenAI(
    api_key=settings.AZURE_OPENAI_API_KEY,
    azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
    api_version=settings.AZURE_OPENAI_API_VERSION,
)

_MAX_TEXT_CHARS = 4096
_MAX_AUDIO_BYTES = 25 * 1024 * 1024


class TTSRequest(BaseModel):
    text: str
    voice: str | None = None


@router.post("/voice/tts")
async def text_to_speech(body: TTSRequest):
    if len(body.text) > _MAX_TEXT_CHARS:
        raise HTTPException(status_code=400, detail=f"Text exceeds {_MAX_TEXT_CHARS} character limit")

    voice = body.voice or settings.AZURE_OPENAI_TTS_VOICE
    response = await _az_client.audio.speech.create(
        model=settings.AZURE_OPENAI_TTS_DEPLOYMENT,
        voice=voice,
        input=body.text,
    )
    return StreamingResponse(response.iter_bytes(), media_type="audio/mpeg")


@router.post("/voice/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    data = await audio.read()
    if len(data) > _MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file exceeds 25 MB limit")

    transcript = await _az_client.audio.transcriptions.create(
        model=settings.AZURE_OPENAI_WHISPER_DEPLOYMENT,
        file=(audio.filename or "audio.webm", data, audio.content_type or "audio/webm"),
    )
    return {"transcript": transcript.text}
