// Defines the "shape" of data used across the app.

export interface RuleResult {
  id: string;         // Unique identifier for the rule
  rule: string;       // The actual rule text shown to the user
  source: string;     // Which .md file this rule came from
  confidence: number; // How closely it matched the query (0.0 to 1.0)
}