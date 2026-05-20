-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
