// Handles all communication with the backend API.

import { RuleResult } from "@/types/rules"; // Import the data shape we defined

export async function searchRules(query: string): Promise<RuleResult[]> {

  // Send the user's query to your Node.js backend
  const response = await fetch("/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", // Tell the server we're sending JSON
    },
    body: JSON.stringify({ query }),       // Convert the query to a JSON string
  });

  // If the server returns an error (404, 500 etc.), throw so the component can catch it
  if (!response.ok) {
    throw new Error(`Search failed with status: ${response.status}`);
  }

  // Parse the response and return the array of rules
  const data = await response.json();
  return data.results as RuleResult[];
}