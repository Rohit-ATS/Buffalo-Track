import { describe, expect, it } from "vitest";

import {
  canSee,
  defaultSection,
  resolveSection,
  sectionsFor,
  SECTIONS,
  type FamilyRole,
} from "@/lib/access";

const ROLES: FamilyRole[] = ["family", "steward", "evidence_reviewer", "admin"];

describe("access rules", () => {
  it("gives a family member exactly their space, groups and messages", () => {
    expect(sectionsFor("family").map((s) => s.id)).toEqual(["family", "circles", "messages"]);
  });

  it("keeps researchers out of families' private space", () => {
    // The RLS in 0012 already blocks this; the nav must not imply otherwise.
    for (const section of ["family", "circles", "messages", "moderation"] as const) {
      expect(canSee("evidence_reviewer", section), section).toBe(false);
    }
    expect(canSee("evidence_reviewer", "evidence")).toBe(true);
    expect(canSee("evidence_reviewer", "research")).toBe(true);
  });

  it("does not let a family member reach moderation or operations", () => {
    expect(canSee("family", "moderation")).toBe(false);
    expect(canSee("family", "operations")).toBe(false);
    expect(canSee("family", "evidence")).toBe(false);
  });

  it("gives a steward moderation on top of a family member's view", () => {
    const steward = sectionsFor("steward").map((s) => s.id);
    for (const id of sectionsFor("family").map((s) => s.id)) {
      expect(steward).toContain(id);
    }
    expect(steward).toContain("moderation");
    expect(steward).not.toContain("operations");
  });

  it("gives admin every section", () => {
    expect(sectionsFor("admin")).toHaveLength(SECTIONS.length);
  });

  it("reserves operations for admin alone", () => {
    for (const role of ROLES) {
      expect(canSee(role, "operations")).toBe(role === "admin");
    }
  });

  it("lands every role somewhere it can actually see", () => {
    for (const role of ROLES) {
      expect(canSee(role, defaultSection(role)), role).toBe(true);
    }
    expect(defaultSection("family")).toBe("family");
    expect(defaultSection("evidence_reviewer")).toBe("evidence");
  });

  describe("resolveSection", () => {
    it("honours a permitted section", () => {
      expect(resolveSection("family", "messages")).toBe("messages");
    });

    it("falls back to the default for a forbidden one", () => {
      // A stale or hand-edited link must not error or render an empty shell.
      expect(resolveSection("family", "operations")).toBe("family");
      expect(resolveSection("evidence_reviewer", "messages")).toBe("evidence");
    });

    it("falls back for an unknown or missing one", () => {
      expect(resolveSection("family", "nonsense")).toBe("family");
      expect(resolveSection("family", undefined)).toBe("family");
      expect(resolveSection("admin", "")).toBe(defaultSection("admin"));
    });
  });

  it("declares at least one role for every section", () => {
    // A section no role can open would be dead UI.
    for (const section of SECTIONS) {
      expect(section.roles.length, section.id).toBeGreaterThan(0);
    }
  });

  it("has no duplicate section ids", () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
