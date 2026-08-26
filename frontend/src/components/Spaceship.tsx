"use client";

import React from "react";

interface SpaceshipProps {
  top: string;
  duration: number;
  delay: number;
  scale?: number;
  reverse?: boolean;
}

/**
 * A small spacecraft cruising across the sky with a flickering engine trail.
 */
export default function Spaceship({
  top,
  duration,
  delay,
  scale = 1,
  reverse = false,
}: SpaceshipProps) {
  const ship = (
    <div className="ship-bob" style={{ animationDelay: `${delay / 3}s` }}>
      <svg
        width={52 * scale}
        height={24 * scale}
        viewBox="0 0 52 24"
        fill="none"
        style={{
          ...(reverse ? { transform: "scaleX(-1)" } : {}),
          filter: "drop-shadow(0 0 4px rgba(103, 232, 249, 0.5))",
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`trail-${top}-${delay}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="1" stopColor="#67e8f9" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {/* Engine trail */}
        <rect
          x="-16"
          y="10.6"
          width="18"
          height="2.4"
          rx="1.2"
          fill={`url(#trail-${top}-${delay})`}
          className="ship-engine"
        />
        {/* Hull */}
        <path
          d="M6 13.5 Q16 6.5 32 8.5 L46 11 Q48.5 11.6 46 12.4 L32 14.5 Q16 16.5 6 13.5 Z"
          fill="#0f1b33"
          stroke="#67e8f9"
          strokeOpacity="0.85"
          strokeWidth="1"
        />
        {/* Cockpit */}
        <circle cx="35" cy="11.4" r="2.1" fill="#a5f3fc" />
        <circle cx="35" cy="11.4" r="3.4" fill="#22d3ee" opacity="0.3" />
        {/* Fin */}
        <path d="M14 9 L19 4.5 L24 8.2 Z" fill="#1e3a5f" stroke="#67e8f9" strokeOpacity="0.6" strokeWidth="0.7" />
      </svg>
    </div>
  );

  return (
    <div
      aria-hidden="true"
      className={reverse ? "ship-lane-reverse" : "ship-lane"}
      style={{
        top,
        animation: `${reverse ? "ship-cruise-reverse" : "ship-cruise"} ${duration}s linear ${delay}s infinite`,
        animationFillMode: "backwards",
      }}
    >
      {ship}
    </div>
  );
}
