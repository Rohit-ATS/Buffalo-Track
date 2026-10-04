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
    <div className="relative hidden min-h-[700px] w-full lg:block" aria-hidden="true">
      {/* ---- band 1: the sky ---- */}
      <Constellation className="absolute left-0 top-0 w-64 text-foreground/55" />
      <Orbit className="absolute right-6 top-2 w-24 text-primary/70" />
      <Sparkle className="absolute right-40 top-10 w-9 spin-slow text-highlight" />
      <Sparkle className="absolute left-60 top-28 w-4 float-fast text-primary" />
      <Sparkle className="absolute right-4 top-44 w-5 float-slow text-highlight/80" />
      <Sparkle className="absolute left-24 top-[18%] w-3.5 float-fast text-primary/70" />
      <Sparkle className="absolute right-24 top-[33%] w-4 spin-slow text-highlight/60" />

      {/* ---- band 2: the biology ---- */}
      <Helix className="absolute left-6 top-[27%] w-36 rotate-6 text-foreground/70 float-slow" />
      <Magnifier className="absolute left-52 top-[21%] w-16 float-fast text-foreground/80" />
      <CurvedArrow className="absolute left-36 top-[41%] w-28 text-foreground/55" />

      {/* ---- band 3: the sentence, framed and never crossed ---- */}
      <p className="absolute right-0 top-[40%] max-w-[300px] rotate-[-4deg] font-sketch text-3xl leading-snug">
        Your people are
        <br />
        already out there.
        <br />
        <em className="relative inline-block text-primary">
          Meet them at your pace.
          <ScribbleCircle className="absolute -inset-x-5 -inset-y-3 h-[150%] w-[118%] text-primary/55" />
        </em>
      </p>

      {/* ---- band 4: the people ---- */}
      <Squiggle className="absolute left-2 top-[58%] w-36 text-primary/70" />
      <TwoPeople className="absolute right-12 top-[62%] w-40 text-foreground/65" />
      <PaperPlane className="absolute left-44 top-[70%] w-16 float-slow text-primary/80" />

      {/* ---- band 5: the floor ---- */}
      <Neuron className="absolute bottom-6 left-0 w-56 text-foreground/35 float-slow" />
      <Orbit className="absolute bottom-28 left-56 w-20 text-primary/45" />
      <Squiggle className="absolute bottom-2 left-52 w-28 text-highlight/60" />
      <Heart className="absolute bottom-24 right-10 w-11 wiggle text-primary" />
      <Sparkle className="absolute bottom-10 right-44 w-6 spin-slow text-highlight/70" />

      <p className="absolute bottom-0 right-0 max-w-[230px] rotate-[2deg] text-right font-sketch text-xl leading-tight text-muted-foreground">
        no feed, no followers —
        <br />
        just families who share
        <br />
        the same biology.
      </p>
    </div>
  );
}
