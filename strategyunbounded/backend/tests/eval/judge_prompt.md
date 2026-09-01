# Judge Prompt Templates

These prompts are used by `run.py` to evaluate agent output.
The judge model is the same Azure OpenAI deployment as the brainstorm agents
(AZURE_OPENAI_CHAT_DEPLOYMENT). Review this file whenever agent prompts change.

---

## 1. Brainstorm scoring (per problem)

Used once per problem. The judge receives the primary problem text, all use cases
for that problem, and scores each on four dimensions (0–3).

### Scoring dimensions

| Score | Relevance | Specificity | Feasibility | Diversity |
|---|---|---|---|---|
| 0 | Unrelated to the problem | Generic AI buzzwords | Unrealistic timeline or cost | Near-identical to a sibling |
| 1 | Tangentially related | Some context, mostly generic | Plausible but optimistic | Significant overlap |
| 2 | Addresses a real aspect | Specific to the problem domain | Realistic for most mid-sized orgs | Distinct with minor overlap |
| 3 | Directly and precisely solves the stated problem | Could only apply to this exact problem as described | Grounded and conservative; well-scoped for 12 months | Genuinely different angle from all siblings |

Diversity is scored relative to the other use cases in the same problem set.
Score each dimension independently without justifying a predetermined view.

---

## 2. Cross-problem precision (per also_addresses entry)

Used once per entry in any use case's `also_addresses` list.

The judge receives:
- The primary problem text
- The secondary problem text (from the `also_addresses` index)
- The use case title and description

Verdict options:
- `justified` — the use case genuinely provides meaningful value for the secondary problem
- `superficial` — the link is real but weak; the benefit to the secondary problem is minor
- `wrong` — the use case does not meaningfully address the secondary problem

---

## 3. Priority agreement (full session)

Used once per session. The judge receives all generated use cases (ID, problem index,
title, summary, complexity, cost/ROI) and independently selects the top 3 using the
same criteria as the priority agent:

1. Strategic business value (direct impact on revenue, cost, or risk)
2. Ease of implementation (prefer Low and Medium complexity)
3. Cost efficiency (lower build cost for comparable ROI)
4. Cross-problem reach as a tiebreaker only

The selection must span at least 2 different problem indices.
Return the exact IDs from the input list.
