import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_TURSO_DATABASE_URL,
  authToken: process.env.DATABASE_TURSO_AUTH_TOKEN,
});

const sql = `
CREATE TABLE IF NOT EXISTS "Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "council" TEXT NOT NULL DEFAULT 'parramatta',
    "developmentGroup" TEXT NOT NULL,
    "developmentSubCategory" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "ruleGroup" TEXT NOT NULL,
    "ruleTitle" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "ruleText" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "canonicalUseIds" TEXT NOT NULL,
    "permissibleUses" TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS rule_fts
USING fts5(
  id,
  ruleText,
  section,
  developmentGroup,
  appliesTo,
  permissibleUses,
  council,
  tokenize = 'unicode61 remove_diacritics 1'
);
`;

const statements = sql.split(";").map(s => s.trim()).filter(Boolean);

for (const stmt of statements) {
  await client.execute(stmt);
  console.log("Executed:", stmt.slice(0, 80));
}

console.log("Schema pushed to Turso successfully!");
