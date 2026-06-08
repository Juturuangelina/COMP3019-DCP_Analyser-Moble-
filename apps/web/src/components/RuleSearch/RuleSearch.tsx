"use client";

import { useState, useRef, useEffect } from "react";
import { RuleResult } from "@/types/rules";

// Council config
const COUNCILS = [
  { id: "parramatta", label: "Parramatta",  available: true  },
  { id: "bankstown",  label: "Bankstown",   available: true },
  { id: "albury",     label: "Albury",      available: true },
  { id: "willoughby", label: "Willoughby",  available: false },
] as const;

type CouncilId = (typeof COUNCILS)[number]["id"];

// Search mode config 

const MODES = [
  {
    id: "ai",
    label: "AI Ranked",
    description: "Gemini reads candidate rules and ranks by relevance",
  },
  {
    id: "keyword",
    label: "Keyword",
    description: "Instant text match across the rule database — no AI call",
  },
] as const;

type ModeId = (typeof MODES)[number]["id"];

//Confidence label helper 

function confidenceLabel(score: number) {
  if (score >= 0.9)  return { label: "High match",     color: "text-[#534AB7]", bar: "bg-[#534AB7]" };
  if (score >= 0.75) return { label: "Good match",     color: "text-[#8B6B8A]", bar: "bg-[#8B6B8A]" };
  return               { label: "Possible match",      color: "text-[#908478]", bar: "bg-[#908478]" };
}

// Main component 

export default function RuleSearch() {
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState<RuleResult[]>([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const [hasSearched,setHasSearched]= useState(false);
  const [council,    setCouncil]    = useState<CouncilId>("parramatta");
  const [mode,       setMode]       = useState<ModeId>("ai");
  const [hoveredId,  setHoveredId]  = useState<string | null>(null);
  const [resultMode, setResultMode] = useState<string>("");

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [query]);

  // Dynamic placeholder based on selected council
  const councilLabel = COUNCILS.find((c) => c.id === council)?.label ?? "DCP";
  const placeholder = `e.g. What are the setback requirements for a granny flat in ${councilLabel}?`;

  // Search

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    setHoveredId(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, council, mode }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setResultMode(data.mode ?? mode);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleReset = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setHoveredId(null);
    inputRef.current?.focus();
  };

  // Render 
  return (
    <div
      className="min-h-screen bg-[#F8F2F5] px-4 relative overflow-x-hidden font-sans"
      style={{
        paddingTop:    hasSearched ? "2rem"  : "22vh",
        paddingBottom: hasSearched ? "3rem"  : "0",
        transition: "padding-top 0.5s ease, padding-bottom 0.5s ease",
      }}
    >
      {/* Decorative blobs */}
      <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-[#7880E7]/10 pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[35rem] h-[35rem] rounded-full bg-[#908478]/10 pointer-events-none" />

      <div className="w-full max-w-2xl mx-auto relative z-10 flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="px-4 py-1 rounded-full border border-[#7880E7] text-[#534AB7] text-xs tracking-widest uppercase">
            DCP Analyser
          </span>
          <h1 className="text-4xl font-semibold text-[#070429] tracking-tight">
            Rule Finder
          </h1>
          <p className="text-[#534AB7] text-base max-w-md leading-relaxed">
            Describe a situation or ask a question — the relevant DCP rule will be surfaced for you.
          </p>
        </div>

        {/* ── Council selector ── */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[#908478] uppercase tracking-widest text-center">
            Select council
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {COUNCILS.map((c) => (
              <button
                key={c.id}
                onClick={() => c.available && setCouncil(c.id)}
                disabled={!c.available}
                title={!c.available ? "Coming soon" : undefined}
                className={[
                  "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                  c.available && council === c.id
                    ? "bg-[#534AB7] border-[#534AB7] text-white"
                    : c.available
                    ? "bg-white border-[#D0D6F7] text-[#534AB7] hover:border-[#534AB7]"
                    : "bg-transparent border-[#E0D9DC] text-[#C4B8BE] cursor-not-allowed",
                ].join(" ")}
              >
                {c.label}
                {!c.available && (
                  <span className="ml-1.5 text-[10px] opacity-60">soon</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Search mode tabs ── */}
        <div className="flex gap-1 p-1 bg-white border border-[#D0D6F7] rounded-xl">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              title={m.description}
              className={[
                "flex-1 py-1.5 rounded-lg text-sm font-medium transition-all",
                mode === m.id
                  ? "bg-[#7880E7] text-white shadow-sm"
                  : "text-[#908478] hover:text-[#534AB7]",
              ].join(" ")}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* ── Search card ── */}
        <div className="bg-white border border-[#D0D6F7] rounded-2xl py-5 px-6 flex flex-col gap-3 shadow-sm">
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full bg-transparent border-none outline-none text-[#070429] text-base leading-relaxed resize-none placeholder-[#A4AAEC] min-h-7 max-h-48 overflow-y-auto"
          />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-[#A4AAEC]">
              Enter to search · Shift+Enter for newline
            </span>
            <div className="flex items-center gap-2">
              {hasSearched && (
                <button
                  onClick={handleReset}
                  className="bg-transparent border border-[#D0D6F7] rounded-lg text-[#534AB7] px-4 py-1.5 text-sm cursor-pointer"
                >
                  Clear
                </button>
              )}
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

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="w-5 h-5 rounded-full border-2 border-[#D0D6F7] border-t-[#7880E7] animate-spin" />
            <span className="text-[#534AB7] text-sm">
              {mode === "ai" ? "Asking Gemini…" : "Scanning rules…"}
            </span>
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && hasSearched && results.length === 0 && (
          <p className="text-center text-[#A4AAEC] text-sm py-8">
            No matching rules found for <strong>{councilLabel}</strong>. Try rephrasing your question.
          </p>
        )}

        {/* ── Results ── */}
        {!isLoading && results.length > 0 && (
          <div className="flex flex-col gap-3">

            {/* Results header */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#A4AAEC]">
                {results.length} rule{results.length !== 1 ? "s" : ""} found · {councilLabel} DCP
              </p>
              <span className={[
                "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                resultMode === "ai"
                  ? "text-[#534AB7] border-[#D0D6F7] bg-[#F0F1FC]"
                  : "text-[#908478] border-[#E8DDD8] bg-[#F8F2F5]",
              ].join(" ")}>
                {resultMode === "ai" ? "AI ranked" : "Keyword match"}
              </span>
            </div>

            {/* Result cards */}
            {results.map((r) => {
              const { label, color, bar } = confidenceLabel(r.confidence);
              const isHovered = hoveredId === r.id;

              return (
                <div
                  key={r.id}
                  onMouseEnter={() => setHoveredId(r.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="bg-white border border-[#E8EAF9] rounded-xl py-5 px-6 flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md cursor-default"
                >
                  {/* Top row: match label + rule code tag */}
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className={`text-xs font-medium tracking-wide ${color}`}>
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={[
                        "text-[10px] font-mono px-2 py-0.5 rounded border",
                        r.ruleType === "Control"
                          ? "text-[#534AB7] bg-[#F0F1FC] border-[#D0D6F7]"
                          : "text-[#908478] bg-[#F8F2F5] border-[#E8DDD8]",
                      ].join(" ")}>
                        {r.ruleType}
                      </span>
                      <span className="text-[10px] text-[#908478] font-mono bg-[#F8F2F5] border border-[#E8DDD8] px-2 py-0.5 rounded">
                        {r.ruleCode}
                      </span>
                    </div>
                  </div>

                  {/* Rule text */}
                  <p className="text-[#070429] text-sm leading-relaxed">
                    {r.rule}
                  </p>

                  {/* Confidence bar */}
                  <div className="h-0.5 bg-[#EEF0FB] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${bar}`}
                      style={{ width: `${r.confidence * 100}%` }}
                    />
                  </div>

                  {/* ── Hover panel: PDF location ── */}
                  {isHovered && (
                    <div className="border-t border-[#EEF0FB] pt-3 mt-1 grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] text-[#A4AAEC] uppercase tracking-wider mb-0.5">Section</p>
                        <p className="text-xs text-[#534AB7] font-medium">{r.section}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#A4AAEC] uppercase tracking-wider mb-0.5">Part</p>
                        <p className="text-xs text-[#534AB7] font-medium">{r.partNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#A4AAEC] uppercase tracking-wider mb-0.5">Development Group</p>
                        <p className="text-xs text-[#070429]">{r.developmentGroup}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#A4AAEC] uppercase tracking-wider mb-0.5">Applies To</p>
                        <p className="text-xs text-[#070429]">{r.appliesTo === "*" ? "All development" : r.appliesTo}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] text-[#A4AAEC] uppercase tracking-wider mb-0.5">Source Reference</p>
                        <p className="text-[10px] text-[#908478] font-mono">{r.sourceRef} · {r.council} DCP</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
