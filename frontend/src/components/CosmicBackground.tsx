"use client";

import { useEffect, useState } from "react";

import Spaceship from "./Spaceship";

interface Star {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: string;
  delay: string;
}

interface ShootingStarProps {
  top: string;
  delay: string;
  duration: string;
}

function ShootingStar({ top, delay, duration }: ShootingStarProps) {
  return (
    <div
      className="shooting-star"
      style={{ top, animationDelay: delay, animationDuration: duration }}
    />
  );
}

function StarField() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setStars(
      Array.from({ length: mobile ? 70 : 140 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 1 + Math.random() * 1.8,
        duration: `${2 + Math.random() * 4}s`,
        delay: `${Math.random() * 4}s`,
      }))
    );
  }, []);

  return (
    <>
      {stars.map((s) => (
        <span
          key={s.id}
          className="star-dot"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animationDuration: s.duration,
            animationDelay: s.delay,
            boxShadow: `0 0 ${s.size * 2}px rgba(224, 242, 254, 0.8)`,
          }}
        />
      ))}
    </>
  );
}

export default function CosmicBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Nebula photograph with slow cinematic drift, hue-shifted to violet/blue */}
      <div className="absolute inset-0 ken-burns">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/space/nebula.jpg"
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: "hue-rotate(240deg) saturate(1.25) brightness(1.55)" }}
          draggable={false}
        />
      </div>

      {/* Deep space darkening — keep the nebula glowing */}
      <div className="absolute inset-0 bg-gradient-to-b from-space-950/45 via-space-950/20 to-space-950/65" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(3, 6, 20, 0.5) 100%)",
        }}
      />

      {/* Drifting cosmic glows */}
      <div
        className="absolute top-[10%] -left-[12%] w-[52%] h-[52%] rounded-full blur-[100px] opacity-45 animate-glow-drift"
        style={{ background: "radial-gradient(ellipse, rgba(139, 92, 246, 0.6) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[4%] -right-[10%] w-[48%] h-[46%] rounded-full blur-[100px] opacity-40 animate-glow-drift"
        style={{
          background: "radial-gradient(ellipse, rgba(56, 189, 248, 0.5) 0%, transparent 70%)",
          animationDelay: "-10s",
        }}
      />

      <StarField />
      <ShootingStar top="12%" delay="2s" duration="9s" />
      <ShootingStar top="38%" delay="11s" duration="11s" />

      {/* Ringed planet keeping watch */}
      <div className="absolute top-[13%] right-[9%] hidden sm:block">
        <div className="planet" />
        <div
          className="planet-ring"
          style={{ position: "absolute", top: "-37px", left: "-37px" }}
        />
      </div>

      {/* Traffic lane — ships cruising past */}
      <Spaceship top="16%" duration={34} delay={1} scale={1} />
      <Spaceship top="66%" duration={48} delay={12} scale={0.75} />
      <Spaceship top="84%" duration={40} delay={24} scale={0.85} reverse />
      <Spaceship top="40%" duration={56} delay={38} scale={0.6} reverse />
    </div>
  );
}
