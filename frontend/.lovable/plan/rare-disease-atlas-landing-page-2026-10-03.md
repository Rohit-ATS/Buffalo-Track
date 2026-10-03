# Rare Disease Atlas landing page

## Goal
Build a polished, search-first landing page for **Rare Disease Atlas**, using the uploaded reference for its editorial layout, black-and-white identity, serif-led typography, rounded photo mosaic, hand-drawn scientific sketches, compact data cards, and restrained accent colors.

## What I’ll build
- Replace the blank home page with a responsive landing page at `/`.
- Lead with the product promise: **“Find who shares your disease’s biology, and what they have already built.”**
- Add one prominent search field for disease, gene, symptom, group, or mechanism, plus three example searches drawn from the plan.
- Create a first-screen photo mosaic featuring newly generated 4K-style portraits of different people affected by or working in rare disease—never the people from the reference.
- Layer the photography with purposeful interface fragments: an evidence receipt, a six-step disease-to-action path, a coverage snapshot, and a sourced collaboration brief preview.
- Add concise follow-on sections for:
  1. the path from diagnosis to shared action,
  2. the three evidence tiers (Observed, Reported, Inferred),
  3. the “why not connected” counterexample,
  4. the final collaboration brief and next step.
- Add custom pencil-sketch illustrations and scientific line icons that echo the reference’s playful hand-drawn character without copying its brand assets.
- Include the required “research navigation, not medical advice” note and only use claims supported by the project document.

## Interaction
- Make the search field and example searches interactive within the landing page, revealing a polished sample journey rather than requiring a backend.
- Add smooth section navigation and restrained motion, with reduced-motion support.
- Keep the page fully usable on mobile and desktop with accessible focus states and readable contrast.

## Visual system
- Use an editorial black-and-off-white base with green evidence accents and small warm highlights.
- Pair an expressive high-contrast serif display face with a clean grotesk body face, loaded through the page head.
- Use sharp rules, small-radius cards, generous white space, monochrome pencil marks, and photography as the dominant visual material.
- Generate and use cohesive high-resolution photography sized for the actual layout.

## Technical details
- Implement the page in the existing TanStack Start home route and extend the existing Tailwind v4 semantic tokens.
- Create small reusable sections/components where useful and use the existing icon library for standard controls only; custom scientific sketches will be authored separately.
- Add unique page title, description, Open Graph metadata, and Twitter card metadata.
- Verify the finished page at desktop and mobile sizes, test the search/example interaction, and confirm the preview has no build or runtime errors.
