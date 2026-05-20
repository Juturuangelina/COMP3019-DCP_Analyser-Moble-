// API route bridging the frontend and Gemini AI.
// Receives query → searches DB → sends to Gemini → returns results.

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { client } from "@repo/db/client";  // same db client your blog uses
import { RuleResult } from "@/types/rules";

// Two-stage search directly in the database.
// Both results combined, duplicates removed, capped at 80.

async function filterRulesFromDB(query: string) {
  // Split query into meaningful keywords (skip words under 3 chars)
  // e.g. "can I build a granny flat" → ["can", "build", "granny", "flat"]
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Run both searches in parallel using Promise.all
  // This is faster than running them one after the other
  const [permissibleMatches, textMatches] = await Promise.all([

    // Stage 1: Search permissible uses field
    // OR means: match if ANY keyword is found
    client.db.rule.findMany({
      where: {
        OR: keywords.map((kw) => ({
          permissibleUses: { contains: kw },
        })),
      },
      take: 60, // limit to 60 from this stage
    }),

    // Stage 2: Search rule text, section, and development group
    client.db.rule.findMany({
      where: {
        OR: keywords.flatMap((kw) => [
          { ruleText:         { contains: kw } },
          { section:          { contains: kw } },
          { developmentGroup: { contains: kw } },
          { appliesTo:        { contains: kw } },
        ]),
      },
      take: 40, // limit to 40 from this stage
    }),
  ]);

  // Combine and remove duplicates by id
  const combined = [...permissibleMatches, ...textMatches];
  const seen = new Set<string>();
  const unique = combined.filter((rule) => {
    if (seen.has(rule.id)) return false;
    seen.add(rule.id);
    return true;
  });

  // Cap total at 80 rules sent to Gemini
  return unique.slice(0, 80);
}

// ---- API ROUTE --------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // Step 1: Get query from request body
    const { query } = await req.json();

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Step 2: Search the database for candidate rules
    const candidateRules = await filterRulesFromDB(query);

    // Return early if database found nothing
    if (candidateRules.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Step 3: Set up Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Step 4: Build the prompt for Gemini
    // Include permissible uses in the context so Gemini can use them
    const prompt = `
A user has asked: "${query}"

From the rules below, identify the most relevant ones to answer the user's question.
Return between 3 and 8 rules depending on how many are genuinely relevant.

Return ONLY a valid JSON array — no explanation, no markdown, no extra text:
[
  {
    "id": "rule_code here",
    "rule": "rule_text here",
    "source": "section name here",
    "confidence": 0.95
  }
]

Confidence is 0.0 to 1.0. Only include rules with confidence above 0.5.

Candidate rules:
${candidateRules
  .map((r) => {
    // Convert pipe-separated string back to readable list for Gemini
    const uses = r.permissibleUses
      ? ` [Applies to: ${r.permissibleUses.replace(/\|/g, ", ")}]`
      : "";
    return `[${r.ruleCode}] ${r.section}: ${r.ruleText}${uses}`;
  })
  .join("\n")}
    `.trim();

    // Call Gemini
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Strip any markdown fences and parse JSON
    const cleaned = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const matchedRules: RuleResult[] = JSON.parse(cleaned);

    // Step 7: Return to frontend
    return NextResponse.json({ results: matchedRules });

  } catch (error) {
    console.error("Rule search error:", error);
    return NextResponse.json(
      { error: "Something went wrong while searching rules." },
      { status: 500 }
    );
  }
}
