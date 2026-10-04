import {
  Constellation,
  Heart,
  Magnifier,
  Neuron,
  PaperPlane,
  ScribbleCircle,
  Sparkle,
  Squiggle,
} from "@/components/sketches";

/**
 * The drawn half of the signed-out dashboard.
 *
 * Decoration only, so the whole thing is aria-hidden — a screen reader gets the
 * sign-in form and none of this.
 *
 * Two rules keep it from turning into noise. Marks sit in horizontal bands so
 * nothing ever crosses the handwritten note: the sketches frame the sentence
 * rather than scribbling over it. And every stroke animates on a different
 * delay, because a dozen marks arriving together reads as a flash, while a
 * dozen arriving in sequence reads as someone drawing.
 */

/** A pencil stroke that draws itself. `delay` staggers it against its neighbours. */
function Stroke({
  d,
  delay = 0,
  width = 2,
  className = "",
}: {
  d: string;
  delay?: number;
  width?: number;
  className?: string;
}) {
  return (
    <path
      pathLength={1}
      className={`sketch-draw ${className}`}
      style={{ animationDelay: `${delay}s` }}
      d={d}
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

/** The double helix from the landing hero, redrawn at a larger scale. */
function Helix({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 150 130" fill="none" aria-hidden="true">
      <Stroke d="M35 8c63 20 19 96 81 114" delay={0.2} />
      <Stroke d="M113 8C52 30 98 98 34 122" delay={0.35} />
      {[24, 43, 63, 84, 104].map((y, i) => (
        <Stroke
          key={y}
          d={`M${i % 2 ? 48 : 41} ${y}c22 11 39 9 62-1`}
          delay={0.5 + i * 0.12}
          width={1.5}
        />
      ))}
    </svg>
  );
}

/** Two figures finding each other — the whole point of the page, as a doodle. */
function TwoPeople({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 90" fill="none" aria-hidden="true">
      <circle cx="34" cy="26" r="11" stroke="currentColor" strokeWidth="2" fill="none" />
      <Stroke d="M16 74c2-18 9-26 18-26s16 8 18 26" delay={0.9} />
      <circle cx="126" cy="26" r="11" stroke="currentColor" strokeWidth="2" fill="none" />
      <Stroke d="M108 74c2-18 9-26 18-26s16 8 18 26" delay={1.05} />
      {/* the link between them arrives last */}
      <Stroke d="M58 44c18-10 36-10 46 0" delay={1.6} width={1.8} />
    </svg>
  );
}

/** A hand-drawn arrow that curves toward the note. */
function CurvedArrow({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 130 70" fill="none" aria-hidden="true">
      <Stroke d="M4 10c42 2 76 18 110 46" delay={1.3} width={2.2} />
      <Stroke d="M98 44l18 13-20 8" delay={1.7} width={2.2} />
    </svg>
  );
}

/** Small dots orbiting a point, like the atlas finding neighbours. */
function Orbit({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 110 110" fill="none" aria-hidden="true">
      <circle
        cx="55"
        cy="55"
        r="40"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="4 7"
        opacity="0.5"
      />
      <circle cx="55" cy="55" r="5" fill="currentColor" className="node-pulse" />
      <g className="spin-slow" style={{ transformOrigin: "55px 55px" }}>
        <circle cx="95" cy="55" r="3.5" fill="currentColor" />
        <circle cx="15" cy="55" r="2.5" fill="currentColor" opacity="0.7" />
        <circle cx="55" cy="15" r="3" fill="currentColor" opacity="0.5" />
      </g>
    </svg>
  );
}

export function SignedOutArt() {
  return (
    <div
      className="relative hidden min-h-[680px] w-full select-none lg:block"
      aria-hidden="true"
    >
      {/* Subtle organic graph paper grid texture blending directly into page */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "28px 28px",
          color: "var(--muted-foreground)",
        }}
      />

      {/* Reassurance text integrated naturally into the top of the canvas */}
      <div className="absolute right-4 top-2 z-10 flex items-center gap-2 text-[11px] font-medium text-primary">
        <span className="size-2 rounded-full bg-primary animate-pulse" />
        Private Peer Network · Zero Tracking
      </div>

      {/* ---- band 1: the sky (Constellation, Orbits & Stars) ---- */}
      <div className="transition-transform duration-500 hover:scale-105">
        <Constellation className="absolute left-4 top-4 w-60 text-foreground/50 transition-colors hover:text-foreground/80" />
      </div>
      <Orbit className="absolute right-8 top-10 w-24 text-primary/70" />
      <Sparkle className="absolute right-40 top-8 w-8 spin-slow text-highlight" />
      <Sparkle className="absolute left-64 top-20 w-4 float-fast text-primary" />
      <Sparkle className="absolute right-6 top-32 w-5 float-slow text-highlight/80" />
      <Sparkle className="absolute left-28 top-[16%] w-3.5 float-fast text-primary/70" />
      <Sparkle className="absolute right-24 top-[26%] w-4 spin-slow text-highlight/60" />

      {/* ---- band 2: the biology (Double helix, Magnifier & Connecting arrow) ---- */}
      <Helix className="absolute left-6 top-[22%] w-36 rotate-3 text-foreground/70 float-slow" />
      <Magnifier className="absolute left-48 top-[18%] w-16 float-fast text-foreground/80" />
      <CurvedArrow className="absolute left-36 top-[36%] w-28 text-foreground/55" />

      {/* ---- band 3: the focal message (natural seamless text, no card box) ---- */}
      <div className="absolute right-0 top-[34%] max-w-[320px] transition-transform duration-300 hover:-translate-y-1">
        <p className="rotate-[-2deg] font-sketch text-[30px] leading-snug text-foreground">
          Your people are
          <br />
          already out there.
          <br />
          <span className="relative inline-block font-semibold text-primary">
            Meet them at your pace.
            <ScribbleCircle className="absolute -inset-x-4 -inset-y-2 h-[145%] w-[122%] text-primary/60" />
          </span>
        </p>
        <p className="mt-2 text-[11px] font-sans leading-normal text-muted-foreground">
          Matched purely on biological pathway, diagnosis & caregiver life stage.
        </p>
      </div>

      {/* ---- band 4: the people & communication ---- */}
      <Squiggle className="absolute left-2 top-[54%] w-36 text-primary/70" />
      <div className="absolute right-12 top-[58%] transition-transform duration-300 hover:scale-110">
        <TwoPeople className="w-40 text-foreground/75" />
      </div>
      <PaperPlane className="absolute left-36 top-[66%] w-16 float-slow text-primary/80" />

      {/* ---- band 5: the grounded biological roots ---- */}
      <Neuron className="absolute bottom-4 left-2 w-52 text-foreground/40 float-slow" />
      <Orbit className="absolute bottom-24 left-52 w-20 text-primary/45" />
      <Squiggle className="absolute bottom-2 left-48 w-28 text-highlight/60" />
      <Heart className="absolute bottom-20 right-12 w-10 wiggle text-primary" />
      <Sparkle className="absolute bottom-8 right-44 w-5 spin-slow text-highlight/70" />

      {/* Bottom statement note */}
      <div className="absolute bottom-2 right-4 max-w-[250px] text-right font-sketch text-xl leading-snug text-muted-foreground">
        no algorithms, no ads —
        <br />
        <span className="text-foreground/80 font-medium">just families who share</span>
        <br />
        the same biology.
      </div>
    </div>
  );
}
