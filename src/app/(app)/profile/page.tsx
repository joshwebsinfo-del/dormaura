"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader, NeonBadge } from "@/components/ui/glass";
import {
  User, Camera, Edit3, Save, X, LogOut, MapPin, Phone,
  Wrench, ShoppingBag, ChevronRight, Moon, Zap, Crown
} from "lucide-react";
import { getMoodEmoji, getAvailabilityColor, getAvailabilityLabel } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { AvailabilityStatus, MoodStatus } from "@/types";

const AVAILABILITY_OPTIONS: { status: AvailabilityStatus; label: string; emoji: string }[] = [
  { status: "in_room", label: "In Room", emoji: "🏠" },
  { status: "available", label: "Available", emoji: "✅" },
  { status: "busy", label: "Busy", emoji: "⛔" },
  { status: "away", label: "Away", emoji: "🚶" },
  { status: "sleeping", label: "Sleeping", emoji: "😴" },
];

export default function ProfilePage() {
  const { user, setUser, isPremium } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    bio: user?.bio || "",
    phone: user?.phone || "",
  });
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ full_name: form.full_name, bio: form.bio, phone: form.phone })
        .eq("id", user.id);
      if (error) throw error;
      setUser({ ...user, ...form });
      setEditing(false);
      toast.success("Profile updated! ✨");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvailabilityChange = async (status: AvailabilityStatus) => {
    if (!user) return;
    await supabase.from("users").update({ availability_status: status }).eq("id", user.id);
    setUser({ ...user, availability_status: status });
    toast.success(`Status set to ${getAvailabilityLabel(status)}`);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const filename = `${user.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filename, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed: " + uploadError.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filename);
    await supabase.from("users").update({ profile_photo: publicUrl }).eq("id", user.id);
    setUser({ ...user, profile_photo: publicUrl });
    toast.success("Photo updated! 📸");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/auth");
  };

  if (!user) return null;

  return (
    <div className="space-y-4 pt-2 pb-24">
      <PageHeader title="Profile" subtitle="Your identity in the nest" icon={<User size={18} />}
        actions={
          <button onClick={handleSignOut}
            className="w-8 h-8 glass-sm rounded-xl flex items-center justify-center text-rose-400/60 hover:text-rose-400 hover:bg-rose-400/10 transition-all">
            <LogOut size={15} />
          </button>
        }
      />

      {/* Hero profile card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass rounded-2xl p-6 relative overflow-hidden transition-all duration-300 ${
          isPremium ? "border-yellow-500/30 shadow-[0_0_30px_rgba(250,204,21,0.15)] bg-gradient-to-br from-yellow-500/05 to-transparent" : ""
        }`}
      >
        {/* Subtle gradient accent */}
        <div className={`absolute top-0 left-0 right-0 h-1 transition-all ${
          isPremium ? "bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-600" : "bg-gradient-to-r from-cyan-500/50 via-violet-500/50 to-blue-500/50"
        }`} />

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${
              isPremium ? "border-yellow-400/40 shadow-[0_0_10px_rgba(250,204,21,0.3)]" : "border-white/10"
            }`}>
              {user.profile_photo ? (
                <Image src={user.profile_photo} alt={user.full_name} width={80} height={80} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl font-display"
                  style={{ background: isPremium ? "linear-gradient(135deg, rgba(250,204,21,0.4), rgba(217,119,6,0.4))" : "linear-gradient(135deg, rgba(0,245,255,0.3), rgba(124,58,237,0.3))" }}>
                  {user.full_name?.charAt(0)}
                </div>
              )}
            </div>
            {/* Camera button */}
            <button onClick={() => fileRef.current?.click()}
              className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-xl flex items-center justify-center text-black shadow-lg transition-colors ${
                isPremium ? "bg-yellow-400 hover:bg-yellow-300" : "bg-cyan-500 hover:bg-cyan-400"
              }`}>
              <Camera size={13} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="input-glass text-base font-bold mb-1 w-full" />
            ) : (
              <h2 className="text-white font-bold font-display text-xl flex items-center gap-1.5 flex-wrap">
                {user.full_name}
                {isPremium && <Crown size={16} className="text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)] flex-shrink-0 animate-pulse" />}
              </h2>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <NeonBadge color={user.role === "admin" ? "cyan" : user.role === "moderator" ? "violet" : "blue"}>
                {user.role}
              </NeonBadge>
              {isPremium && (
                <NeonBadge color="amber">★ Gold Member</NeonBadge>
              )}
              <div className="flex items-center gap-1.5">
                <MapPin size={11} className="text-white/30" />
                <span className="text-white/40 text-xs">Room {user.room_number}</span>
              </div>
              {user.mood_status && (
                <span className="text-sm">{getMoodEmoji(user.mood_status)}</span>
              )}
            </div>
          </div>

          <button onClick={() => editing ? handleSave() : setEditing(true)} disabled={loading}
            className="w-8 h-8 glass-sm rounded-xl flex items-center justify-center text-white/50 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all flex-shrink-0">
            {editing ? <Save size={15} /> : <Edit3 size={15} />}
          </button>
        </div>

        {/* Bio */}
        <div className="mt-4">
          {editing ? (
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Write a bio..." rows={2} className="w-full input-glass text-sm resize-none" />
          ) : (
            <p className="text-white/50 text-sm">{user.bio || "No bio yet. Add one to let others know you!"}</p>
          )}
        </div>

        {/* Phone */}
        {editing && (
          <div className="mt-2 flex items-center gap-2">
            <Phone size={14} className="text-white/30" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone number" className="flex-1 input-glass text-sm" />
          </div>
        )}

        {editing && (
          <div className="flex gap-2 mt-3">
            <motion.button onClick={handleSave} disabled={loading} whileTap={{ scale: 0.97 }}
              className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5">
              <Save size={14} /> {loading ? "Saving..." : "Save Changes"}
            </motion.button>
            <button onClick={() => setEditing(false)}
              className="px-4 py-2.5 glass-sm rounded-xl text-white/60 hover:text-white text-sm transition-colors">
              Cancel
            </button>
          </div>
        )}
      </motion.div>

      {/* Premium upgrade card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        onClick={() => router.push("/premium")}
        className={`cursor-pointer rounded-2xl p-4 border flex items-center justify-between transition-all duration-300 ${
          isPremium 
            ? "border-yellow-500/30 bg-yellow-500/05 hover:bg-yellow-500/10 shadow-[0_0_20px_rgba(250,204,21,0.08)]" 
            : "border-cyan-500/20 bg-cyan-500/05 hover:bg-cyan-500/10 hover:border-cyan-500/30"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isPremium ? "bg-gradient-to-br from-yellow-400 to-amber-500" : "bg-cyan-500/10 text-cyan-400"
          }`}>
            <Crown size={18} className={isPremium ? "text-black" : ""} />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm tracking-tight flex items-center gap-1.5">
              {isPremium ? "DormAura Gold Active" : "Get DormAura Gold"}
              {!isPremium && <span className="text-[9px] font-extrabold bg-cyan-500 text-black px-1.5 py-0.5 rounded">NEW</span>}
            </h4>
            <p className="text-white/40 text-[10px] mt-0.5">
              {isPremium ? "Manage custom cosmic themes & timer" : "Unlock neon badges, premium themes & custom DMs"}
            </p>
          </div>
        </div>
        <ChevronRight size={16} className="text-white/20" />
      </motion.div>

      {/* ============================================================
          PWA INSTALL APP SYSTEM (Reactive Banner & Installer)
          ============================================================ */}
      <PWAInstallSection />

      {/* Availability */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(user.availability_status)}`} />
          <p className="text-white font-semibold text-sm">Availability</p>
          <span className="text-white/40 text-xs ml-auto">{getAvailabilityLabel(user.availability_status)}</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {AVAILABILITY_OPTIONS.map((opt) => (
            <button key={opt.status} onClick={() => handleAvailabilityChange(opt.status)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                user.availability_status === opt.status
                  ? "border-cyan-500/30 bg-cyan-500/10"
                  : "border-white/08 hover:border-white/15 hover:bg-white/05"
              }`}>
              <span className="text-lg">{opt.emoji}</span>
              <span className="text-white/40 text-[9px] font-medium text-center leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Quick links */}
      {[
        { label: "Maintenance Requests", icon: Wrench, href: "/maintenance", color: "text-orange-400" },
        { label: "My Listings", icon: ShoppingBag, href: "/marketplace", color: "text-violet-400" },
      ].map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.05 }}
            onClick={() => router.push(item.href)}
            className="w-full glass rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon size={18} className={item.color} />
              <span className="text-white/70 text-sm font-medium">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-white/20" />
          </motion.button>
        );
      })}

      {/* Sign out */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={handleSignOut}
        className="w-full py-3 rounded-xl text-rose-400/80 hover:text-rose-400 border border-rose-500/15 hover:border-rose-500/30 hover:bg-rose-500/05 transition-all text-sm font-medium flex items-center justify-center gap-2"
      >
        <LogOut size={15} />
        Sign Out
      </motion.button>
    </div>
  );
}

function PWAInstallSection() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect standalone mode
    if (typeof window !== "undefined") {
      const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches 
        || (window.navigator as any).standalone;
      setIsStandalone(!!isStandaloneMode);

      // Detect iOS platform
      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      toast.success("Welcome to DormAura Native! 📱✨");
    }
  };

  if (isStandalone) {
    return (
      <div className="glass rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/05 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <Zap size={16} />
        </div>
        <div>
          <h4 className="text-white font-bold text-xs">Installed & Running Native</h4>
          <p className="text-white/40 text-[9px] mt-0.5">You are already using the ultimate, high-speed standalone app.</p>
        </div>
      </div>
    );
  }

  if (isIOS) {
    return (
      <div className="glass rounded-2xl p-4 border border-violet-500/20 bg-violet-500/05 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
            <Zap size={16} />
          </div>
          <div>
            <h4 className="text-white font-bold text-xs">Install DormAura on iPhone</h4>
            <p className="text-white/40 text-[9px] mt-0.5">Follow these 2 simple steps to add it to your Home Screen:</p>
          </div>
        </div>
        <div className="pl-11 text-[10px] text-white/60 space-y-1">
          <p>1. Tap the Share button <span className="bg-white/10 px-1.5 py-0.5 rounded text-white text-[11px] font-bold">📤</span> at the bottom of your Safari browser.</p>
          <p>2. Scroll down and tap <span className="text-violet-400 font-bold">Add to Home Screen 📱</span>.</p>
        </div>
      </div>
    );
  }

  if (!deferredPrompt) {
    return (
      <div className="glass rounded-2xl p-4 border border-white/05 flex items-center gap-3 opacity-60">
        <div className="w-8 h-8 rounded-xl bg-white/10 text-white/50 flex items-center justify-center">
          <Zap size={16} />
        </div>
        <div>
          <h4 className="text-white font-bold text-xs">PWA Install Available</h4>
          <p className="text-white/40 text-[9px] mt-0.5">Use Chrome, Edge, or Samsung Internet to download as a native app.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-2xl p-4 border border-cyan-500/30 bg-gradient-to-r from-cyan-500/05 to-transparent flex items-center justify-between shadow-[0_0_20px_rgba(6,182,212,0.05)]"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center animate-pulse">
          <Zap size={18} />
        </div>
        <div>
          <h4 className="text-white font-bold text-xs tracking-tight">Install Standalone App</h4>
          <p className="text-white/40 text-[9px] mt-0.5">Get high-speed native app experience & notifications</p>
        </div>
      </div>
      <button
        onClick={handleInstallClick}
        className="px-4 py-2 bg-cyan-500 text-black rounded-xl text-xs font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:bg-cyan-400 transition-colors"
      >
        Install App
      </button>
    </motion.div>
  );
}
