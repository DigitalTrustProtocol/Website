/*
 * The Web-of-Trust mark, adapted from the Attention extension's
 * AnimatedWotLogo (copied geometry, not imported): a root with six branches
 * reaching people one and two hops away. The file public/brand/wot-mark.svg
 * is the same drawing for the favicon.
 */

type Point = readonly [number, number];

interface Branch {
  mid: Point;
  ends: readonly Point[];
}

const CENTER: Point = [24, 24];
const BRANCHES: readonly Branch[] = [
  { mid: [24, 12], ends: [[18, 6], [30, 6]] },
  { mid: [34, 17], ends: [[42, 12]] },
  { mid: [36, 27], ends: [[43, 30]] },
  { mid: [30, 35], ends: [[35, 42]] },
  { mid: [17, 34], ends: [[12, 42]] },
  { mid: [12, 22], ends: [[5, 18]] },
];

const LINE = 'rgba(13,148,136,0.5)';

interface MarkProps {
  size?: number;
  /** Accessible name; omit for a decorative mark. */
  title?: string;
  className?: string;
}

export function WotMark({ size = 32, title, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {BRANCHES.map((branch, i) => (
        <g key={i}>
          <line x1={CENTER[0]} y1={CENTER[1]} x2={branch.mid[0]} y2={branch.mid[1]} stroke={LINE} strokeWidth={1.5} />
          {branch.ends.map((end, j) => (
            <line key={j} x1={branch.mid[0]} y1={branch.mid[1]} x2={end[0]} y2={end[1]} stroke={LINE} strokeWidth={1.5} />
          ))}
          <circle cx={branch.mid[0]} cy={branch.mid[1]} r={3.5} fill="rgba(13,148,136,0.9)" />
          {branch.ends.map((end, j) => (
            <circle key={j} cx={end[0]} cy={end[1]} r={2.5} fill="rgba(13,148,136,0.6)" />
          ))}
        </g>
      ))}
      <circle cx={CENTER[0]} cy={CENTER[1]} r={5} fill="rgb(13,148,136)" />
    </svg>
  );
}
