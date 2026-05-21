// Shape of each result returned to the UI.

export interface RuleResult {
  id: string;           // DB id e.g. "parramatta_185"
  rule: string;         // The rule text shown to the user
  confidence: number;   // 0.0–1.0 match score from Gemini (or keyword score)

  // Location metadata — shown on hover so user can find it in the PDF
  ruleCode: string;           // e.g. "C.04" or "O.01"
  ruleType: string;           // "Control" or "Objective"
  section: string;            // e.g. "3.1 HOUSING DIVERSITY AND CHOICE"
  partNumber: string;         // e.g. "3"
  developmentGroup: string;   // e.g. "Residential Development"
  appliesTo: string;          // e.g. "Granny Flat"
  sourceRef: string;          // e.g. "line:921" — reference to position in source PDF
  council: string;            // e.g. "parramatta"
}
