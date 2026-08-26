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
  opacity: number;
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
    const count = mobile ? 56 : 88;
    setStars(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 1 + Math.random() * 1.6,
        duration: `${2.2 + Math.random() * 3.6}s`,
        delay: `${Math.random() * 4}s`,
        opacity: 0.45 + Math.random() * 0.55,
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
            opacity: s.opacity,
            boxShadow: s.size > 1.6 ? `0 0 ${s.size * 2.4}px rgba(224, 242, 254, 0.9)` : undefined,
          }}
        />
      ))}
    </>
  );
}

export default function CosmicBackground() {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setParallax({ x, y }));
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Nebula — natural indigo/violet, no hue-chaos, slow drift + parallax */}
      <div
        className="absolute inset-0 ken-burns will-change-transform"
        style={{
          transform: `translate3d(${parallax.x * 10}px, ${parallax.y * 8}px, 0) scale(1.06)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/space/nebula.jpg"
          alt=""
          className="w-full h-full object-cover"
          style={{
            filter: "saturate(1.03) brightness(1.02) contrast(1.04)",
          }}
          draggable={false}
        />
        {/* color wash — very subtle */}
        <div
          className="absolute inset-0 mix-blend-soft-light opacity-[0.18]"
          style={{
            background:
              "radial-gradient(ellipse 85% 70% at 28% 22%, #6366f1 0%, transparent 58%), radial-gradient(ellipse 70% 55% at 82% 88%, #22d3ee 0%, transparent 58%)",
          }}
        />
        <div className="absolute inset-0 bg-[#030614]/[0.22]" />
      </div>

      {/* Depth haze — stronger to push focus to deck */}
      <div className="absolute inset-0 bg-gradient-to-b from-space-950/50 via-space-950/18 to-space-950/75" />
      <div className="absolute inset-0 vignette-strong" />

      {/* Nebular glows — muted, parallax at different depths */}
      <div
        className="absolute top-[8%] -left-[10%] w-[54%] h-[56%] rounded-full blur-[110px] opacity-[0.22] animate-glow-drift will-change-transform"
        style={{
          background: "radial-gradient(ellipse, rgba(99, 102, 241, 0.50) 0%, transparent 70%)",
          transform: `translate3d(${parallax.x * 18}px, ${parallax.y * 14}px, 0)`,
        }}
      />
      <div
        className="absolute bottom-[2%] -right-[10%] w-[50%] h-[48%] rounded-full blur-[110px] opacity-[0.18] animate-glow-drift will-change-transform"
        style={{
          background: "radial-gradient(ellipse, rgba(56, 189, 248, 0.38) 0%, transparent 70%)",
          animationDelay: "-12s",
          transform: `translate3d(${parallax.x * -14}px, ${parallax.y * -10}px, 0)`,
        }}
      />
      <div
        className="absolute top-[42%] left-[42%] w-[26%] h-[34%] rounded-full blur-[90px] opacity-[0.10] hidden lg:block"
        style={{
          background: "radial-gradient(ellipse, rgba(192, 132, 252, 0.45) 0%, transparent 72%)",
          transform: `translate3d(${parallax.x * 8}px, ${parallax.y * 6}px, 0)`,
        }}
      />

      <StarField />
      <ShootingStar top="14%" delay="3s" duration="10s" />
      <ShootingStar top="42%" delay="13s" duration="12s" />

      {/* Film grain + vignette */}
      <div className="noise-overlay" />
      
      {/* Ringed planet — parallax */}
      <div
        className="absolute top-[14%] right-[8%] hidden sm:block will-change-transform"
        style={{ transform: `translate3d(${parallax.x * -10}px, ${parallax.y * -8}px, 0)` }}
      >
        <div className="planet" />
        <div className="planet-ring" style={{ position: "absolute", top: "-38px", left: "-38px" }} />
        {/* soft atmospheric halo */}
        <div
          aria-hidden="true"
          className="absolute rounded-full blur-[22px] opacity-40"
          style={{
            width: 96,
            height: 96,
            left: -6,
            top: -6,
            background: "radial-gradient(circle, rgba(167,139,250,0.4), transparent 70%)",
          }}
        />
      </div>

      {/* Ships — fewer, more intentional */}
      <Spaceship top="18%" duration={38} delay={2} scale={1} />
      <Spaceship top="68%" duration={52} delay={14} scale={0.78} />
      <Spaceship top="84%" duration={44} delay={28} scale={0.88} reverse />
    </div>
  );
}
