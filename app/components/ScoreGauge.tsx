'use client';

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  if (score >= 25) return '#f97316';
  return '#ef4444';
}

function getScoreLabel(score: number): string {
  if (score >= 75) return 'Excellent';
  if (score >= 50) return 'Good';
  if (score >= 25) return 'Fair';
  return 'Poor';
}

export default function ScoreGauge({ score, label, size = 'md', showLabel = true }: ScoreGaugeProps) {
  const sizes = { sm: 80, md: 120, lg: 160 };
  const svgSize = sizes[size];
  const strokeWidth = size === 'sm' ? 8 : 12;
  const radius = (svgSize - strokeWidth * 2) / 2;
  const circumference = radius * Math.PI; // half circle
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const fontSize = size === 'sm' ? 18 : size === 'md' ? 28 : 36;
  const subFontSize = size === 'sm' ? 8 : 11;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: svgSize, height: svgSize / 2 + strokeWidth }}>
        <svg
          width={svgSize}
          height={svgSize}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Background arc */}
          <path
            d={`M ${strokeWidth} ${cy} A ${radius} ${radius} 0 0 1 ${svgSize - strokeWidth} ${cy}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Score arc */}
          <path
            d={`M ${strokeWidth} ${cy} A ${radius} ${radius} 0 0 1 ${svgSize - strokeWidth} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
          {/* Score text */}
          <text
            x={cx}
            y={cy + 2}
            textAnchor="middle"
            fontSize={fontSize}
            fontWeight="bold"
            fill={color}
          >
            {score}
          </text>
          <text
            x={cx}
            y={cy + subFontSize + 4}
            textAnchor="middle"
            fontSize={subFontSize}
            fill="#6b7280"
          >
            /100
          </text>
        </svg>
      </div>
      {showLabel && (
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs" style={{ color }}>{getScoreLabel(score)}</p>
        </div>
      )}
    </div>
  );
}
