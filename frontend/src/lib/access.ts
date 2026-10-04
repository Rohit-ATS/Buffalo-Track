/**
 * Who sees what.
 *
 * One table, used by the dashboard shell and the nav, so a role's reach is
 * stated once instead of re-derived at each call site. The database is the real
 * boundary — every table in 0012 has RLS keyed to `auth.uid()` and
 * `profiles.role` — and this mirrors it so the interface never offers a section
 * whose queries would come back empty.
 *
 * The privacy rule worth stating out loud: a researcher or reviewer does NOT
 * get into families' private space. They see evidence and the graph. Nothing in
 * `profiles`, `private_messages` or `circle_messages` is theirs to read, the RLS
 * says so, and the nav must not imply otherwise.
 */

export type FamilyRole = "family" | "steward" | "evidence_reviewer" | "admin";

export type SectionId =
  "family" | "circles" | "messages" | "moderation" | "evidence" | "research" | "operations";

export type Section = {
  id: SectionId;
  label: string;
  /** One line, shown under the heading. */
  blurb: string;
  roles: readonly FamilyRole[];
};

/** Order is nav order: the thing a role does most comes first. */
export const SECTIONS: readonly Section[] = [
  {
    id: "family",
    label: "Your family space",
    blurb: "Your private profile, reviewed next steps, and introductions.",
    roles: ["family", "steward", "admin"],
  },
  {
    id: "circles",
    label: "Groups",
    blurb: "Private circles for families living with the same biology.",
    roles: ["family", "steward", "admin"],
  },
  {
    id: "messages",
    label: "Messages",
    blurb: "Group conversations and accepted one-to-one introductions.",
    roles: ["family", "steward", "admin"],
  },
  {
    id: "moderation",
    label: "Moderation",
    blurb: "Join requests and member reports for circles you steward.",
    roles: ["steward", "admin"],
  },
  {
    id: "evidence",
    label: "Evidence review",
    blurb: "Claims awaiting a verdict, with the quote and the source behind each.",
    roles: ["evidence_reviewer", "admin"],
  },
  {
    id: "research",
    label: "Research workspace",
    blurb: "Mechanism units, related disorders, and the graph behind them.",
    roles: ["evidence_reviewer", "admin"],
  },
  {
    id: "operations",
    label: "Operations",
    blurb: "Coverage, data provenance, and discovery runs.",
    roles: ["admin"],
  },
] as const;

const BY_ID = new Map<SectionId, Section>(SECTIONS.map((s) => [s.id, s]));

/** Sections this role may open, in nav order. */
export function sectionsFor(role: FamilyRole): Section[] {
  return SECTIONS.filter((section) => section.roles.includes(role));
}

export function canSee(role: FamilyRole, section: SectionId): boolean {
  return BY_ID.get(section)?.roles.includes(role) ?? false;
}

/** Where a role lands when it opens the dashboard with no section chosen. */
export function defaultSection(role: FamilyRole): SectionId {
  const first = sectionsFor(role)[0];
  // Every role in the enum has at least one section; the fallback keeps this
  // total rather than throwing if a new role is added to the database first.
  return first?.id ?? "family";
}

/**
 * Resolves a section from a URL parameter.
 *
 * Returns the role's default for anything unknown or not permitted, so a
 * hand-edited or stale link degrades to a page the viewer can actually see
 * instead of an error or an empty shell.
 */
export function resolveSection(role: FamilyRole, requested: string | undefined): SectionId {
  if (!requested) return defaultSection(role);
  const candidate = BY_ID.get(requested as SectionId);
  if (!candidate || !candidate.roles.includes(role)) return defaultSection(role);
  return candidate.id;
}

export function sectionLabel(id: SectionId): string {
  return BY_ID.get(id)?.label ?? id;
}

/** A plain-language summary of a role, for the account menu. */
export const ROLE_LABELS: Record<FamilyRole, string> = {
  family: "Family member",
  steward: "Circle steward",
  evidence_reviewer: "Evidence reviewer",
  admin: "Administrator",
};
