// API route: POST /api/search
// Body: { query: string, council: string, mode: "ai" | "keyword" }
//
// Two search modes:
//   "ai"      (default) FTS5 finds top-80 candidates → Gemini re-ranks by meaning
//   "keyword" FTS5 finds and ranks directly using BM25 — no AI call needed
//
// Search pipeline overview:
//   User query → stopword filtering → FTS5 MATCH → ranked candidate rules
//   AI mode:    candidates → Gemini prompt → re-ranked results with confidence
//   Keyword:    candidates → BM25 score → normalised 0–1 confidence

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { client } from "@repo/db/client";
import { RuleResult } from "@/types/rules";

// ── Stopwords ──────────────────────────────────────────────────────────────
// Words stripped from the query before it hits the database.
// Without this, "what are the rules for building a fence" would search for
// "what", "are", "the", "for", "building" — all of which appear in almost
// every rule, returning 80 useless candidates to Gemini.
//
// Two categories of stopword:
//   1. Generic English:  common words with no domain meaning (the, for, are…)
//   2. DCP domain:       words so frequent in DCP text they add no signal
//                        ("building" appears in ~90% of rules, "development" ~95%)
//
// Inspired by standard NLP stopword lists (NLTK, Snowball) adapted for the
// Australian DCP domain.

const STOPWORDS = new Set([
  // question words
  "what", "when", "where", "which", "who", "how", "why",
  // articles
  "the", "a", "an",
  // prepositions
  "in", "on", "at", "to", "of", "for", "from", "with", "by",
  "about", "into", "through", "between", "under", "over", "along",
  // conjunctions
  "and", "or", "but", "if", "as", "nor",
  // common verbs
  "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did",
  "can", "will", "would", "could", "should", "may", "might", "shall",
  "get", "gets", "got", "need", "needs", "want", "wants",
  // pronouns / determiners
  "it", "its", "this", "that", "these", "those",
  "they", "we", "you", "my", "our", "your", "their", "her", "his",
  "i", "me", "him", "us", "them",
  // filler
  "there", "here", "not", "no", "any", "all", "some", "more",
  "also", "than", "then", "so", "just", "like", "such", "very",
  // generic DCP vocabulary (appear in almost every rule — no search signal)
  "rule", "rules", "regulation", "regulations", "requirement", "requirements",
  "must", "shall", "permitted", "allowed", "apply", "applies",
  // DCP domain words so common they appear in almost every rule:
  // "building a fence" → only "fence" is a meaningful search term
  "building", "buildings", "development", "developments",
  "site", "sites", "area", "areas", "land", "lands",
  "provide", "ensure", "maintain", "located", "within",
]);

// Strips punctuation, lowercases, splits on whitespace, then removes
// stopwords and short words (≤3 chars). Returns the meaningful search terms.
//
// Example: "What are the rules for building a fence?"
//   raw tokens:  ["what","are","the","rules","for","building","a","fence"]
//   after filter: ["fence"]   ← only truly meaningful term

function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")  // remove punctuation
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

// ── FTS5 Search ────────────────────────────────────────────────────────────
// SQLite FTS5 (Full-Text Search 5) is a virtual table extension built into
// SQLite. It tokenises text at index time and at query time, then uses the
// BM25 algorithm to rank results by relevance.
//
// Why FTS5 beats LIKE / contains:
//   LIKE '%fence%'  → matches "conference", "inference" (substring anywhere)
//   FTS5 "fence"    → word-boundary match: only rules where "fence" is a token
//   FTS5 "fence*"   → prefix match: "fence", "fencing", "fences"
//
// BM25 is a probabilistic ranking function that weighs term frequency against
// how common the term is across the whole document collection. A rule that
// mentions "fence" three times ranks higher than one that mentions it once.
// FTS5 returns rank as a negative number; more negative = better match.
//
// The FTS5 virtual table (rule_fts) is created and populated by seed.ts.
// Reference: https://www.sqlite.org/fts5.html
// BM25 algorithm: https://en.wikipedia.org/wiki/Okapi_BM25

async function searchFTS5(
  query: string,
  council: string,
  limit: number,
): Promise<{ id: string; rank: number }[]> {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  // Build the FTS5 MATCH query string.
  // Append * to each keyword for prefix matching:
  //   "fence*"  → matches "fence", "fencing", "fences"
  //   "setback*" → matches "setback", "setbacks"
  // Space-separated terms are treated as implicit AND by FTS5:
  //   "fence* setback*" → rule must contain BOTH "fence..." AND "setback..."
  const andQuery = keywords.map((k) => k + "*").join(" ");

  try {
    // $queryRawUnsafe is used here because FTS5's MATCH operator requires the
    // query to be passed as a positional parameter (?), not a Prisma template
    // literal — Prisma's tagged template wrapping can confuse the FTS5 parser.
    let matches = await client.db.$queryRawUnsafe<{ id: string; rank: number }[]>(
      `SELECT id, rank FROM rule_fts WHERE rule_fts MATCH ? AND council = ? ORDER BY rank LIMIT ?`,
      andQuery,
      council,
      limit,
    );

    // Graceful fallback: if AND returns too few results (e.g. query is very
    // specific and no single rule covers all terms), widen to OR so the user
    // still sees something rather than a blank page.
    if (matches.length < 3 && keywords.length > 1) {
      const orQuery = keywords.map((k) => k + "*").join(" OR ");
      matches = await client.db.$queryRawUnsafe<{ id: string; rank: number }[]>(
        `SELECT id, rank FROM rule_fts WHERE rule_fts MATCH ? AND council = ? ORDER BY rank LIMIT ?`,
        orQuery,
        council,
        limit,
      );
    }

    return matches;
  } catch {
    // FTS5 table may not exist if the database has not been seeded yet.
    // Return empty rather than crashing the whole search.
    console.warn("FTS5 search unavailable — has the database been seeded?");
    return [];
  }
}

// ── Fetch full Rule records for a list of FTS5 match IDs ──────────────────
// FTS5 only stores text for indexing; the full Prisma Rule record is needed
// for the UI. We look up by ID and re-sort to preserve the FTS5 rank order.

async function getRulesByFTS5Matches(
  matches: { id: string; rank: number }[],
) {
  if (matches.length === 0) return { rules: [], rankMap: new Map<string, number>() };

  const ids = matches.map((m) => m.id);
  const rules = await client.db.rule.findMany({ where: { id: { in: ids } } });

  // Build a rank lookup so we can re-sort rules to match FTS5 order
  const rankMap = new Map(matches.map((m) => [m.id, m.rank]));

  // Sort ascending by rank (most negative first = best match first)
  rules.sort((a, b) => (rankMap.get(a.id) ?? 0) - (rankMap.get(b.id) ?? 0));

  return { rules, rankMap };
}

// ── Keyword mode: return FTS5-ranked results as RuleResult[] ───────────────
// Normalises FTS5's BM25 score (negative float) to a 0–1 confidence value.
// Best match → confidence 1.0, worst match in the set → confidence ~0.1.

async function searchKeywordMode(
  query: string,
  council: string,
): Promise<RuleResult[]> {
  const matches = await searchFTS5(query, council, 8);
  if (matches.length === 0) return [];

  const { rules, rankMap } = await getRulesByFTS5Matches(matches);

  // BM25 rank is negative. More negative = better.
  // Normalise relative to the best and worst in this result set.
  const ranks = matches.map((m) => m.rank);
  const best  = Math.min(...ranks);  // most negative = best
  const worst = Math.max(...ranks);  // least negative = worst
  const range = best === worst ? 1 : worst - best; // avoid divide-by-zero

  return rules
    .map((rule) => {
      const rank = rankMap.get(rule.id) ?? worst;
      // Confidence: best rank maps to 1.0, worst maps to ~0.1 (never 0)
      const confidence = parseFloat((0.1 + 0.9 * ((worst - rank) / range)).toFixed(2));
      return {
        id:               rule.id,
        rule:             rule.ruleText,
        confidence,
        ruleCode:         rule.ruleCode,
        ruleType:         rule.ruleType,
        section:          rule.section,
        partNumber:       rule.partNumber,
        developmentGroup: rule.developmentGroup,
        appliesTo:        rule.appliesTo,
        sourceRef:        rule.sourceRef,
        council:          rule.council,
      } satisfies RuleResult;
    });
}

// ── AI mode: FTS5 finds candidates → Gemini re-ranks by meaning ───────────
// FTS5 narrows 6,474 rules down to the 80 most textually relevant candidates.
// Gemini then reads the full question and the candidates to understand intent,
// picking the 3–8 rules that genuinely answer the question with a confidence
// score it assigns based on semantic relevance.
//
// This two-stage approach is important:
//   • FTS5 alone cannot understand meaning ("shed" ≠ "outbuilding")
//   • Gemini alone would need all 6,474 rules in context (too many tokens)
//   Together: precise candidates + semantic understanding

async function searchAIMode(
  query: string,
  council: string,
): Promise<RuleResult[]> {
  const matches = await searchFTS5(query, council, 80);
  if (matches.length === 0) return [];

  const { rules: candidateRules } = await getRulesByFTS5Matches(matches);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Prompt instructs Gemini to return only a JSON array so we can parse it
  // reliably. We pass ruleCode as the "id" so it's easy to match back.
  const prompt = `
A user has asked: "${query}"

From the DCP rules below, identify the most relevant ones to answer the question.
Return between 3 and 8 rules depending on how many are genuinely relevant.
If none of the rules are relevant, return an empty array [].

Return ONLY a valid JSON array — no explanation, no markdown, no extra text:
[
  {
    "id": "rule_code here",
    "rule": "rule_text here",
    "confidence": 0.95
  }
]

Confidence is 0.0 to 1.0. Only include rules with confidence above 0.5.

Candidate rules:
${candidateRules
  .map((r) => {
    // Include permissible uses so Gemini understands which land uses apply
    const uses = r.permissibleUses
      ? ` [Applies to: ${r.permissibleUses.replace(/\|/g, ", ")}]`
      : "";
    return `[${r.ruleCode}] ${r.section}: ${r.ruleText}${uses}`;
  })
  .join("\n")}
  `.trim();

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Strip any markdown code fences Gemini occasionally adds despite instructions
  const cleaned = responseText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const geminiResults: { id: string; rule: string; confidence: number }[] =
    JSON.parse(cleaned);

  // Gemini returns ruleCode as the id — match it back to the full DB record
  return geminiResults
    .map(({ id, confidence }) => {
      const row =
        dbRuleByCode(candidateRules, id) ||
        candidateRules.find((r) => r.id === id);
      if (!row) return null;
      return {
        id:               row.id,
        rule:             row.ruleText,
        confidence,
        ruleCode:         row.ruleCode,
        ruleType:         row.ruleType,
        section:          row.section,
        partNumber:       row.partNumber,
        developmentGroup: row.developmentGroup,
        appliesTo:        row.appliesTo,
        sourceRef:        row.sourceRef,
        council:          row.council,
      } satisfies RuleResult;
    })
    .filter((r): r is RuleResult => r !== null);
}

// Helper: find a rule in the candidate list by its ruleCode
function dbRuleByCode(
  rules: Awaited<ReturnType<typeof client.db.rule.findMany>>,
  code: string,
) {
  return rules.find((r) => r.ruleCode === code);
}

// ── POST /api/search ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { query, council = "parramatta", mode = "ai" } = await req.json();

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (mode === "keyword") {
      const results = await searchKeywordMode(query, council);
      return NextResponse.json({ results, mode: "keyword" });
    }

    // Default: AI ranked
    const results = await searchAIMode(query, council);
    return NextResponse.json({ results, mode: "ai" });

  } catch (error) {
    console.error("Rule search error:", error);
    return NextResponse.json(
      { error: "Something went wrong while searching rules." },
      { status: 500 },
    );
  }
}
