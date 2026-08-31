# Germany Workshop Agent (Strategy Unbounded)

An AI-guided executive strategy workshop application that helps participants identify challenges, explore and represent AI opportunities, and aggregate them into prioritized strategic decisions.

## Overview

Strategy Unbounded is a research-oriented workshop prototype for teams examining where AI could strengthen strategy, service continuity, and organizational resilience. It is intended for workshop facilitators, executive participants, research collaborators, developers, and industry partners.

The application combines structured human discussion with Google Gemini. Participants can submit workshop notes or a whiteboard image, verify the extracted challenges, examine generated AI opportunities, review them, stress-test the leading priorities, and export an executive summary. AI supports interpretation and synthesis; participants remain responsible for validating inputs and making decisions.

## Workshop Framework

The active interface presents three main stages. Focused pages within those stages retain the capabilities of the earlier step-based workflow.

### 1. Search

**Purpose:** Broaden the strategic search space and identify potential AI-enabled opportunities.

Current sub-steps:

- **1A — Prepare Context:** Participants can enter or edit structured organization, industry, function, topic, objective, process, stakeholder, priority, constraint, and pain-point fields, plus free-text additional context. Context persists with the session and is shown in a compact, editable summary later.
- **1B — Identify Challenges:** Participants enter notes, upload a whiteboard/sticky-note image, or load a sample image. Gemini can interpret an uploaded image and extract challenges, initial AI ideas, uncertainties, and a summary.
- **1C — Explore AI Opportunities:** Participants add, edit, or delete extracted challenges and initial ideas before confirming them. Gemini then produces a structured challenge assessment, an opportunity portfolio, and proposed priorities.

### 2. Representation

**Purpose:** Make generated opportunities concrete enough for participants to understand how they might work.

Current sub-step:

- **2A — Examine Opportunities:** Expandable opportunity cards show the challenge addressed, AI use case, implementation approach, required proprietary and public data, expected strategic value, cost, timeline, and assumptions to validate. The current implementation is a structured card-based representation; interactive simulations are not implemented.

### 3. Aggregation

**Purpose:** Narrow, challenge, prioritize, and converge on strategic decisions.

Current sub-steps:

- **3A — Review & Prioritize:** Mark opportunities **Keep**, **Challenge**, or **Discard**. The backend can synthesize these decisions into three revised priorities.
- **3B — Stress Test:** Run the Board Challenge / Devil's Advocate analysis to identify execution failure points, evidence gaps, governance risks, and missing safeguards.
- **3C — Final Decision & Report:** Review the resulting priorities and export a two-slide executive strategy deck as PDF, editable PowerPoint (`.pptx`), or PNG.

Stage labels and the compatibility mapping from the existing numeric pages are centralized in `src/workshopStages.ts`.

## Key Features

- Three-stage, AI-guided workshop journey with stage and sub-step progress indicators.
- Editable structured and free-text Workshop Context shared with downstream AI calls.
- Text-based workshop-note capture.
- Drag-and-drop whiteboard, flipchart, and sticky-note image upload.
- Multimodal Gemini interpretation of uploaded images.
- Structured extraction of challenges, initial ideas, uncertain handwriting, and confidence information.
- Participant editing, addition, and deletion of extracted challenges and ideas.
- Gemini-generated challenge assessment, AI opportunity portfolio, and proposed top priorities.
- Expandable opportunity representations covering use case, data, implementation, value, cost, and timeline.
- Keep / Challenge / Discard review controls.
- Gemini-based revised-priority synthesis API.
- Board Challenge / Devil's Advocate stress-testing.
- Semantic stage-aware facilitator assistant API with a Search-stage guardrail against premature convergence.
- Browser-local workshop session persistence and a sample workshop session.
- Two-slide final report with PDF, editable PowerPoint, and PNG export.
- Deterministic fallback/demo content when Gemini is unavailable or a model call fails.

> **Integration note:** The facilitator-chat API and additional legacy facilitator UI components exist in the repository, but the active simplified `App.tsx` journey does not currently mount a facilitator chat interface. The whiteboard-feedback extraction API is also implemented, but is not called by the active simplified review page.

## AI / LLM Architecture

- **Provider:** Google Gemini
- **SDK:** [`@google/genai`](https://www.npmjs.com/package/@google/genai)
- **Model:** `gemini-3.7-flash`
- **Service implementation:** `server/geminiService.ts`

The service contains separate prompt-driven functions for:

1. Whiteboard image extraction.
2. AI opportunity generation.
3. Review-whiteboard feedback extraction.
4. Revised-priority synthesis.
5. Board Challenge stress-testing.
6. Stage-aware facilitator responses.

Whiteboard functions send a base64-encoded image as Gemini `inlineData`, together with a text prompt. The structured workshop functions request `application/json` responses and parse them into the TypeScript workshop types. Prompts and fallback results are currently defined alongside each service function rather than in a separate prompt registry.

If `GEMINI_API_KEY` is missing, or if a Gemini request or JSON parse fails, the service returns built-in fallback content so the workflow remains demonstrable. This behavior is useful for development, but fallback results must not be mistaken for analysis of the submitted material.

## System Architecture

```text
Participant browser
       │
       ▼
React 19 + TypeScript + Vite + Tailwind CSS
       │  HTTP/JSON
       ▼
Express server (`server.ts`)
       │
       ▼
Workshop/Gemini service (`server/geminiService.ts`)
       │
       ▼
Google Gemini API (`gemini-3.7-flash`)
```

- **Frontend:** Renders the workshop pages, maintains the current session, calls workshop APIs, and generates downloadable reports in the browser.
- **Express API:** Validates required request fields, exposes workshop endpoints, and serves Vite middleware in development or the built frontend in production.
- **Gemini service:** Owns Gemini client initialization, prompts, multimodal requests, structured-output parsing, and fallback responses.
- **Session storage:** The active frontend serializes one workshop session to browser `localStorage`; there is no server-side database.

## Repository Structure

```text
.
├── src/
│   ├── components/          # Active pages plus retained legacy workshop components
│   ├── data/defaultData.ts  # Default context, sample sessions, and fallback UI data
│   ├── App.tsx              # Active session state, API calls, and page routing
│   ├── types.ts             # Workshop data contracts
│   └── workshopStages.ts    # Three-stage definitions and page compatibility mapping
├── server/
│   └── geminiService.ts     # Gemini prompts, calls, parsing, and service fallbacks
├── server.ts                # Express API and development/production server
├── package.json             # Scripts and JavaScript dependencies
├── bun.lock                 # Bun dependency lockfile
├── vite.config.ts           # React, Tailwind, aliases, and HMR configuration
├── tsconfig.json            # TypeScript configuration
├── metadata.json            # Google AI Studio application metadata
├── .env.example             # Environment-variable template
└── README.md
```

`src/App.tsx` imports the `Page1Welcome` through `Page6FinalResults` components. Files named `Stage0Landing` through `Stage7ExecutiveBrief`, along with some facilitator/modal components, are retained from an earlier interface but are not part of the active render path.

## Main Backend APIs

All request bodies are JSON. Whiteboard images are sent as data URLs, and the Express body limit is 50 MB. Workshop endpoints accept an optional `workshopContext` object so older clients remain compatible.

| Method and endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Returns server status, timestamp, and whether a Gemini key is configured. |
| `POST /api/workshop/extract-whiteboard` | Extracts structured challenges, ideas, uncertainties, and a summary from an uploaded image. Requires `imageDataUrl`; accepts `userNotesHint`. |
| `POST /api/workshop/explore-opportunities` | Generates a challenge assessment and AI opportunity portfolio. Requires `humanDiscussion`; accepts `contextTitle`. |
| `POST /api/workshop/extract-whiteboard-feedback` | Extracts agreements, disagreements, challenges, merges, assumptions, and context from a review-board image. Requires `imageDataUrl`; accepts `currentOpportunities`. |
| `POST /api/workshop/synthesize-revised-priorities` | Synthesizes three revised priorities from the original exploration, Keep/Challenge/Discard reviews, and optional whiteboard feedback. Requires `originalExploration`. |
| `POST /api/workshop/board-challenge` | Stress-tests revised priorities. Requires `revisedPriorities`; accepts `contextTitle`. |
| `POST /api/workshop/run-board-challenge` | Compatibility alias for `/api/workshop/board-challenge`; used by the active frontend. |
| `POST /api/workshop/facilitator-chat` | Returns concise stage-aware guidance. Accepts semantic `mainStage`, optional `substep`, `message`, and `sessionState`; legacy numeric `stage` values are also translated. |

## Getting Started

### Prerequisites

- Node.js with npm. The repository does not currently pin a minimum Node.js version; use a current release compatible with Vite 6 and the dependencies in `package.json`.
- A Google Gemini API key for live AI responses.
- Alternatively, [Bun](https://bun.sh/) can be used because the repository includes `bun.lock`.

### Installation

```bash
git clone <repository-url>
cd GermanyWorkshopAgent
npm install
cp .env.example .env
```

Then replace the placeholder values in `.env`. Do not commit `.env` or API keys.

With Bun, the equivalent dependency installation and script commands are:

```bash
bun install
bun run dev
```

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Required for live AI | Server-side credential used by `@google/genai`. Without it, the application runs with built-in fallback results. |
| `APP_URL` | No current runtime use | Included by the AI Studio environment template for the hosted application URL. The current source does not read this variable. |
| `DISABLE_HMR` | Optional | When set to `true`, disables Vite HMR and file watching. This variable is supported by `vite.config.ts` but is not listed in `.env.example`. |
| `NODE_ENV` | Production runtime | Set to `production` to serve the built frontend from `dist`; otherwise Express runs Vite in middleware mode. |

Example:

```dotenv
GEMINI_API_KEY="your_gemini_api_key"
APP_URL="http://localhost:3000"
```

## Running Locally

Start the Express server with Vite development middleware:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The port is currently fixed to `3000` in `server.ts`.

Useful development checks:

```bash
npm run lint     # TypeScript check (`tsc --noEmit`)
npm run clean    # Remove generated build output
```

## Building for Production

Create the Vite frontend bundle and bundled CommonJS Express entry point:

```bash
npm run build
```

The build produces frontend assets under `dist/` and the server bundle at `dist/server.cjs`. Run it with:

```bash
NODE_ENV=production npm run start
```

`npm run preview` starts Vite's static preview server, but it does not replace the Express API for a complete workshop deployment.

## Deployment

The repository contains Google AI Studio metadata and environment comments for an AI Studio/Cloud Run-style runtime. It does **not** contain a Vercel configuration, Dockerfile, infrastructure-as-code, or a platform-specific deployment workflow.

The production artifact is a Node/Express application. A deployment environment must:

1. Install dependencies.
2. Run `npm run build`.
3. Set `GEMINI_API_KEY` as a server-side secret and `NODE_ENV=production`.
4. Start `npm run start` and expose port `3000`, or adapt the fixed port in `server.ts` for the target platform.

## Workshop Data Flow

```text
Configured workshop context
          │
          ▼
Participant notes / whiteboard image
          │
          ▼
Extracted and human-confirmed challenges + initial ideas
          │
          ▼
Gemini challenge assessment + AI opportunities
          │
          ▼
Opportunity representations and human Keep / Challenge / Discard review
          │
          ▼
Revised priority synthesis
          │
          ▼
Board Challenge stress test
          │
          ▼
Final priorities and downloadable executive slides
```

The frontend keeps these artifacts in one `WorkshopSessionState` object and saves that object to `localStorage`. API calls are stateless: the relevant workshop data is sent with each request.

## Human-in-the-Loop Design

The application is designed to support—not automate—executive judgement.

- Extracted challenges and ideas are shown for confirmation rather than silently accepted.
- Participants can add, edit, and delete challenges and initial ideas before opportunity generation.
- Uncertain handwriting is surfaced for review.
- Opportunity cards connect proposed AI uses to the submitted challenges and expose their data and implementation assumptions.
- Participants explicitly apply Keep, Challenge, or Discard decisions.
- The Board Challenge is instructed to stress-test established priorities rather than replace or silently re-rank them.
- Final outputs are workshop artifacts for human review, not autonomous investment or implementation decisions.

## Current Limitations

- **Browser-only persistence:** Sessions are stored in one browser's `localStorage`; there is no database, account synchronization, or server-side session recovery.
- **No authentication or authorization:** API routes and the frontend do not implement user accounts or access controls.
- **Early-stage Representation:** Representation consists of expandable structured opportunity cards. It does not yet simulate use cases, models, workflows, or future operating scenarios.
- **Partially connected functionality:** The facilitator assistant and review-whiteboard extraction are available as backend APIs, but are not mounted in the active simplified frontend journey.
- **Priority editing is incomplete:** The stress-test page exposes an “Edit Priorities” state toggle, but it does not currently provide fields that modify the priority data.
- **Fallback-heavy prototype behavior:** Missing keys, request failures, and parse failures can produce predefined sample results. These maintain the demo flow but may not reflect participant input.
- **Final-decision synthesis is partly templated:** The active frontend derives priority names from workshop outputs, while some final rationale, safeguard, roadmap, and report text is predefined.
- **Local report generation:** PDF, PowerPoint, and PNG exports are generated in the browser and have no server-side archival or template-management service.
- **No automated test suite:** The repository provides a TypeScript check and production build, but no unit, integration, or end-to-end test scripts.
- **Legacy components remain:** Earlier stage components are still present but are not imported by the active application, which can make the repository structure appear broader than the running workflow.

## Planned / Potential Future Work

The following are potential directions, not implemented features:

- Richer Representation artifacts, prototypes, workflow simulations, or scenario comparisons.
- Persistent server-side sessions, workshop recovery, and role-based access.
- Connection of facilitator chat and review-whiteboard feedback to the active three-stage UI.
- Complete priority editing after the Board Challenge.
- Organization-specific, configurable PowerPoint templates.
- Research analytics for human edits, review decisions, and changes between AI proposals and final priorities.
- Automated unit, API integration, and browser end-to-end testing.

Audio capture, speech-to-text, avatar/voice guidance, and multi-agent visualization are not present in the repository. They should be treated as exploratory possibilities only if they become part of the research plan.

## Research Context

Strategy Unbounded is being developed as a research-oriented prototype for studying AI-supported strategy workshops and human–AI collaborative decision-making. The implementation emphasizes structured stage boundaries, traceable human review, and explicit opportunities to challenge AI-generated material. The repository does not identify a publication, institution, or external research partner, so no such affiliation is claimed here.

## License

The TypeScript source files carry the SPDX identifier `Apache-2.0`. A standalone `LICENSE` file is not currently included in the repository; add the corresponding license text before relying on the repository-level licensing terms for redistribution.
