import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AtlasResults } from "@/components/atlas-results";
import { sanitizeQuery, type AtlasSearchResult } from "@/lib/atlas";

describe("sanitizeQuery", () => {
  it("keeps an ordinary gene symbol intact", () => {
    expect(sanitizeQuery("  STXBP1 ")).toBe("STXBP1");
  });

  it("strips characters that carry meaning in a PostgREST filter", () => {
    // An unescaped comma or paren would otherwise split the `.or()` expression.
    expect(sanitizeQuery("STX1B,name.ilike.*")).toBe("STX1B name.ilike.");
    expect(sanitizeQuery("foo(bar)'baz'")).toBe("foo bar baz");
    expect(sanitizeQuery("a\\b%c*d")).toBe("a b c d");
  });

  it("collapses whitespace and caps length", () => {
    expect(sanitizeQuery("SNARE   gene    disorder")).toBe("SNARE gene disorder");
    expect(sanitizeQuery("x".repeat(200))).toHaveLength(80);
  });
});

describe("AtlasResults", () => {
  it("renders nothing before a search runs", () => {
    const { container } = render(<AtlasResults result={undefined} isPending={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("explains the fallback when Supabase is not configured", () => {
    render(<AtlasResults result={{ status: "unconfigured", query: "STXBP1" }} isPending={false} />);
    expect(screen.getByText(/curated sample path below still works/i)).toBeInTheDocument();
  });

  it("reports an honest gap for an unmatched query", () => {
    render(<AtlasResults result={{ status: "empty", query: "nothing" }} isPending={false} />);
    expect(screen.getByText(/honest gap, not a guess/i)).toBeInTheDocument();
  });

  it("renders connections and evidence receipts for a live match", () => {
    const result: AtlasSearchResult = {
      status: "ok",
      query: "STXBP1",
      match: {
        node: { id: "n1", type: "gene", name: "STXBP1" },
        connections: [
          {
            edgeId: "e1",
            type: "acts_in",
            weight: 0.95,
            direction: "outgoing",
            neighbor: { id: "n2", type: "mechanism", name: "Presynaptic vesicle fusion" },
            evidenceCount: 2,
          },
          {
            edgeId: "e2",
            type: "shares_mechanism",
            weight: 0.8,
            direction: "incoming",
            neighbor: { id: "n3", type: "disorder", name: "STX1B-related epilepsy" },
            evidenceCount: 0,
          },
        ],
        evidence: [
          {
            id: "ev1",
            content: "Munc18-1 is required for synaptic vesicle fusion.",
            sourceUrl: "https://example.org/paper",
            confidence: 0.9,
          },
        ],
      },
      alsoMatched: [{ id: "n4", type: "disorder", name: "STXBP1-related disorder" }],
    };

    render(<AtlasResults result={result} isPending={false} />);

    expect(screen.getByRole("heading", { name: "STXBP1" })).toBeInTheDocument();
    expect(screen.getByText("Presynaptic vesicle fusion")).toBeInTheDocument();
    expect(screen.getByText("2 receipts")).toBeInTheDocument();
    expect(screen.getByText("reviewer evidence")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 carry a receipt")).toBeInTheDocument();
    expect(screen.getByText("90% confidence")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /source/i })).toHaveAttribute(
      "href",
      "https://example.org/paper",
    );
    expect(screen.getByText("STXBP1-related disorder")).toBeInTheDocument();
  });

  it("shows a loading state while the lookup is in flight", () => {
    render(<AtlasResults result={undefined} isPending />);
    expect(screen.getByText(/following the biology/i)).toBeInTheDocument();
  });

  it("handles an API response that omits alternate matches", () => {
    const result: AtlasSearchResult = {
      status: "ok",
      query: "STXBP1",
      match: { node: { id: "n1", type: "gene", name: "STXBP1" }, connections: [], evidence: [] },
      alsoMatched: null,
    };

    render(<AtlasResults result={result} isPending={false} />);
    expect(screen.getByRole("heading", { name: "STXBP1" })).toBeInTheDocument();
    expect(screen.queryByText("Also matched")).not.toBeInTheDocument();
  });
});
