type P = { className?: string };
const s = { stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

export function Underline({ className = "" }: P) {
  return (
    <svg className={className} viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength={1} className="sketch-draw" style={{ animationDelay: "1s" }} d="M4 15c60-9 140-12 210-6 30 3 55 2 82-4M30 20c70-6 150-7 230-3" {...s} strokeWidth="3" />
    </svg>
  );
}

export function Constellation({ className = "" }: P) {
  const nodes = [[20, 70], [70, 30], [120, 80], [170, 40], [210, 95], [95, 125]];
  return (
    <svg className={className} viewBox="0 0 230 145" aria-hidden="true">
      <path pathLength={1} className="sketch-draw" d="M20 70L70 30L120 80L170 40L210 95M120 80L95 125L20 70M70 30L170 40" {...s} strokeWidth="1.4" strokeDasharray="4 5" />
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 2 ? 7 : 4.5} className={i === 2 ? "fill-primary node-pulse" : "fill-background"} stroke="currentColor" strokeWidth="1.6" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
    </svg>
  );
}

export function Magnifier({ className = "" }: P) {
  return (
    <svg className={className} viewBox="0 0 80 80" aria-hidden="true">
      <path pathLength={1} className="sketch-draw" d="M34 10c14-1 25 10 24 24-1 13-12 22-25 21C20 54 11 44 12 31c1-11 10-20 22-21zM50 50l20 20M68 66l-4 5M24 26c3-5 7-7 12-7" {...s} strokeWidth="2" />
    </svg>
  );
}

export function Sparkle({ className = "" }: P) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 3c1 10 4 14 16 17-12 2-15 6-16 17-2-11-5-15-17-17 12-3 15-7 17-17z" {...s} strokeWidth="1.8" />
    </svg>
  );
}

export function Heart({ className = "" }: P) {
  return (
    <svg className={className} viewBox="0 0 60 54" aria-hidden="true">
      <path pathLength={1} className="sketch-draw" d="M30 48C10 34 4 24 6 15c2-9 14-13 22-3 2 2 2 3 3 4 6-10 18-11 23-3 6 11-6 24-24 35zM14 14c-2 2-3 4-3 7" {...s} strokeWidth="2" />
    </svg>
  );
}

export function ScribbleCircle({ className = "" }: P) {
  return (
    <svg className={className} viewBox="0 0 120 90" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength={1} className="sketch-draw" style={{ animationDelay: "1.4s" }} d="M70 8C35 4 8 20 8 45s30 40 60 38 46-18 44-40C110 20 85 8 55 10 40 11 30 15 24 20" {...s} strokeWidth="2.2" />
    </svg>
  );
}

export function PaperPlane({ className = "" }: P) {
  return (
    <svg className={className} viewBox="0 0 160 90" aria-hidden="true">
      <path pathLength={1} className="sketch-draw" d="M4 80c20-4 30-20 50-18s18 18 36 10M108 28l46-20-20 50-12-18zM122 40l32-32M122 40l-4 16 12-10" {...s} strokeWidth="1.8" strokeDasharray="0" />
    </svg>
  );
}

export function Squiggle({ className = "" }: P) {
  return (
    <svg className={className} viewBox="0 0 200 30" aria-hidden="true">
      <path pathLength={1} className="sketch-draw" d="M3 15c12-12 22-12 30 0s20 12 30 0 20-12 30 0 20 12 30 0 20-12 30 0 20 12 30 0" {...s} strokeWidth="2" />
    </svg>
  );
}

export function Neuron({ className = "" }: P) {
  return (
    <svg className={className} viewBox="0 0 180 120" aria-hidden="true">
      <path pathLength={1} className="sketch-draw" d="M60 60c0-10 8-16 16-16s16 7 15 17-8 15-16 15-15-6-15-16zM60 58L30 30M30 30l-14-4M30 30l-2-16M62 68L28 92M28 92l-16 2M28 92l-4 14M91 62c25 2 40-4 60-14M151 48l14-10M151 48l18 2M151 48l6 16" {...s} strokeWidth="1.8" />
      <circle cx="76" cy="60" r="4" className="fill-current node-pulse" />
    </svg>
  );
}
