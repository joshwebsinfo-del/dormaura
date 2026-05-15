"use client";

import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useState } from "react";
import toast from "react-hot-toast";
import type { MoodStatus } from "@/types";

const moods: { status: MoodStatus; emoji: string; label: string; color: string }[] = [
  { status: "studying", emoji: "📚", label: "Studying", color: "rgba(0,245,255,0.15)" },
  { status: "sleeping", emoji: "😴", label: "Sleeping", color: "rgba(99,102,241,0.15)" },
  { status: "gaming", emoji: "🎮", label: "Gaming", color: "rgba(34,197,94,0.15)" },
  { status: "music", emoji: "🎵", label: "Music", color: "rgba(251,146,60,0.15)" },
  { status: "chill", emoji: "☁️", label: "Chill", color: "rgba(148,163,184,0.15)" },
  { status: "prayer", emoji: "🙏", label: "Prayer", color: "rgba(168,85,247,0.15)" },
];

export function MoodBar() {
  const { user, setUser } = useAuthStore();
  const supabase = createClient();

  const handleMoodSelect = async (mood: MoodStatus) => {
    if (!user) return;
    const newMood = user.mood_status === mood ? null : mood;

    const { error } = await supabase
      .from("users")
      .update({ mood_status: newMood })
      .eq("id", user.id);

    if (!error) {
      setUser({ ...user, mood_status: newMood });
      if (newMood) toast.success(`Mood set to ${moods.find(m => m.status === newMood)?.label}!`);
    }
  };

  return (
    <div className="overflow-x-auto -mx-1 px-1 custom-scrollbar">
      <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
        {moods.map((mood) => (
          <motion.button
            key={mood.status}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleMoodSelect(mood.status)}
            id={`mood-${mood.status}`}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all duration-200"
            style={{
              background:
                user?.mood_status === mood.status ? mood.color : "rgba(255,255,255,0.04)",
              borderColor:
                user?.mood_status === mood.status
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.06)",
              transform: user?.mood_status === mood.status ? "translateY(-2px)" : "none",
            }}
          >
            <span className="text-xl">{mood.emoji}</span>
            <span className="text-white/50 text-[10px] font-medium whitespace-nowrap">
              {mood.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
