import { confidenceColor } from '../lib/utils';

interface Props {
  confidence: number;
  size?: number;
  strokeWidth?: number;
}

export default function ConfidenceRing({ confidence, size = 56, strokeWidth = 4 }: Props) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(confidence, 1));
  const color = confidenceColor(confidence);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
        />
      </svg>
      <span className="absolute text-[11px] font-mono font-medium" style={{ color }}>
        {Math.round(confidence * 100)}%
      </span>
    </div>
  );
}
