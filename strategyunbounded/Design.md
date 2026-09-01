# Workshop Frontend Design

## Overview

A single-user, browser-based workshop experience built with **Next.js**. The workshop is structured in 3 parts; this document covers **Part 1** only.

---

## Part 1 — AI Use Case Discovery

Part 1 guides the user through identifying company problems, submitting them to an AI brainstorming engine, reviewing the resulting use cases, and providing feedback.

### Pages and Flow

```
Intro Page → Problem Input Page → Processing Screen → Results Page → [Card Detail Modal]
```

---

## Page 1: Introduction Page

**Purpose:** Orient the user to the activity before they begin.

### Layout

- Full-screen centered layout with a soft, neutral background.
- A **video/AI avatar** occupies the upper-center of the screen — embedded video player, auto-plays on page load (muted initially with an unmute option, or with audio on if user interaction has already occurred).
- Below the avatar is a **transcript / caption area** that mirrors what the avatar is saying as scrolling text, for accessibility and clarity.
- A single **"I'm Ready — Start Activity"** CTA button appears below the caption, initially disabled or faded. It becomes fully active once the avatar has finished speaking (or after a minimum viewing threshold).

### Avatar Script (guidance)

The avatar communicates the following:

1. Welcome to Part 1 of the workshop.
2. Your task is to identify **5 real problems** your company faces today — challenges, inefficiencies, risks, or pain points.
3. These problems will be analysed by AI agents who will brainstorm AI-powered solutions for each one.
4. Think broadly: operational, customer-facing, data-related, or strategic problems all qualify.
5. Once you have 5 problems in mind, click the button below to begin.

### Interactions

- Unmute/mute toggle on the avatar video.
- "Replay" link to watch the intro again.
- CTA button: navigates to Problem Input Page.

---

## Page 2: Problem Input Page

**Purpose:** Capture the user's 5 company problems.

### Layout

- Clean, form-focused layout. Header at top: **"What are your 5 company problems?"** with a short sub-heading: *"Describe each problem in your own words. Be as specific as you like."*
- Five numbered input fields stacked vertically:
  - Each is a `<textarea>` (not a single-line input) to allow enough room for a sentence or two.
  - Labels: **Problem 1**, **Problem 2**, … **Problem 5**.
  - Placeholder text: *"e.g. We spend too much time manually processing invoices…"*
- A **"Submit & Brainstorm"** button at the bottom, disabled until all 5 fields contain at least 10 characters.
- A small **static robot/assistant icon** is fixed to the bottom-right corner. Clicking it opens a tooltip/popover with guidance: *"Describe the problem as if you were explaining it to a colleague. Don't worry about perfect wording — focus on the challenge."*

### Validation

- All 5 fields must be non-empty (minimum 10 characters each) before submission is allowed.
- Inline character-count hint beneath each textarea (e.g. *"12 / 500"*).
- No server-side validation at this stage — submission sends all 5 strings to the AI processing step.

### Interactions

- Submitting triggers navigation to the Processing Screen while the AI request runs in the background.

---

## Page 3: Processing Screen

**Purpose:** Inform the user that AI agents are working while results are generated.

### Layout

- Full-screen overlay or dedicated page with a dark/branded background.
- Centered content:
  - Animated graphic showing **AI agents at work** — e.g. three abstract agent nodes with animated connecting lines or a subtle pulse animation.
  - Heading: **"Our AI agents are brainstorming…"**
  - Sub-text cycling through messages (rotate every 3 seconds):
    - *"Analysing your 5 problems…"*
    - *"Generating AI use cases…"*
    - *"Ranking solutions by impact…"*
    - *"Almost ready…"*
- A progress indicator (indeterminate spinner or animated bar) — not a fake percentage, since actual duration is unknown.

### Behaviour

- This screen persists until the AI response is received.
- On completion, the app navigates automatically to the Results Page and reveals all cards at once.
- No user input required on this screen.

---

## Page 4: Results Page

**Purpose:** Display up to 15 AI-generated use case cards, grouped by the problem they address.

### Layout

- Page header: **"AI Use Cases for Your Problems"** with a brief sub-text: *"The AI agents identified the following use cases. Review, explore, and vote on your priorities."*
- Content is grouped into **5 sections**, one per submitted problem.
  - Each section has a collapsible header showing the problem text (truncated if long, with a "show more" toggle).
  - Below the header: a horizontal or grid row of **up to 3 use case cards** for that problem.
- A small **static robot/assistant icon** is fixed to the bottom-right corner. Clicking opens a popover with guidance: *"Click any card to see full details. Use the arrows on each card to adjust its priority. Your votes shape the final ranking."*

### Use Case Card Design

Each card displays:

| Element | Detail |
|---|---|
| **Title** | Name of the AI use case (bold, prominent) |
| **1-line summary** | One sentence describing what it does |
| **Priority badge** | Coloured pill: `Priority 1` (high — green), `Priority 2` (medium — amber), `Priority 3` (lower — grey). Set initially by AI. |
| **Priority controls** | Up (▲) and down (▼) arrow buttons beside the badge to shift priority up or down. Priority cannot go above 1 or below 3. |
| **"View Details" affordance** | The full card face is clickable — a subtle hover state (shadow/border highlight) signals it. |

### Priority Voting Logic

- AI assigns an initial priority of 1, 2, or 3 to each use case when results are returned.
- The user can press ▲ to raise priority (e.g. 2 → 1) or ▼ to lower it (e.g. 1 → 2).
- Priority is bounded: pressing ▲ on Priority 1 or ▼ on Priority 3 has no effect (button greys out at boundary).
- Priority state is stored client-side (in React state / localStorage). No backend persistence in Part 1.

---

## Component: Card Detail Modal

**Purpose:** Show full information about a selected use case. Triggered by clicking any card on the Results Page.

### Layout

- A **full-screen modal overlay** (dimmed backdrop, modal panel centred, scrollable).
- Modal header: use case title + a close (✕) button.
- Content is structured in clearly labelled sections:

### Fields

| Field | Content |
|---|---|
| **Description** | 2–4 sentence explanation of the use case and why it matters. |
| **How It Works** | Step-by-step overview of the AI approach (3–5 bullet points). |
| **Data Required** | What data inputs the solution needs (e.g. invoice PDFs, CRM records). |
| **Approximate Time to Implement** | Rough timeline estimate (e.g. *"3–6 months for MVP"*). |
| **Complexity** | Visual indicator: Low / Medium / High with an icon or colour chip. |
| **Estimated Cost / ROI** | High-level range (e.g. *"£50k–£150k build cost, expected 2× ROI in 18 months"*). |

### Feedback Controls

- Below the content, a **feedback row**: *"Is this use case interesting to your business?"*
  - 👍 **Thumbs Up** button — marks the use case as interesting.
  - 👎 **Thumbs Down** button — marks it as not relevant.
  - Only one can be active at a time; clicking the active button deselects it (toggle behaviour).
  - State is stored client-side.

### Avatar Guidance (in Modal)

- A **small static robot/assistant icon** sits in the top-right corner of the modal (inside the panel).
- Clicking it opens an inline tooltip: *"Read through each section carefully. Use the thumbs to flag which ideas excite your team. Your feedback will carry through to the next part of the workshop."*

---

## Component: Robot/Assistant Guide Icon

Used on: Problem Input Page, Results Page, Card Detail Modal.

- **Visual:** Small circular avatar bubble (robot or friendly assistant illustration), approximately 48×48 px.
- **Placement:** Fixed to the bottom-right on full pages; top-right inside the modal.
- **Behaviour:** Click → opens a popover or tooltip with context-sensitive guidance text (text varies per page — specified in each section above).
- The icon has a subtle pulse animation to draw attention on first load, which stops after the user has clicked it once per session.

---

## Navigation & State Summary

| Step | Route (suggested) | State Produced |
|---|---|---|
| Intro Page | `/` | — |
| Problem Input | `/activity` | 5 problem strings |
| Processing | `/activity/processing` | — (loading) |
| Results | `/activity/results` | 15 use cases + priority map + feedback map |
| Card Detail | Modal on `/activity/results` | Per-card feedback (thumbs up/down) |

Client state (problems, AI results, priorities, feedback) lives in a **React context / Zustand store** for the duration of the session. `localStorage` is used to persist state across accidental page refreshes.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State management | Zustand (or React Context + useReducer) |
| AI avatar (Intro) | Embedded video (`<video>` tag) — video file or iframe from an AI avatar platform |
| AI brainstorming | API route (`/api/brainstorm`) calling an LLM with the 5 problems |
| Animations | Framer Motion (card reveal, modal transitions, icon pulse) |

---

## Open Questions (to resolve before build)

1. **AI avatar platform** — Is the video avatar pre-recorded, or generated on-demand from a service (e.g. HeyGen, Synthesia, D-ID)? This affects whether the intro video is a static asset or a dynamic embed.
2. **AI brainstorming API** — Which LLM / service backs the `/api/brainstorm` route? This determines the response schema and latency expectations.
3. **Session persistence** — Should state survive a full browser close, or only within the tab session?
4. **Card detail content format** — Will the AI return the full card detail fields in one response, or are they fetched on demand when a card is opened?
5. **Parts 2 and 3** — Understanding these will confirm whether client state from Part 1 needs to be handed off (exported, shared, or passed via URL).
