import React from "react";

interface EUFlagProps {
  className?: string;
}

export const EUFlag = ({ className = "w-9 h-9" }: EUFlagProps) => {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const radius = 18;
    const cx = 30 + radius * Math.cos(angle);
    const cy = 30 + radius * Math.sin(angle);
    return { cx, cy, angle: i * 30 - 90 };
  });

  const createStar = (cx: number, cy: number, size: number) => {
    const points: string[] = [];
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 72 - 90) * (Math.PI / 180);
      const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180);
      points.push(`${cx + size * Math.cos(outerAngle)},${cy + size * Math.sin(outerAngle)}`);
      points.push(`${cx + size * 0.38 * Math.cos(innerAngle)},${cy + size * 0.38 * Math.sin(innerAngle)}`);
    }
    return points.join(" ");
  };

  return (
    <svg
      viewBox="0 0 60 60"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="60" height="60" fill="#003399" rx="2" />
      {stars.map((star, i) => (
        <polygon
          key={i}
          points={createStar(star.cx, star.cy, 5.5)}
          fill="#FFCC00"
        />
      ))}
    </svg>
  );
};
