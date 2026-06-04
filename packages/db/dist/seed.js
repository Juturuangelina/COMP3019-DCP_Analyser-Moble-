import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const prisma = new PrismaClient();
export async function seed(council) {
    const DATA_FILES = {
        parramatta: "dcp_rules_tagged_permissible.json",
        bankstown: "bankstown_dcp_rules_v2_full.json",
    };
    const fileName = DATA_FILES[council];
    if (!fileName) {
        throw new Error(`No data file configured for council: ${council}`);
    }
    const dataPath = join(__dirname, "../data/" + fileName);
    const raw = JSON.parse(readFileSync(dataPath, "utf-8"));
    const rules = raw.rules;
    // Remove existing rules for this council only
    await prisma.rule.deleteMany({ where: { council } });
    await prisma.rule.createMany({
        data: rules.map((r) => ({
            id: council + "_" + r.id, // e.g. "parramatta_185" — unique across councils
            council,
            developmentGroup: r.development_group,
            developmentSubCategory: r.development_sub_category,
            partNumber: r.part_number,
            section: r.section,
            ruleGroup: r.rule_group,
            ruleTitle: r.rule_title,
            ruleType: r.rule_type,
            ruleCode: r.rule_code,
            ruleText: r.rule_text,
            sourceRef: r.source_ref,
            appliesTo: r.applies_to,
            canonicalUseIds: r.canonical_use_ids.join("|"),
            permissibleUses: r.permissible_uses.join("|"),
        })),
    });
    console.log("Seeded " + rules.length + " rules for " + council);
    // ── FTS5 Full-Text Search Index ──────────────────────────────────────────
    // SQLite FTS5 is a virtual table extension built into SQLite that provides
    // full-text search. It uses the BM25 ranking algorithm (the same algorithm
    // used by Elasticsearch and modern search engines) for relevance scoring.
    //
    // Why FTS5 instead of simple LIKE/contains:
    //   LIKE '%fence%'  → matches 'conference', 'inference' (substring anywhere)
    //   FTS5 'fence'    → matches only the word 'fence' (respects word boundaries)
    //   FTS5 'fence*'   → prefix match: 'fence', 'fencing', 'fences'
    //
    // The unicode61 tokenizer handles international characters and diacritics,
    // important for Australian place names in DCP documents.
    //
    // Reference: https://www.sqlite.org/fts5.html
    console.log("Rebuilding FTS5 index for " + council + "...");
    // Create the FTS5 virtual table once — IF NOT EXISTS means this is safe
    // to run on every seed without dropping existing data for other councils.
    await prisma.$executeRawUnsafe(`
    CREATE VIRTUAL TABLE IF NOT EXISTS rule_fts
    USING fts5(
      id,               -- Rule.id, used to JOIN back to the Rule table after search
      ruleText,         -- The actual rule content (main search target)
      section,          -- e.g. "3.1 HOUSING DIVERSITY AND CHOICE"
      developmentGroup, -- e.g. "Residential Development"
      appliesTo,        -- e.g. "Granny Flat", "All Development"
      permissibleUses,  -- pipe-separated permissible use labels
      council,          -- LGA slug used to scope searches per council
      tokenize = 'unicode61 remove_diacritics 1'
    )
  `);
    // Remove stale entries for this council so the index stays in sync
    // with the Rule table after a re-seed. Other councils are unaffected.
    await prisma.$executeRaw `DELETE FROM rule_fts WHERE council = ${council}`;
    // Copy all text fields from the Rule table into the FTS5 index.
    // FTS5 tokenises these fields so they can be searched with MATCH.
    await prisma.$executeRaw `
    INSERT INTO rule_fts(id, ruleText, section, developmentGroup, appliesTo, permissibleUses, council)
    SELECT                id, ruleText, section, developmentGroup, appliesTo, permissibleUses, council
    FROM Rule
    WHERE council = ${council}
  `;
    console.log("FTS5 index ready for " + council);
}
