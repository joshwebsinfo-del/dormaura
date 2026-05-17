"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

export function AuroraBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen" style={{ background: "#050508" }}>
      {/* Mesh gradient overlays */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(0,245,255,0.05) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 80% 80%, rgba(124,58,237,0.06) 0%, transparent 60%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
  animate = true,
  delay = 0,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
  onClick?: () => void;
}) {
  const content = (
    <div
      className={`glass card-hover ${className}`}
      style={{
        boxShadow:
          "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      onClick={onClick}
      className={`glass card-hover cursor-pointer ${className}`}
      style={{
        boxShadow:
          "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {children}
    </motion.div>
  );
}

export function NeonBadge({
  children,
  color = "cyan",
  className = "",
}: {
  children: React.ReactNode;
  color?: "cyan" | "violet" | "blue" | "rose" | "amber";
  className?: string;
}) {
  const colors = {
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/30",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]} ${className}`}
    >
      {children}
    </span>
  );
}

export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`shimmer rounded-xl ${className}`} />
  );
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between mb-6"
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl glass-sm flex items-center justify-center text-cyan-400">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-display font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="text-white/40 text-sm mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  );
}
