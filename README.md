# DCP Analyser — Parramatta

A web app that lets users ask plain-English questions about the Parramatta Development Control Plan (DCP) and get back the most relevant rules, ranked by confidence.

Built as part of a professional capstone project.

### How it works

1. User types a question (e.g. "Can I build a granny flat?")
2. The server does a keyword search across 6,474 DCP rules in a local SQLite database
3. Up to 80 candidate rules are sent to Google Gemini AI
4. Gemini picks the 3–8 most relevant ones and scores them (0–1 confidence)
5. Results are shown as cards with a match label and confidence bar



### Tech Stack

•  Next.js 15 (App Router) + React + TypeScript
•  Prisma + SQLite — local database of DCP rules
•  Google Gemini API — AI ranking of candidate rules
•  Turborepo + pnpm — monorepo tooling
•  Tailwind CSS — styling

### Prerequisites

•  Node.js >= 18
•  Turbo — install with:   pnpm add -g turbo
 A Gemini API key — get one free at https://aistudio.google.com/apikey

### Setup

1. Clone and install
git clone <your-repo-url>
cd COMP3019-DCP_Analyser-Moble-
pnpm i

2. Create environment files

You need two .env files.

apps/web/.env — used by the Next.js app at runtime:
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY=your_gemini_api_key_here

packages/db/.env — used by Prisma CLI commands (migrations, studio):
DATABASE_URL="file:./dev.db"

The DATABASE_URL path is relative to packages/db/prisma/schema.prisma, so file:./dev.db correctly points to packages/db/prisma/dev.db.



3. Set up the database

Push the Prisma schema to create the SQLite database file:
pnpm db:push

5. Run the app
turbo dev