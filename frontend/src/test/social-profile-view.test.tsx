import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SocialProfileView } from "@/components/social/SocialProfileView";
import type { FamilyProfile } from "@/lib/family-network";

function profile(overrides: Partial<FamilyProfile> = {}): FamilyProfile {
  return {
    condition: "STXBP1 Encephalopathy",
    caregiver_role: "Parent",
    age_band: null,
    timezone: null,
    language: null,
    help_needed: null,
    matching_opt_in: false,
    ...overrides,
  };
}

describe("SocialProfileView matching consent state", () => {
  it("shows matching off for a profile that has not opted in", () => {
    render(
      <SocialProfileView
        profile={profile({ matching_opt_in: false })}
        posts={[]}
        onEditProfile={() => {}}
      />,
    );
    expect(screen.getByText("Matching off")).toBeInTheDocument();
    expect(screen.queryByText("Matching on")).not.toBeInTheDocument();
  });

  it("shows matching on only once the account has explicitly opted in", () => {
    render(
      <SocialProfileView
        profile={profile({ matching_opt_in: true })}
        posts={[]}
        onEditProfile={() => {}}
      />,
    );
    expect(screen.getByText("Matching on")).toBeInTheDocument();
    expect(screen.queryByText("Matching off")).not.toBeInTheDocument();
  });

  it("defaults to off before a profile has loaded, never claiming consent that was never given", () => {
    render(<SocialProfileView profile={null} posts={[]} onEditProfile={() => {}} />);
    expect(screen.getByText("Matching off")).toBeInTheDocument();
  });
});
