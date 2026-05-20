//The visual search interface the user sees and interacts with. 
//Handles UI state only (what is typed, is it loading, what results came back).

"use client"; // Required in Next.js App Router for interactive components

import { useState, useRef, useEffect } from "react";
import { searchRules } from "@/functions/searchRules"; // API call lives here
import { RuleResult } from "@/types/rules";            // Data shape lives here

export default function RuleSearch() {

  const [query, setQuery] = useState("");                   // What the user typed
  const [results, setResults] = useState<RuleResult[]>([]); // Rules from the API
  const [isLoading, setIsLoading] = useState(false);        // Is a search running?
  const [hasSearched, setHasSearched] = useState(false);    // Has user searched yet?

  // Ref gives us direct access to the textarea (used to auto-resize and focus it)
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Runs every time the user types — grows the box to fit the content
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [query]);

  // --- SEARCH ---
  // Triggered by the Search button or pressing Enter
  const handleSearch = async () => {
    if (!query.trim()) return; // Do nothing if input is empty

    setIsLoading(true);
    setHasSearched(true);

    try {
      // Hand off to searchRules.ts — this is where the fetch happens
      const data = await searchRules(query);
      setResults(data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsLoading(false); // Stop the spinner whether it succeeded or failed
    }
  };

  // --- KEYBOARD SHORTCUT ---
  // Enter = search, Shift+Enter = new line in the textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  // --- RESET ---
  // Clears everything and returns to the empty state
  const handleReset = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus(); // Put the cursor back in the search box
  };

  // --- CONFIDENCE LABEL ---
  // Converts a 0–1 score into a readable label and a colour for the UI
  const confidenceLabel = (score: number) => {
    if (score >= 0.9) return { label: "High match",     color: "text-[#534AB7]", bar: "bg-[#534AB7]" };
    if (score >= 0.75) return { label: "Good match",    color: "text-[#8B6B8A]", bar: "bg-[#8B6B8A]" };
    return              { label: "Possible match",       color: "text-[#908478]", bar: "bg-[#908478]" };
  };

  // --- RENDER ---
  return (

    // PAGE WRAPPER — full screen, blush background, centred content
    <div className="min-h-screen bg-[#F8F2F5] flex items-center justify-center px-4 py-8 relative overflow-hidden font-sans">

      {/* Decorative background blobs — purely visual depth, no interaction */}
      <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-[#7880E7]/10 pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[35rem] h-[35rem] rounded-full bg-[#908478]/10 pointer-events-none" />

      {/* MAIN CONTENT COLUMN */}
      <div className="w-full max-w-2xl relative z-10 flex flex-col gap-6">

        {/* --- HEADER --- */}
        <div className="flex flex-col items-center gap-3 text-center">

          {/* Small pill badge above the title */}
          <span className="px-4 py-1 rounded-full border border-[#7880E7] text-[#534AB7] text-xs tracking-widest uppercase">
            DCP Analyser
          </span>

          <h1 className="text-4xl font-semibold text-[#070429] tracking-tight">
            Rule Finder
          </h1>

          <p className="text-[#534AB7] text-base max-w-md leading-relaxed">
            Describe a situation or ask a question — the relevant rule will be surfaced for you.
          </p>
        </div>

        {/* --- SEARCH CARD --- */}
        {/* White card containing the textarea and action buttons */}
        <div className="bg-white border border-[#D0D6F7] rounded-2xl py-5 px-6 flex flex-col gap-3 shadow-sm">

          {/* The textarea — transparent so the white card shows through */}
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)} // Update state on every keystroke
            onKeyDown={handleKeyDown}
            placeholder="e.g. What are the rules around data validation?"
            rows={1}
            className="w-full bg-transparent border-none outline-none text-[#070429] text-base leading-relaxed resize-none placeholder-[#A4AAEC] min-h-7 max-h-48 overflow-y-auto"
          />

          {/* Bottom row: hint text on the left, buttons on the right */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-[#A4AAEC]">
              Enter to search · Shift+Enter for newline
            </span>

            <div className="flex items-center gap-2">

              {/* Clear button — only appears after the first search */}
              {hasSearched && (
                <button
                  onClick={handleReset}
                  className="bg-transparent border border-[#D0D6F7] rounded-lg text-[#534AB7] px-4 py-1.5 text-sm cursor-pointer"
                >
                  Clear
                </button>
              )}

              {/* Search button — dimmed when empty or loading */}
              <button
                onClick={handleSearch}
                disabled={!query.trim() || isLoading}
                className="bg-[#7880E7] border-none rounded-lg text-white px-5 py-1.5 text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {isLoading ? "Searching…" : "Search"}
              </button>
            </div>
          </div>
        </div>

        {/* --- LOADING SPINNER --- */}
        {isLoading && (
          <div className="flex items-center justify-center gap-3 py-4">
            {/* Spinning circle — the border-t colour is what spins visibly */}
            <div className="w-5 h-5 rounded-full border-2 border-[#D0D6F7] border-t-[#7880E7] animate-spin" />
            <span className="text-[#534AB7] text-sm">Finding relevant rules…</span>
          </div>
        )}

        {/* --- EMPTY STATE --- */}
        {/* Only shows when the user searched but nothing matched */}
        {!isLoading && hasSearched && results.length === 0 && (
          <p className="text-center text-[#A4AAEC] text-sm py-8">
            No matching rules found. Try rephrasing your question.
          </p>
        )}

        {/* --- RESULTS LIST --- */}
        {!isLoading && results.length > 0 && (
          <div className="flex flex-col gap-3">

            {/* Small label showing how many rules were found */}
            <p className="text-xs text-[#A4AAEC]">
              {results.length} rule{results.length !== 1 ? "s" : ""} found
            </p>

            {/* Loop over each result and render a card */}
            {results.map((r) => {
              const { label, color, bar } = confidenceLabel(r.confidence);
              return (

                // RESULT CARD
                <div
                  key={r.id} // React needs a unique key when rendering lists
                  className="bg-white border border-[#E8EAF9] rounded-xl py-5 px-6 flex flex-col gap-3 shadow-sm"
                >
                  {/* Top row: match strength label + source file tag */}
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className={`text-xs font-medium tracking-wide ${color}`}>
                      {label}
                    </span>
                    {/* Monospace tag showing which .md file the rule came from */}
                    <span className="text-[10px] text-[#908478] font-mono bg-[#F8F2F5] border border-[#E8DDD8] px-2 py-0.5 rounded">
                      {r.source}
                    </span>
                  </div>

                  {/* The rule text */}
                  <p className="text-[#070429] text-sm leading-relaxed">
                    {r.rule}
                  </p>

                  {/* Thin bar at the bottom visualising the confidence score */}
                  <div className="h-0.5 bg-[#EEF0FB] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${bar}`}
                      style={{ width: `${r.confidence * 100}%` }} // Dynamic width — needs inline style
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}