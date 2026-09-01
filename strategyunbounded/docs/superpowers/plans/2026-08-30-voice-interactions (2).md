# Voice Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Azure OpenAI TTS (Benjamin speaks) and Whisper STT (users record audio) throughout the workshop, with transcripts persisted to a per-session discussion log.

**Architecture:** Two new backend endpoints (`/api/voice/tts`, `/api/voice/stt`) proxy through to Azure OpenAI so credentials stay server-side. A third pair of endpoints appends/reads transcribed discussion entries for a session. The frontend adds a speaker button to `GuideTooltip` that auto-plays the avatar's message, a reusable `VoiceRecordButton` component that records via `MediaRecorder` and sends the blob to STT, and a mute toggle in the header.

**Tech Stack:** FastAPI, asyncpg, openai Python SDK (already installed), Next.js 15 app router, Zustand, TypeScript, browser `MediaRecorder` API.

**Spec:** `docs/superpowers/specs/2026-08-30-voice-and-stage2-design.md` — Feature 1 section.

## Global Constraints

- Python 3.12; FastAPI; asyncpg for all DB calls; no new Python packages needed (`openai` already installed, `python-multipart` already installed).
- All new DB tables use `TEXT PRIMARY KEY`; IDs generated as `str(uuid.uuid4())` in Python (matches existing schema convention).
- New env vars: `AZURE_OPENAI_TTS_DEPLOYMENT` (default `tts-1`), `AZURE_OPENAI_WHISPER_DEPLOYMENT` (default `whisper-1`), `AZURE_OPENAI_TTS_VOICE` (default `onyx`).
- All monetary values in euros; all backend error messages in English.
- Frontend: TypeScript strict mode; `'use client'` on all interactive components; Tailwind CSS only (no inline styles except layout values).
- Max TTS text length: 4096 chars. Max STT file size: 25 MB.
- Mute preference persisted in `localStorage` under key `su_voice_muted`.

---

## File Map

**New files:**
- `backend/routers/voice.py` — TTS + STT endpoints
- `backend/routers/discussion.py` — POST/GET discussion entries
- `backend/tests/test_voice.py` — pytest tests for voice router
- `backend/tests/test_discussion.py` — pytest tests for discussion router
- `frontend/components/VoiceRecordButton.tsx` — reusable record + transcribe button
- `frontend/components/MuteToggle.tsx` — header mute icon

**Modified files:**
- `backend/config.py` — add three new settings fields
- `backend/main.py` — register voice and discussion routers
- `backend/migrations/001_initial.sql` — add `discussion_entries` table + `also_addresses` column on `use_cases`
- `frontend/lib/api.ts` — add `textToSpeech()`, `speechToText()`, `postDiscussionEntry()`, `getDiscussionEntries()`
- `frontend/lib/store.ts` — add `voiceMuted` state
- `frontend/lib/types.ts` — add `DiscussionEntry` type
- `frontend/components/GuideTooltip.tsx` — add TTS speaker button + auto-play on stage change
- `frontend/components/Header.tsx` — add `MuteToggle`
- `frontend/app/activity/results/page.tsx` — add "Start Group Discussion" button

---

### Task 1: Config + DB migration

**Files:**
- Modify: `backend/config.py`
- Modify: `backend/migrations/001_initial.sql`

**Interfaces:**
- Produces: `settings.AZURE_OPENAI_TTS_DEPLOYMENT: str`, `settings.AZURE_OPENAI_WHISPER_DEPLOYMENT: str`, `settings.AZURE_OPENAI_TTS_VOICE: str`
- Produces DB table: `discussion_entries(id TEXT PK, session_id TEXT FK, speaker_label TEXT, transcript TEXT, recorded_at TIMESTAMPTZ)`

- [ ] **Step 1: Add env vars to config**

In `backend/config.py`, add three fields inside `class Settings`:

```python
AZURE_OPENAI_TTS_DEPLOYMENT: str = "tts-1"
AZURE_OPENAI_WHISPER_DEPLOYMENT: str = "whisper-1"
AZURE_OPENAI_TTS_VOICE: str = "onyx"
```

Full updated file (`backend/config.py`):
```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    AZURE_OPENAI_API_KEY: str
    AZURE_OPENAI_ENDPOINT: str
    AZURE_OPENAI_API_VERSION: str = "2024-10-01-preview"
    AZURE_OPENAI_CHAT_DEPLOYMENT: str = "gpt-4o-mini"
    AZURE_OPENAI_TTS_DEPLOYMENT: str = "tts-1"
    AZURE_OPENAI_WHISPER_DEPLOYMENT: str = "whisper-1"
    AZURE_OPENAI_TTS_VOICE: str = "onyx"

    DATABASE_URL: str

    ADMIN_PIN: str
    SESSION_SECRET: str

    DEFAULT_SYSTEM_PROMPT: str = (
        "You are Benjamin, an expert AI strategy consultant facilitating a business innovation "
        "workshop. Your role is to help organisations discover practical, commercially viable AI "
        "use cases that address their real operational challenges. Prioritise ideas that are "
        "implementable within 12 months by a mid-sized organisation. Be specific to the industry "
        "and problem context described. All monetary estimates must use euros (€)."
    )

    ALLOWED_ORIGINS: str = "http://localhost:3000"


settings = Settings()
```

- [ ] **Step 2: Add migration SQL for discussion_entries and also_addresses**

Append to the end of `backend/migrations/001_initial.sql`:

```sql
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS also_addresses INTEGER[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS discussion_entries (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  speaker_label TEXT,
  transcript    TEXT NOT NULL,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discussion_entries_session
  ON discussion_entries(session_id, recorded_at);
```

- [ ] **Step 3: Restart backend and verify migration runs without error**

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Expected: `Migration OK: 001_initial.sql` in logs, no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/config.py backend/migrations/001_initial.sql
git commit -m "feat(voice): add TTS/Whisper config and discussion_entries migration"
```

---

### Task 2: Voice router (TTS + STT)

**Files:**
- Create: `backend/routers/voice.py`
- Create: `backend/tests/test_voice.py`
- Modify: `backend/main.py`

**Interfaces:**
- Consumes: `settings.AZURE_OPENAI_TTS_DEPLOYMENT`, `settings.AZURE_OPENAI_WHISPER_DEPLOYMENT`, `settings.AZURE_OPENAI_TTS_VOICE` (from Task 1)
- Produces: `POST /api/voice/tts` → `audio/mpeg` stream; `POST /api/voice/stt` → `{"transcript": str}`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_voice.py`:

```python
import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.voice import router


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router, prefix="/api")
    return TestClient(app)


def test_tts_returns_audio(client):
    mock_response = MagicMock()
    mock_response.iter_bytes = MagicMock(return_value=iter([b"fake_audio_data"]))

    with patch("routers.voice._az_client") as mock_client:
        mock_client.audio.speech.create = AsyncMock(return_value=mock_response)
        res = client.post("/api/voice/tts", json={"text": "Hello Benjamin"})

    assert res.status_code == 200
    assert res.headers["content-type"] == "audio/mpeg"
    assert res.content == b"fake_audio_data"


def test_tts_rejects_long_text(client):
    res = client.post("/api/voice/tts", json={"text": "x" * 4097})
    assert res.status_code == 400


def test_stt_returns_transcript(client):
    mock_transcript = MagicMock()
    mock_transcript.text = "We should prioritise the inventory use case."

    with patch("routers.voice._az_client") as mock_client:
        mock_client.audio.transcriptions.create = AsyncMock(return_value=mock_transcript)
        audio_bytes = io.BytesIO(b"fake_webm_data")
        res = client.post(
            "/api/voice/stt",
            files={"audio": ("recording.webm", audio_bytes, "audio/webm")},
        )

    assert res.status_code == 200
    assert res.json() == {"transcript": "We should prioritise the inventory use case."}


def test_stt_rejects_oversized_file(client):
    large_audio = io.BytesIO(b"x" * (25 * 1024 * 1024 + 1))
    res = client.post(
        "/api/voice/stt",
        files={"audio": ("big.webm", large_audio, "audio/webm")},
    )
    assert res.status_code == 413
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
python -m pytest tests/test_voice.py -v
```

Expected: `ModuleNotFoundError` or `ImportError` — `routers.voice` does not exist yet.

- [ ] **Step 3: Create the voice router**

Create `backend/routers/voice.py`:

```python
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
_MAX_AUDIO_BYTES = 25 * 1024 * 1024  # 25 MB


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
```

- [ ] **Step 4: Register voice router in main.py**

In `backend/main.py`:
- Add `voice` to the import line: `from routers import auth, system_prompt, sessions, brainstorm, use_cases, export, avatar, voice`
- Add after the `avatar` router registration: `app.include_router(voice.router, prefix="/api")`

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd backend
python -m pytest tests/test_voice.py -v
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/routers/voice.py backend/tests/test_voice.py backend/main.py
git commit -m "feat(voice): add TTS and STT endpoints via Azure OpenAI"
```

---

### Task 3: Discussion router

**Files:**
- Create: `backend/routers/discussion.py`
- Create: `backend/tests/test_discussion.py`
- Modify: `backend/main.py`

**Interfaces:**
- Consumes: `discussion_entries` table (Task 1), `get_db` from `database.py`
- Produces: `POST /api/sessions/{session_id}/discussion` → `{"id": str, "transcript": str, "speaker_label": str|None, "recorded_at": str}`; `GET /api/sessions/{session_id}/discussion` → `{"entries": [...]}`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_discussion.py`:

```python
import uuid
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.discussion import router


def _make_db(fetchrow_result=None, fetch_result=None):
    conn = AsyncMock()
    conn.fetchrow = AsyncMock(return_value=fetchrow_result)
    conn.fetch = AsyncMock(return_value=fetch_result or [])
    conn.execute = AsyncMock()
    return conn


@pytest.fixture
def client():
    app = FastAPI()

    async def override_db():
        yield _make_db(
            fetchrow_result={"id": "sess-1"},
            fetch_result=[
                {
                    "id": "entry-1",
                    "speaker_label": "Alice",
                    "transcript": "I think the inventory use case is best.",
                    "recorded_at": "2026-08-30T10:00:00Z",
                }
            ],
        )

    from database import get_db
    app.dependency_overrides[get_db] = override_db
    app.include_router(router, prefix="/api")
    return TestClient(app)


def test_post_discussion_entry(client):
    res = client.post(
        "/api/sessions/sess-1/discussion",
        json={"transcript": "We want inventory forecasting.", "speaker_label": "Bob"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["transcript"] == "We want inventory forecasting."


def test_post_discussion_entry_session_not_found():
    app = FastAPI()

    async def override_db_miss():
        db = _make_db(fetchrow_result=None)
        yield db

    from database import get_db
    app.dependency_overrides[get_db] = override_db_miss
    app.include_router(router, prefix="/api")
    c = TestClient(app)
    res = c.post(
        "/api/sessions/nonexistent/discussion",
        json={"transcript": "hello"},
    )
    assert res.status_code == 404


def test_get_discussion_entries(client):
    res = client.get("/api/sessions/sess-1/discussion")
    assert res.status_code == 200
    data = res.json()
    assert len(data["entries"]) == 1
    assert data["entries"][0]["speaker_label"] == "Alice"
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend
python -m pytest tests/test_discussion.py -v
```

Expected: `ImportError` — `routers.discussion` does not exist.

- [ ] **Step 3: Create the discussion router**

Create `backend/routers/discussion.py`:

```python
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_db

router = APIRouter()


class DiscussionEntryRequest(BaseModel):
    transcript: str
    speaker_label: Optional[str] = None


@router.post("/sessions/{session_id}/discussion")
async def post_discussion_entry(
    session_id: str,
    body: DiscussionEntryRequest,
    conn=Depends(get_db),
):
    session = await conn.fetchrow("SELECT id FROM sessions WHERE id = $1", session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    entry_id = str(uuid.uuid4())
    row = await conn.fetchrow(
        """
        INSERT INTO discussion_entries (id, session_id, speaker_label, transcript)
        VALUES ($1, $2, $3, $4)
        RETURNING id, speaker_label, transcript, recorded_at
        """,
        entry_id,
        session_id,
        body.speaker_label,
        body.transcript,
    )
    return {
        "id": row["id"],
        "transcript": row["transcript"],
        "speaker_label": row["speaker_label"],
        "recorded_at": row["recorded_at"].isoformat(),
    }


@router.get("/sessions/{session_id}/discussion")
async def get_discussion_entries(session_id: str, conn=Depends(get_db)):
    rows = await conn.fetch(
        """
        SELECT id, speaker_label, transcript, recorded_at
        FROM discussion_entries
        WHERE session_id = $1
        ORDER BY recorded_at ASC
        """,
        session_id,
    )
    return {
        "entries": [
            {
                "id": r["id"],
                "speaker_label": r["speaker_label"],
                "transcript": r["transcript"],
                "recorded_at": r["recorded_at"].isoformat(),
            }
            for r in rows
        ]
    }
```

- [ ] **Step 4: Register discussion router in main.py**

In `backend/main.py`:
- Update import: `from routers import auth, system_prompt, sessions, brainstorm, use_cases, export, avatar, voice, discussion`
- Add: `app.include_router(discussion.router, prefix="/api")`

- [ ] **Step 5: Run tests to confirm pass**

```bash
cd backend
python -m pytest tests/test_discussion.py -v
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/routers/discussion.py backend/tests/test_discussion.py backend/main.py
git commit -m "feat(voice): add discussion entry endpoints for group transcript log"
```

---

### Task 4: Frontend types, store, and API client

**Files:**
- Modify: `frontend/lib/types.ts`
- Modify: `frontend/lib/store.ts`
- Modify: `frontend/lib/api.ts`

**Interfaces:**
- Produces: `DiscussionEntry` type; `api.textToSpeech(text, voice?)`, `api.speechToText(blob)`, `api.postDiscussionEntry(sessionId, transcript, speakerLabel?)`, `api.getDiscussionEntries(sessionId)`
- Produces store fields: `voiceMuted: boolean`, `setVoiceMuted(v: boolean) => void`

- [ ] **Step 1: Add DiscussionEntry type to types.ts**

Append to `frontend/lib/types.ts`:

```typescript
export interface DiscussionEntry {
  id: string
  speakerLabel: string | null
  transcript: string
  recordedAt: string
}
```

- [ ] **Step 2: Add voiceMuted to store**

In `frontend/lib/store.ts`:

Add to the `WorkshopState` interface:
```typescript
voiceMuted: boolean
setVoiceMuted: (v: boolean) => void
```

Add to the `initial` object:
```typescript
voiceMuted: false,
```

Add to the `create` call (after `setRole`):
```typescript
setVoiceMuted: (voiceMuted) => set({ voiceMuted }),
```

Add `voiceMuted` to the `partialize` return object so it persists:
```typescript
partialize: (s) => ({
  sessionId: s.sessionId,
  problems: s.problems,
  problemIds: s.problemIds,
  useCases: s.useCases,
  step: s.step,
  voiceMuted: s.voiceMuted,
}),
```

- [ ] **Step 3: Add voice and discussion methods to api.ts**

Add these methods to the `api` object in `frontend/lib/api.ts`:

```typescript
textToSpeech: async (text: string, voice?: string): Promise<Blob> => {
  const res = await fetch(`${BASE}/api/voice/tts`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  })
  if (!res.ok) throw new Error('TTS failed')
  return res.blob()
},

speechToText: async (audioBlob: Blob): Promise<{ transcript: string }> => {
  const form = new FormData()
  form.append('audio', audioBlob, 'recording.webm')
  const res = await fetch(`${BASE}/api/voice/stt`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || res.statusText)
  }
  return res.json()
},

postDiscussionEntry: (sessionId: string, transcript: string, speakerLabel?: string) =>
  req<import('./types').DiscussionEntry>(`/api/sessions/${sessionId}/discussion`, {
    method: 'POST',
    body: JSON.stringify({ transcript, speaker_label: speakerLabel ?? null }),
  }),

getDiscussionEntries: (sessionId: string) =>
  req<{ entries: import('./types').DiscussionEntry[] }>(`/api/sessions/${sessionId}/discussion`),
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: zero type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/types.ts frontend/lib/store.ts frontend/lib/api.ts
git commit -m "feat(voice): add voice/discussion types, store state, and API methods"
```

---

### Task 5: VoiceRecordButton component

**Files:**
- Create: `frontend/components/VoiceRecordButton.tsx`

**Interfaces:**
- Consumes: `api.speechToText(blob)` (Task 4)
- Produces: `<VoiceRecordButton onTranscript={(text) => void} disabled?: boolean label?: string />`

- [ ] **Step 1: Create VoiceRecordButton.tsx**

Create `frontend/components/VoiceRecordButton.tsx`:

```tsx
'use client'
import { useRef, useState } from 'react'
import { api } from '@/lib/api'

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
  label?: string
}

export default function VoiceRecordButton({ onTranscript, disabled, label }: Props) {
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const MAX_SECONDS = 300

  async function startRecording() {
    setError('')
    setElapsed(0)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone access denied.')
      return
    }

    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
      setUploading(true)
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const result = await api.speechToText(blob)
        onTranscript(result.transcript)
      } catch {
        setError('Transcription failed. Please try again.')
      } finally {
        setUploading(false)
      }
    }
    recorder.start()
    mediaRecorderRef.current = recorder
    setRecording(true)

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= MAX_SECONDS) {
          mediaRecorderRef.current?.stop()
          setRecording(false)
          return MAX_SECONDS
        }
        return prev + 1
      })
    }, 1000)
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const isDisabled = disabled || uploading

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={isDisabled}
        className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all
          ${recording
            ? 'bg-red-500 border-red-600 animate-pulse'
            : 'bg-white border-violet-brand hover:bg-violet-50'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
        title={recording ? 'Stop recording' : (label ?? 'Record voice')}
      >
        {uploading ? (
          <span className="w-5 h-5 border-2 border-violet-brand border-t-transparent rounded-full animate-spin" />
        ) : recording ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
          </svg>
        )}
      </button>

      {recording && (
        <span className="text-xs font-mono text-red-500">
          {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
        </span>
      )}
      {uploading && <span className="text-xs text-text-muted">Transcribing…</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
      {!recording && !uploading && label && (
        <span className="text-xs text-text-muted">{label}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Manual verification**

Start backend (`uvicorn main:app --reload --host 0.0.0.0 --port 8000`) and frontend (`npm run dev`). Import `VoiceRecordButton` in any page temporarily and verify:
- Clicking starts recording (red pulsing button + timer).
- Clicking stop sends audio to backend, returns transcript shown as alert or console.log.
- Granting mic permission works; denying shows "Microphone access denied."

- [ ] **Step 4: Commit**

```bash
git add frontend/components/VoiceRecordButton.tsx
git commit -m "feat(voice): add VoiceRecordButton with MediaRecorder and Whisper STT"
```

---

### Task 6: MuteToggle component + Header integration

**Files:**
- Create: `frontend/components/MuteToggle.tsx`
- Modify: `frontend/components/Header.tsx`

**Interfaces:**
- Consumes: `useStore` `voiceMuted`, `setVoiceMuted` (Task 4)
- Produces: `<MuteToggle />` rendered inside `Header`

- [ ] **Step 1: Create MuteToggle.tsx**

Create `frontend/components/MuteToggle.tsx`:

```tsx
'use client'
import { useStore } from '@/lib/store'

export default function MuteToggle() {
  const { voiceMuted, setVoiceMuted } = useStore()

  return (
    <button
      onClick={() => setVoiceMuted(!voiceMuted)}
      title={voiceMuted ? 'Unmute Benjamin' : 'Mute Benjamin'}
      className="w-8 h-8 rounded-full border border-border-brand flex items-center justify-center text-text-muted hover:border-violet-brand hover:text-violet-brand transition"
    >
      {voiceMuted ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Add MuteToggle to Header.tsx**

In `frontend/components/Header.tsx`:

Add import at top: `import MuteToggle from '@/components/MuteToggle'`

Inside the `<div className="flex items-center gap-3">` (before the Admin link), add `<MuteToggle />`:

```tsx
<div className="flex items-center gap-3">
  {!isLanding && (
    <>
      <div className="hidden md:flex flex-col items-end gap-0.5">
        <span className="text-[0.58rem] font-mono font-semibold tracking-[0.16em] uppercase text-indigo-brand">
          Stage 1 · Search
        </span>
        <span className="text-[0.65rem] font-semibold text-text-muted">
          Step {step} of 4 — {STEP_NAMES[step] ?? ''}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-2 rounded-full border-2 transition-all duration-300 ${
              n < step
                ? 'bg-bright border-bright w-8 md:w-10'
                : n === step
                ? 'bg-violet-brand border-violet-brand w-8 md:w-10'
                : 'bg-tint border-border-brand w-7 md:w-9'
            }`}
          />
        ))}
      </div>
    </>
  )}
  <MuteToggle />
  <Link
    href="/admin"
    className="text-xs font-semibold text-text-muted hover:text-violet-brand transition ml-2 hidden md:block"
  >
    Admin
  </Link>
</div>
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Manual verify**

Run `npm run dev`. Visit any page. Confirm the mute icon appears in the header. Toggle it — icon switches between speaker-on and speaker-off. Refresh the page — preference is remembered (Zustand `persist`).

- [ ] **Step 5: Commit**

```bash
git add frontend/components/MuteToggle.tsx frontend/components/Header.tsx
git commit -m "feat(voice): add mute toggle to header with persisted preference"
```

---

### Task 7: GuideTooltip TTS integration

**Files:**
- Modify: `frontend/components/GuideTooltip.tsx`

**Interfaces:**
- Consumes: `api.textToSpeech(text)` (Task 4), `useStore` `voiceMuted` (Task 4)
- Produces: updated `GuideTooltip` that auto-plays TTS on stage change and has a speaker button

- [ ] **Step 1: Update GuideTooltip.tsx**

Replace the full contents of `frontend/components/GuideTooltip.tsx`:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import type { AvatarStage } from '@/lib/types'

interface Props {
  stage: AvatarStage
  context?: Record<string, unknown>
}

export default function GuideTooltip({ stage, context }: Props) {
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [clicked, setClicked] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const loaded = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { voiceMuted } = useStore()

  useEffect(() => {
    loaded.current = false
    setText('')
    setNextStep('')
    stopAudio()
  }, [stage])

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setSpeaking(false)
  }

  async function fetchGuidance(): Promise<{ message: string; nextStep: string }> {
    if (loaded.current && text) return { message: text, nextStep }
    loaded.current = true
    try {
      const res = await api.getAvatarGuidance(stage, context)
      setText(res.message)
      setNextStep(res.nextStep)
      return res
    } catch {
      const fallback = { message: "Keep going — you're doing great.", nextStep: 'Continue with the workshop.' }
      setText(fallback.message)
      setNextStep(fallback.nextStep)
      return fallback
    }
  }

  async function playTTS(messageText: string) {
    if (voiceMuted || speaking) return
    stopAudio()
    setSpeaking(true)
    try {
      const blob = await api.textToSpeech(messageText)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url) }
      audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url) }
      await audio.play()
    } catch {
      setSpeaking(false)
    }
  }

  async function toggle() {
    setVisible((v) => !v)
    setClicked(true)
    const guidance = await fetchGuidance()
    if (!voiceMuted) playTTS(guidance.message)
  }

  async function handleSpeakerClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (speaking) { stopAudio(); return }
    const guidance = await fetchGuidance()
    playTTS(guidance.message)
  }

  // Auto-play on stage entry
  useEffect(() => {
    if (voiceMuted) return
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      const guidance = await fetchGuidance()
      if (!cancelled) playTTS(guidance.message)
    }, 800)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [stage, voiceMuted])

  return (
    <>
      {visible && (
        <div className="fixed bottom-20 right-8 z-50 bg-white border-2 border-border-brand border-l-4 border-l-violet-brand rounded-2xl p-4 max-w-[260px] text-sm font-medium text-text-default leading-relaxed shadow-[0_8px_32px_rgba(109,40,217,0.15)] animate-fade-in-up">
          <p>{text || 'Loading…'}</p>
          {nextStep && <p className="mt-2 font-semibold text-violet-brand">{nextStep}</p>}
          {text && (
            <button
              onClick={handleSpeakerClick}
              title={speaking ? 'Stop' : 'Listen'}
              className="mt-2 text-violet-brand hover:text-indigo-brand transition"
            >
              {speaking ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              )}
            </button>
          )}
        </div>
      )}
      <button
        onClick={toggle}
        title="Need help?"
        className={`fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full bg-white border-2 border-violet-brand flex items-center justify-center shadow-fab transition-all hover:scale-105 hover:shadow-[0_6px_28px_rgba(109,40,217,0.4)] ${!clicked ? 'animate-fab-pulse' : ''} ${speaking ? 'ring-2 ring-violet-brand ring-offset-2' : ''}`}
      >
        <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
          <rect x="8" y="12" width="24" height="16" rx="4" stroke="#6D28D9" strokeWidth="2.5"/>
          <line x1="20" y1="12" x2="20" y2="7" stroke="#6D28D9" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="20" cy="6" r="2" fill="#6D28D9"/>
          <circle cx="14" cy="19" r="2.5" fill="#6D28D9"/>
          <circle cx="26" cy="19" r="2.5" fill="#6D28D9"/>
          <path d="M14 25 Q20 28.5 26 25" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round"/>
          <rect x="13" y="28" width="14" height="7" rx="2" stroke="#6D28D9" strokeWidth="2"/>
          <line x1="9" y1="29" x2="13" y2="31" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round"/>
          <line x1="31" y1="29" x2="27" y2="31" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Manual verify**

Run the app. Navigate to `/activity`. Within ~0.8 s of the page loading (if not muted), Benjamin should auto-play TTS for the `problem_input_empty` stage. Toggle the tooltip open — the text appears and a speaker button shows inside it. Clicking the speaker button replays. Toggle mute in the header — no auto-play on next navigation.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/GuideTooltip.tsx
git commit -m "feat(voice): add TTS auto-play and speaker button to GuideTooltip"
```

---

### Task 8: "Start Group Discussion" button on results page

**Files:**
- Modify: `frontend/app/activity/results/page.tsx`

**Interfaces:**
- Consumes: `useStore` `sessionId`; router navigation to `/activity/discussion`
- Produces: A "Start Group Discussion →" button rendered in the results page header

- [ ] **Step 1: Add the button**

In `frontend/app/activity/results/page.tsx`, find the export/download button block:

```tsx
{sessionId && (
  <a
    href={api.exportUrl(sessionId)}
    download
    className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-violet-brand text-violet-brand text-sm font-bold rounded-full hover:bg-violet-brand hover:text-white transition"
  >
    ↓ Download PPT
  </a>
)}
```

Replace it with:

```tsx
{sessionId && (
  <div className="flex items-center gap-3 flex-wrap">
    <a
      href={api.exportUrl(sessionId)}
      download
      className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-violet-brand text-violet-brand text-sm font-bold rounded-full hover:bg-violet-brand hover:text-white transition"
    >
      ↓ Download PPT
    </a>
    <button
      onClick={() => router.push('/activity/discussion')}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-action text-white text-sm font-bold rounded-full hover:shadow-glow transition"
    >
      Start Group Discussion →
    </button>
  </div>
)}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Manual verify**

Navigate to the results page. Confirm the "Start Group Discussion →" button appears next to the Download PPT button. Clicking it navigates to `/activity/discussion` (which will 404 until Stage 2 is built — that's expected).

- [ ] **Step 4: Commit**

```bash
git add frontend/app/activity/results/page.tsx
git commit -m "feat(voice): add Start Group Discussion button to results page"
```

---

## Plan 1 Complete

Run the full backend test suite to verify nothing regressed:

```bash
cd backend
python -m pytest tests/ -v
```

Then run TypeScript check for the frontend:

```bash
cd frontend
npx tsc --noEmit
```

Both should pass cleanly. **Plan 2 (Stage 2 Representation) can now begin.**
