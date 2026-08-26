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
  bright?: boolean;
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
    const count = mobile ? 78 : 168;
    const brightCount = mobile ? 8 : 16;
    const regular = Array.from({ length: count - brightCount }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 1.1 + Math.random() * 1.6,
      duration: `${1.4 + Math.random() * 1.8}s`,
      delay: `${Math.random() * 2.5}s`,
      opacity: 0.45 + Math.random() * 0.5,
    }));
    const bright = Array.from({ length: brightCount }, (_, i) => ({
      id: count - brightCount + i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 2.1 + Math.random() * 1.4,
      duration: `${1.6 + Math.random() * 1.2}s`,
      delay: `${Math.random() * 2}s`,
      opacity: 0.9 + Math.random() * 0.1,
      bright: true,
    }));
    setStars([...regular, ...bright]);
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
            boxShadow: s.bright
              ? `0 0 ${s.size * 3.2}px rgba(224, 242, 254, 1), 0 0 ${s.size * 8}px rgba(103, 232, 249, 0.5)`
              : s.size > 1.6
                ? `0 0 ${s.size * 2.2}px rgba(224, 242, 254, 0.85)`
                : undefined,
          }}
        />
      ))}
    </>
  );
}

function Planet({
  size,
  ringSize,
  gradient,
  halo,
  className,
  style,
}: {
  size: number;
  ringSize: number;
  gradient: string;
  halo: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      <div
        className="planet"
        style={{
          width: size,
          height: size,
          background: gradient,
        }}
      />
      <div
        className="planet-ring"
        style={{
          position: "absolute",
          top: -(ringSize - size) / 2,
          left: -(ringSize - size) / 2,
          width: ringSize,
          height: ringSize,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute rounded-full blur-[20px] opacity-30"
        style={{
          width: size + 16,
          height: size + 16,
          left: -8,
          top: -8,
          background: `radial-gradient(circle, ${halo}, transparent 70%)`,
        }}
      />
    </div>
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
      {/* Nebula */}
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
        <div
          className="absolute inset-0 mix-blend-soft-light opacity-[0.18]"
          style={{
            background:
              "radial-gradient(ellipse 85% 70% at 28% 22%, #6366f1 0%, transparent 58%), radial-gradient(ellipse 70% 55% at 82% 88%, #22d3ee 0%, transparent 58%)",
          }}
        />
        <div className="absolute inset-0 bg-[#030614]/[0.22]" />
      </div>

      {/* Depth haze */}
      <div className="absolute inset-0 bg-gradient-to-b from-space-950/50 via-space-950/18 to-space-950/75" />
      <div className="absolute inset-0 vignette-strong" />

      {/* Nebular glows */}
      <div
        className="absolute top-[6%] -left-[12%] w-[56%] h-[58%] rounded-full blur-[110px] opacity-[0.20] animate-glow-drift will-change-transform"
        style={{
          background: "radial-gradient(ellipse, rgba(99, 102, 241, 0.50) 0%, transparent 70%)",
          transform: `translate3d(${parallax.x * 18}px, ${parallax.y * 14}px, 0)`,
        }}
      />
      <div
        className="absolute bottom-[0%] -right-[12%] w-[52%] h-[50%] rounded-full blur-[110px] opacity-[0.16] animate-glow-drift will-change-transform"
        style={{
          background: "radial-gradient(ellipse, rgba(56, 189, 248, 0.38) 0%, transparent 70%)",
          animationDelay: "-12s",
          transform: `translate3d(${parallax.x * -14}px, ${parallax.y * -10}px, 0)`,
        }}
      />
      <div
        className="absolute top-[42%] left-[40%] w-[30%] h-[34%] rounded-full blur-[90px] opacity-[0.10] hidden lg:block"
        style={{
          background: "radial-gradient(ellipse, rgba(192, 132, 252, 0.45) 0%, transparent 72%)",
          transform: `translate3d(${parallax.x * 8}px, ${parallax.y * 6}px, 0)`,
        }}
      />

      <StarField />
      <ShootingStar top="10%" delay="2s" duration="10s" />
      <ShootingStar top="36%" delay="9s" duration="11s" />
      <ShootingStar top="58%" delay="17s" duration="10s" />
      <ShootingStar top="76%" delay="26s" duration="12s" />

      <div className="noise-overlay" />

      {/* Planets — three worlds */}
      <Planet
        size={86}
        ringSize={162}
        gradient="radial-gradient(circle at 30% 28%, #ddd6fe 0%, #a78bfa 26%, #7c5bd4 44%, #3b2a7a 68%, #150a3d 100%)"
        halo="rgba(167,139,250,0.45)"
        className="absolute hidden sm:block will-change-transform"
        style={{ top: "12%", right: "7%", transform: `translate3d(${parallax.x * -10}px, ${parallax.y * -8}px, 0)` }}
      />
      {/* Rust world — bottom left */}
      <Planet
        size={62}
        ringSize={118}
        gradient="radial-gradient(circle at 32% 30%, #fed7aa 0%, #fb923c 22%, #ea580c 42%, #7c2d12 72%, #1c0a04 100%)"
        halo="rgba(251,146,60,0.32)"
        className="absolute hidden md:block will-change-transform"
        style={{ bottom: "14%", left: "5%", transform: `translate3d(${parallax.x * 12}px, ${parallax.y * 9}px, 0)` }}
      />
      {/* Ice world — mid left */}
      <Planet
        size={44}
        ringSize={84}
        gradient="radial-gradient(circle at 30% 28%, #e0f2fe 0%, #7dd3fc 24%, #0ea5e9 44%, #0c4a6e 74%, #020617 100%)"
        halo="rgba(125,211,252,0.32)"
        className="absolute hidden lg:block will-change-transform"
        style={{ top: "38%", left: "10%", transform: `translate3d(${parallax.x * -6}px, ${parallax.y * 5}px, 0)` }}
      />

      {/* Ships — busy trade lanes */}
      <Spaceship top="13%" duration={32} delay={1} scale={1} />
      <Spaceship top="21%" duration={46} delay={7} scale={0.62} reverse />
      <Spaceship top="48%" duration={52} delay={12} scale={0.82} />
      <Spaceship top="62%" duration={40} delay={19} scale={0.7} reverse />
      <Spaceship top="76%" duration={44} delay={26} scale={0.9} />
      <Spaceship top="86%" duration={58} delay={34} scale={0.58} reverse />
    </div>
  );
}
