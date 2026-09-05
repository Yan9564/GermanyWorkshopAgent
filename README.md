# Strategy Unbounded Agent

Strategy Unbounded Agent is an AI-supported **Exercise** for identifying, representing, challenging, and prioritising strategic AI opportunities. It preserves the existing **Search → Representation → Aggregation** framework and uses Gemini as a sparring partner—not as the final decision-maker.

## Framework

1. **Search** — capture Exercise Context, participant free text and/or a whiteboard image; review and correct the visible AI interpretation; confirm participant challenges; generate a broad long list and an 8–10 item shortlist.
2. **Representation** — examine and fully edit each opportunity, add participant opportunities using the same schema, download the approximately 500-row long-list spreadsheet, and establish the authoritative ranking.
3. **Aggregation** — Keep / Challenge / Discard, stress-test the current participant-ranked top three, and review the **3C Aggregated Summary**.

## Participant input is authoritative

Raw typed notes, whiteboard-derived extraction, reviewed challenges, manual additions and edits, rankings, stress-test results, and final selections persist in the browser session. AI outputs are reviewable synthesis. They do not intentionally overwrite participant-approved identities or ranking.

## Outputs

- `strategy-unbounded-long-list.xlsx`: an Excel-compatible, one-row-per-opportunity export of the 500-item broad search space.
- Executive PowerPoint: dynamic title, executive summary, and one readable slide per final priority (five slides for three priorities; six for four).
- Existing PDF/PNG and research-log exports remain available.

## Development

```bash
bun install
bun run dev
bun run lint
bun run build
```

Set `GEMINI_API_KEY` as described in `.env.example`. Without it, the existing deterministic fallback supports demonstrations.

## Partner assets

The invitation-flyer logos were not present in this repository. Add approved assets named `cambridge-service-alliance-logo` and `fraunhofer-iao-logo` before replacing the footer’s clearly labelled placeholders; no fabricated logos are included.
