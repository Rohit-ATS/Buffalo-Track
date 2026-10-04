import { describe, expect, it } from "vitest";

import {
  isOpenTrial,
  matchCondition,
  trialStatusLabel,
  type ConditionRef,
} from "@/lib/condition-insight";
import { relativeTime } from "@/lib/social-feed";

const CONDITIONS: ConditionRef[] = [
  {
    id: "stxbp1",
    name: "STXBP1 encephalopathy",
    gene: "STXBP1",
    pathway: "Presynaptic vesicle release",
  },
  {
    id: "stx1b",
    name: "STX1B-related epilepsy",
    gene: "STX1B",
    pathway: "Presynaptic vesicle release",
  },
  { id: "scn2a", name: "SCN2A-related disorder", gene: "SCN2A", pathway: "Neuronal excitability" },
];

describe("matching a typed condition to the atlas", () => {
  it("matches on the gene, which is what families actually type", () => {
    expect(matchCondition(CONDITIONS, "STXBP1 Encephalopathy")?.id).toBe("stxbp1");
    expect(matchCondition(CONDITIONS, "my son has scn2a")?.id).toBe("scn2a");
  });

  it("does not let a shorter gene shadow a longer one that contains it", () => {
    // "STX1B" is not a substring of "STXBP1", but the sort guards the general
    // case where one gene symbol is a prefix of another.
    const overlapping: ConditionRef[] = [
      { id: "stx1", name: "STX1 disorder", gene: "STX1", pathway: "p" },
      { id: "stx1b", name: "STX1B-related epilepsy", gene: "STX1B", pathway: "p" },
    ];
    expect(matchCondition(overlapping, "STX1B-related epilepsy")?.id).toBe("stx1b");
  });

  it("matches an exact id or name before falling back to the gene", () => {
    expect(matchCondition(CONDITIONS, "stxbp1")?.id).toBe("stxbp1");
    expect(matchCondition(CONDITIONS, "STX1B-related epilepsy")?.id).toBe("stx1b");
  });

  it("returns null rather than guessing when nothing matches", () => {
    expect(matchCondition(CONDITIONS, "")).toBeNull();
    expect(matchCondition(CONDITIONS, null)).toBeNull();
    expect(matchCondition(CONDITIONS, "a condition not in the atlas")).toBeNull();
  });
});

describe("trial status", () => {
  it("treats only the statuses a family can still act on as open", () => {
    expect(isOpenTrial("RECRUITING")).toBe(true);
    expect(isOpenTrial("NOT_YET_RECRUITING")).toBe(true);
    expect(isOpenTrial("COMPLETED")).toBe(false);
    expect(isOpenTrial("WITHDRAWN")).toBe(false);
    expect(isOpenTrial("TERMINATED")).toBe(false);
  });

  it("accepts the lowercase spelling the registry also returns", () => {
    expect(isOpenTrial("recruiting")).toBe(true);
    expect(isOpenTrial("unknown")).toBe(false);
  });

  it("writes a registry constant as a sentence", () => {
    expect(trialStatusLabel("NOT_YET_RECRUITING")).toBe("Not yet recruiting");
    expect(trialStatusLabel("OBSERVATIONAL")).toBe("Observational");
  });
});

describe("relative timestamps in the feed", () => {
  const now = new Date("2026-10-04T12:00:00Z");

  it("describes recent rows the way a feed does", () => {
    expect(relativeTime("2026-10-04T11:59:30Z", now)).toBe("Just now");
    expect(relativeTime("2026-10-04T11:30:00Z", now)).toBe("30 min ago");
    expect(relativeTime("2026-10-04T09:00:00Z", now)).toBe("3 hours ago");
    expect(relativeTime("2026-10-03T12:00:00Z", now)).toBe("Yesterday");
    expect(relativeTime("2026-10-01T12:00:00Z", now)).toBe("3 days ago");
    expect(relativeTime("2026-09-27T12:00:00Z", now)).toBe("1 week ago");
  });

  it("hands back an unparseable value rather than printing NaN", () => {
    expect(relativeTime("not a date", now)).toBe("not a date");
  });
});
