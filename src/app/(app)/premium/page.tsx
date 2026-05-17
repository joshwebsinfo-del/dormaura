"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store";
import { PageHeader, NeonBadge } from "@/components/ui/glass";
import {
  Zap, Star, ShieldCheck, Flame, Palette, Sparkles, Check, Crown, ArrowRight, Gift, Lock
} from "lucide-react";
import toast from "react-hot-toast";

const PREMIUM_THEMES = [
  { id: "gold", name: "Cyber Gold", primary: "#facc15", secondary: "#eab308", glow: "rgba(250,204,21,0.4)" },
  { id: "emerald", name: "Emerald Oasis", primary: "#10b981", secondary: "#059669", glow: "rgba(16,185,129,0.4)" },
  { id: "midnight", name: "Midnight Velvet", primary: "#ec4899", secondary: "#d946ef", glow: "rgba(236,72,153,0.4)" },
  { id: "ice", name: "Glacial Neon", primary: "#06b6d4", secondary: "#3b82f6", glow: "rgba(6,182,212,0.4)" }
];

export default function PremiumPage() {
  const { isPremium, setPremium, user } = useAuthStore();
  const [selectedTheme, setSelectedTheme] = useState("gold");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Trigger canvas confetti on premium status change
  useEffect(() => {
    if (isPremium) {
      triggerConfetti();
    }
  }, [isPremium]);

  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ["#facc15", "#fb923c", "#38bdf8", "#c084fc", "#f43f5e", "#4ade80"];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 100,
        r: Math.random() * 6 + 4,
        d: Math.random() * canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0,
        speed: Math.random() * 3 + 2,
        angle: Math.random() * Math.PI - Math.PI / 2
      });
    }

    let animationFrame: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y -= p.speed;
        p.x += Math.sin(p.angle) * 0.5;

        if (p.y > -20) {
          active = true;
        }

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      if (active) {
        animationFrame = requestAnimationFrame(draw);
      }
    };

    draw();
  };

  const handleUpgrade = () => {
    setIsUpgrading(true);
    setTimeout(() => {
      setPremium(true);
      setIsUpgrading(false);
      toast.success("Welcome to DormAura Gold! 👑✨");
    }, 1500);
  };

  const handleDowngrade = () => {
    setPremium(false);
    toast.success("Premium status reset.");
  };

  return (
    <div className="space-y-6 pt-2 pb-24 relative overflow-hidden min-h-[90vh]">
      {/* Background canvas for confetti */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50 w-full h-full" />

      <PageHeader 
        title="DormAura Gold" 
        subtitle="Unleash the ultimate boarding experience" 
        icon={<Crown size={18} className="text-yellow-400" />}
      />

      <AnimatePresence mode="wait">
        {!isPremium ? (
          <motion.div
            key="upgrade-screen"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Premium Interactive Hero Card */}
            <div className="relative rounded-3xl p-6 overflow-hidden border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-amber-500/05 to-transparent shadow-[0_0_50px_rgba(250,204,21,0.08)]">
              {/* Gold Ambient Orbs */}
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-yellow-400/10 blur-3xl animate-pulse" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-amber-600/10 blur-3xl" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-yellow-400 to-amber-500 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                  <Crown size={24} className="text-black" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-display font-bold text-xl tracking-tight">DormAura Gold</h3>
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-yellow-400 text-black px-1.5 py-0.5 rounded-md">PRO</span>
                  </div>
                  <p className="text-yellow-400/70 text-xs font-semibold">Elevate your campus status</p>
                </div>
              </div>

              <p className="text-white/70 text-sm leading-relaxed mb-6">
                Upgrade to the premium community tier and unlock unmatched aesthetic features, priority tools, and custom cosmetics designed to make you stand out in the nest.
              </p>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-white font-extrabold text-3xl tracking-tight font-display">$2.99</span>
                <span className="text-white/40 text-xs font-medium">/ month</span>
                <span className="text-[10px] ml-auto font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-lg">Cancel Anytime</span>
              </div>

              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full relative py-3.5 rounded-2xl font-bold text-black flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] shadow-[0_0_30px_rgba(250,204,21,0.3)] hover:shadow-[0_0_40px_rgba(250,204,21,0.5)] overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #facc15 0%, #eab308 50%, #ca8a04 100%)",
                }}
              >
                {isUpgrading ? (
                  <span className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                ) : (
                  <>
                    Upgrade to Gold <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>

            {/* Premium Perks Grid */}
            <div className="space-y-3">
              <h4 className="text-white/40 text-xs font-bold uppercase tracking-widest pl-1">Unlocked Privileges</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    icon: ShieldCheck,
                    color: "text-yellow-400 bg-yellow-400/10",
                    title: "Gold Identity Shield",
                    desc: "Stunning yellow neon glow on your cards and exclusive gold user crown across the entire feed."
                  },
                  {
                    icon: Palette,
                    color: "text-emerald-400 bg-emerald-400/10",
                    title: "Cosmic Themes",
                    desc: "Unlock beautiful cyberpunk background skins & glowing neon colors throughout the app."
                  },
                  {
                    icon: Flame,
                    color: "text-rose-400 bg-rose-400/10",
                    title: "Bypass Whisper Constraints",
                    desc: "Set fully custom vanishing message timers (up to 24 hours) for ultimate stealth chats."
                  },
                  {
                    icon: Sparkles,
                    color: "text-indigo-400 bg-indigo-400/10",
                    title: "Cosmic Mood Badges",
                    desc: "Express yourself with animated custom statuses, customized emojis, and custom bios."
                  },
                  {
                    icon: Crown,
                    color: "text-cyan-400 bg-cyan-400/10",
                    title: "Bumps & Priority board",
                    desc: "Your marketplace items and borrowing requests get pinned with gold outlines, getting resolved 2x faster."
                  },
                  {
                    icon: Gift,
                    color: "text-purple-400 bg-purple-400/10",
                    title: "Beta Access",
                    desc: "Be the first to join upcoming rooms, direct video chat, and private custom chatrooms."
                  }
                ].map((perk, idx) => {
                  const Icon = perk.icon;
                  return (
                    <motion.div
                      key={perk.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass p-4 flex gap-3.5 border border-white/[0.03] hover:border-white/10 transition-all duration-200"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${perk.color}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <h5 className="text-white font-bold text-sm">{perk.title}</h5>
                        <p className="text-white/40 text-[11px] leading-relaxed mt-0.5">{perk.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="premium-active-screen"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Active Membership Banner */}
            <div className="relative rounded-3xl p-6 overflow-hidden border border-yellow-500 bg-black/40 shadow-[0_0_50px_rgba(250,204,21,0.15)] text-center space-y-4">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-600" />
              
              <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-yellow-400 to-amber-500 shadow-[0_0_25px_rgba(250,204,21,0.5)]">
                <Crown size={32} className="text-black animate-bounce" />
              </div>

              <div>
                <h3 className="text-white font-display font-extrabold text-2xl tracking-tight">DormAura Gold Active</h3>
                <p className="text-yellow-400/80 text-xs font-semibold mt-1">Thank you for supporting the platform! 💛</p>
              </div>

              <div className="flex justify-center gap-1.5">
                <NeonBadge color="amber">★ ACTIVE SUBSCRIBER</NeonBadge>
                <NeonBadge color="cyan">👑 PREMIUM PASS</NeonBadge>
              </div>
            </div>

            {/* Custom Theme Selector (Premium Feature) */}
            <div className="glass p-5 border border-white/[0.04] space-y-4">
              <div className="flex items-center gap-2">
                <Palette size={18} className="text-yellow-400" />
                <h4 className="text-white font-bold text-sm">Select Cosmic Accent Theme</h4>
              </div>
              <p className="text-white/40 text-[11px] leading-relaxed">
                As a Gold Member, select your signature glowing accent colors that reflect on your profile dashboard and buttons:
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {PREMIUM_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setSelectedTheme(theme.id);
                      toast.success(`Theme set to ${theme.name}! 🎨`);
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      selectedTheme === theme.id
                        ? "border-yellow-400/40 bg-yellow-400/05 shadow-[0_0_15px_rgba(250,204,21,0.1)]"
                        : "border-white/05 hover:border-white/10 hover:bg-white/05"
                    }`}
                  >
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center border border-white/20"
                      style={{
                        background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                        boxShadow: `0 0 10px ${theme.glow}`
                      }}
                    >
                      {selectedTheme === theme.id && <Check size={10} className="text-black font-extrabold" />}
                    </div>
                    <span className="text-white/70 text-xs font-medium">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Stealth Expiry Timer Option */}
            <div className="glass p-5 border border-white/[0.04] space-y-4">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-yellow-400" />
                <h4 className="text-white font-bold text-sm">Hyper-Bypass Whisper Expiration</h4>
              </div>
              <p className="text-white/40 text-[11px] leading-relaxed">
                Your direct messages now allow premium custom whispers. You can select standard expirations or set the ultimate stealth timer up to 24 hours:
              </p>

              <div className="flex gap-2 flex-wrap">
                {["5s", "10s", "1m", "5m", "1h", "12h", "24h"].map((t) => (
                  <span key={t} className="px-3 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 text-xs font-semibold border border-yellow-400/20">
                    {t} Expiry
                  </span>
                ))}
              </div>
            </div>

            {/* Manage Membership */}
            <button
              onClick={handleDowngrade}
              className="w-full py-3 rounded-xl text-white/40 hover:text-white border border-white/08 hover:border-white/20 hover:bg-white/05 transition-all text-xs font-medium"
            >
              Downgrade / Reset Premium Status
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
