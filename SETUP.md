# DCP Analyser — Setup Guide

A web app that lets users ask plain-English questions about a Development Control Plan (DCP) and get back the most relevant rules, ranked by confidence.

---

## How it works

1. User selects a council and types a question (e.g. *"Can I build a granny flat?"*)
2. The server does a keyword search across the rule database
3. Results are either returned directly (Keyword mode) or sent to Gemini AI for ranking (AI Ranked mode)
4. Rules are shown as cards — hover any card to see exactly where it appears in the DCP document

---

## Tech Stack

- **Next.js 15** + **React** + **TypeScript**
- **Prisma** + **SQLite** — local database of DCP rules
- **Google Gemini API** — AI ranking of candidate rules
- **Turborepo** + **pnpm** — monorepo tooling
- **Tailwind CSS** — styling

---

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/installation):
  ```bash
  npm install -g pnpm
  ```
- A **Gemini API key** — free at [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd COMP3019-DCP_Analyser-Moble-
pnpm i
```

### 2. Create environment files

**`apps/web/.env`**
```
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY=your_gemini_api_key_here
```

**`packages/db/.env`**
```
DATABASE_URL="file:./dev.db"
```

### 3. Set up the database

```bash
pnpm --filter @repo/db db:push
```

### 4. Seed the DCP rules

```bash
pnpm --filter @repo/db db:seed
```

This loads all 6,474 Parramatta DCP rules into the local SQLite database.

### 5. Run the app

```bash
turbo dev
```

App runs at **http://localhost:3001**

---

## Search Modes

The app has two search modes you can toggle between.

### AI Ranked *(default)*

1. Splits the query into keywords and searches the database for up to 80 matching candidate rules
2. Sends those candidates to **Google Gemini** with the full question
3. Gemini understands the *meaning* of the question and picks the 3–8 most relevant rules
4. Each result gets a confidence score (0–1) based on how well it answers the question

**Pros:** Understands natural language and intent. *"How far back does my shed need to be?"* will find setback rules even without the word "setback".
**Cons:** Takes 2–5 seconds. Uses Gemini API quota.

### Keyword

1. Splits the query into keywords and searches the database for matching rules
2. Scores each match by counting how many keywords appear across the rule text, section, development group, and permissible uses
3. Returns the top 8, ranked by score — **no AI call**

**Pros:** Instant. Free. Works offline (no API needed).
**Cons:** Only matches the exact words typed. No understanding of meaning or intent.

### When to use which

| | Keyword | AI Ranked |
|---|---|---|
| Speed | Instant | 2–5 sec |
| API cost | Free | Uses Gemini quota |
| Understands meaning | No | Yes |
| Best for | Exact rule codes or terms | Natural questions |

Both modes are in the app so you can compare results — sometimes keyword is surprisingly accurate for specific technical terms, and it's useful to see exactly where AI adds value.

---

## How Search Works Internally

### Full-Text Search (FTS5)

Both search modes use **SQLite FTS5** (Full-Text Search 5) as the underlying search engine. FTS5 is a virtual table extension built into SQLite — no external search service is needed.

**Why FTS5 instead of LIKE / contains:**

| Approach | Query | Matches |
|---|---|---|
| `LIKE '%fence%'` | fence | "fence", "conference", "inference" |
| FTS5 `fence` | fence | only the word "fence" (word boundary) |
| FTS5 `fence*` | fence | "fence", "fencing", "fences" (prefix) |

FTS5 tokenises text at index time so it respects word boundaries. It also uses the **BM25 ranking algorithm** to score results by relevance — rules that mention your search term more frequently, and in rarer contexts, rank higher.

Reference: [SQLite FTS5 Documentation](https://www.sqlite.org/fts5.html)
BM25 algorithm: [Okapi BM25 — Wikipedia](https://en.wikipedia.org/wiki/Okapi_BM25)

### Stopwords

Before the query hits FTS5, common words are stripped out. Without this, a query like *"what are the rules for building a fence"* would search for "what", "are", "the", "for", "building" — words that appear in almost every DCP rule, returning useless candidates.

The stopword list has two tiers:
- **Generic English** — articles, prepositions, pronouns, common verbs
- **DCP domain** — words so frequent in DCP text they carry no search signal ("building", "development", "site", "area")

After filtering, the query above reduces to just `["fence"]` — a precise, targeted search.

Inspired by: [NLTK English stopwords](https://www.nltk.org/), [Snowball stopword list](https://snowballstem.org/), adapted for the Australian DCP domain.

### Two-stage AI pipeline

In AI Ranked mode:
1. FTS5 narrows 6,474 rules to the 80 most textually relevant candidates
2. Gemini reads the full question and the 80 candidates to understand intent
3. Gemini picks 3–8 rules that genuinely answer the question

This two-stage design is necessary because:
- FTS5 alone cannot understand meaning (*"shed" ≠ "outbuilding"*)
- Sending all 6,474 rules to Gemini would exceed context token limits and cost too much

---

## Project Structure

```
apps/web/           → Next.js client app (the UI)
packages/db/        → Prisma schema, seed script, DB client
packages/db/data/   → Raw DCP rule JSON files
packages/ui/        → Shared UI components
packages/utils/     → Shared utility functions
```

---

## Adding a new council

1. Add the council's rule data JSON to `packages/db/data/`
2. Run the seed for that council: `pnpm --filter @repo/db db:seed` (update `seed.ts` to point to the new file and pass the council slug)
3. Set `available: true` for that council in `apps/web/src/components/RuleSearch/RuleSearch.tsx`

---

## Swapping the Gemini model

Update `model` in `apps/web/src/app/api/search/route.ts`.
Currently using `gemini-2.5-flash` (free tier, fast).
