import React from "react";

interface EUFlagProps {
  className?: string;
}

export const EUFlag = ({ className = "w-9 h-9" }: EUFlagProps) => {
  const starPositions = [
    { cx: 30, cy: 10 },
    { cx: 45, cy: 13 },
    { cx: 55, cy: 22 },
    { cx: 58, cy: 37 },
    { cx: 52, cy: 50 },
    { cx: 42, cy: 56 },
    { cx: 30, cy: 56 },
    { cx: 18, cy: 50 },
    { cx: 12, cy: 37 },
    { cx: 15, cy: 22 },
    { cx: 25, cy: 13 },
    { cx: 35, cy: 55 },
  ];

  return (
    <svg
      viewBox="0 0 60 60"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="60" height="60" fill="#003399" rx="3" />
      {starPositions.map((pos, i) => (
        <text
          key={i}
          x={pos.cx}
          y={pos.cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFCC00"
          fontSize="9"
          fontFamily="serif"
        >
          ★
        </text>
      ))}
    </svg>
  );
};
