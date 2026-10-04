import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OpenAIProposalModal } from "@/components/OpenAIProposalModal";

describe("OpenAIProposalModal", () => {
  it("never claims to be AI-generated, regenerated, or sent", () => {
    render(<OpenAIProposalModal isOpen onClose={() => {}} />);

    expect(screen.queryByText(/powered by openai/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/gpt-4o/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/re-generate/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send to study pi/i })).not.toBeInTheDocument();
    expect(screen.getByText(/not ai-generated/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical or clinical guidance/i)).toBeInTheDocument();
  });

  it("does not assert a specific enrollment count or trial id as fact", () => {
    render(<OpenAIProposalModal isOpen onClose={() => {}} />);
    const draft = screen.getByText(/rationale for collaboration/i).closest("pre");
    expect(draft?.textContent).not.toMatch(/\b14 pre-consented families\b/);
    expect(draft?.textContent).not.toMatch(/NCT04786743/);
    expect(draft?.textContent).toMatch(/\[.*\]/); // left as a placeholder instead
  });

  it("keeps the email action disabled until a human acknowledges review", () => {
    render(<OpenAIProposalModal isOpen onClose={() => {}} />);

    const emailButton = screen.getByRole("button", { name: /open email draft/i });
    expect(emailButton).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: /human has reviewed this draft/i }));
    expect(emailButton).toBeEnabled();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<OpenAIProposalModal isOpen={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
