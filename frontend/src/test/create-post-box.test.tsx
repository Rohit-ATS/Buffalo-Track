import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreatePostBox } from "@/components/social/CreatePostBox";
import type { Circle } from "@/lib/social";

const loadCircles = vi.fn();
vi.mock("@/lib/social", () => ({
  loadCircles: () => loadCircles(),
}));

function circle(overrides: Partial<Circle> = {}): Circle {
  return {
    id: "circle-1",
    name: "STXBP1 Families",
    description: null,
    is_private: true,
    steward_id: null,
    membership: "active",
    member_count: 5,
    ...overrides,
  };
}

describe("CreatePostBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults a member of a circle to posting there, not to public", async () => {
    loadCircles.mockResolvedValue([circle()]);
    const onPublish = vi.fn().mockResolvedValue(undefined);

    render(<CreatePostBox onPublish={onPublish} />);
    fireEvent.click(screen.getByRole("button", { name: /share an update/i }));

    await screen.findByRole("option", { name: /STXBP1 Families/i });
    expect(screen.getByRole("combobox")).toHaveValue("circle-1");

    fireEvent.change(screen.getByPlaceholderText(/write your experience/i), {
      target: { value: "hello circle" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^post$/i }));

    await waitFor(() =>
      expect(onPublish).toHaveBeenCalledWith("hello circle", [], undefined, undefined, "circle-1"),
    );
  });

  it("only offers the public option, stated plainly, to someone with no active circle", async () => {
    loadCircles.mockResolvedValue([circle({ membership: "pending" })]);
    const onPublish = vi.fn().mockResolvedValue(undefined);

    render(<CreatePostBox onPublish={onPublish} />);
    fireEvent.click(screen.getByRole("button", { name: /share an update/i }));

    await waitFor(() => expect(loadCircles).toHaveBeenCalled());
    expect(screen.queryByRole("option", { name: /STXBP1 Families/i })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("public");

    fireEvent.change(screen.getByPlaceholderText(/write your experience/i), {
      target: { value: "hello everyone" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^post$/i }));

    await waitFor(() =>
      expect(onPublish).toHaveBeenCalledWith("hello everyone", [], undefined, undefined, null),
    );
  });

  it("shows the real failure and keeps the draft instead of pretending the post saved", async () => {
    loadCircles.mockResolvedValue([]);
    const onPublish = vi.fn().mockRejectedValue(new Error("Sign in to post."));

    render(<CreatePostBox onPublish={onPublish} />);
    fireEvent.click(screen.getByRole("button", { name: /share an update/i }));
    fireEvent.change(await screen.findByPlaceholderText(/write your experience/i), {
      target: { value: "will this save" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^post$/i }));

    expect(await screen.findByText("Sign in to post.")).toBeInTheDocument();
    // The composer stays open with the draft intact -- nothing here claims success.
    expect(screen.getByDisplayValue("will this save")).toBeInTheDocument();
  });
});
