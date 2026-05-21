import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const prisma = new PrismaClient();
export async function seed() {
    console.log("Seeding DCP rules...");
    // Read the tagged permissible-uses rules JSON
    const dataPath = join(__dirname, "../data/dcp_rules_tagged_permissible.json");
    const raw = JSON.parse(readFileSync(dataPath, "utf-8"));
    const rules = raw.rules;
    // Wipe and re-insert
    await prisma.rule.deleteMany();
    await prisma.rule.createMany({
        data: rules.map((r) => ({
            id: r.id,
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
    console.log("Seeded " + rules.length + " DCP rules");
}
