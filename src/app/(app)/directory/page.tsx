"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, NeonBadge, LoadingSkeleton } from "@/components/ui/glass";
import { User, Search, DoorOpen, MapPin, MessageSquare } from "lucide-react";
import { getMoodEmoji, getAvailabilityColor, getAvailabilityLabel } from "@/lib/utils";
import { useNotificationStore } from "@/store";
import Image from "next/image";
import Link from "next/link";
import type { User as UserType } from "@/types";
import toast from "react-hot-toast";

export default function DirectoryPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const supabase = createClient();

  const { data: students, isLoading } = useQuery({
    queryKey: ["directory"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("*")
        .order("room_number");
      return data as UserType[];
    },
  });

  const filtered = students?.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.room_number?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 pt-2">
      <PageHeader
        title="Directory"
        subtitle={`${students?.length || 78} residents`}
        icon={<User size={18} />}
      />

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          id="directory-search"
          type="text"
          placeholder="Search by name or room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full input-glass pl-10"
        />
      </div>

      {/* Students list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass rounded-xl p-4 flex items-center gap-3">
              <LoadingSkeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <LoadingSkeleton className="h-3 w-36" />
                <LoadingSkeleton className="h-2 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-2 pb-4">
          {filtered.map((student, i) => (
            <StudentCard
              key={student.id}
              student={student}
              index={i}
              currentUser={user}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-white/60">No students found</p>
        </div>
      )}
    </div>
  );
}

function StudentCard({
  student,
  index,
  currentUser,
}: {
  student: UserType;
  index: number;
  currentUser: UserType | null;
}) {
  const [knocking, setKnocking] = useState(false);
  const supabase = createClient();
  const { setKnockNotification } = useNotificationStore();

  const handleKnock = async () => {
    if (!currentUser || knocking) return;
    setKnocking(true);

    // Send knock via Supabase Realtime broadcast
    const channel = supabase.channel(`knock-${student.id}`);
    channel.send({
      type: "broadcast",
      event: "knock",
      payload: {
        from_user_id: currentUser.id,
        from_name: currentUser.full_name,
        room_number: student.room_number,
      },
    });

    // Also insert notification record (optional)
    await supabase.from("knock_notifications").insert({
      from_user_id: currentUser.id,
      to_user_id: student.id,
      room_number: student.room_number,
    }).then(async () => {
      await supabase.from("notifications").insert({
        user_id: student.id,
        actor_id: currentUser.id,
        type: "knock",
        title: "Knocked on your door! 🚪",
        content: `${currentUser.full_name} is knocking on Room ${student.room_number}`,
        link: "/directory"
      });
    });

    toast.success(`Knocked on Room ${student.room_number}! 🚪`);

    setTimeout(() => setKnocking(false), 3000);
  };

  const isMe = student.id === currentUser?.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.6) }}
      className="glass rounded-xl p-4 flex items-center gap-3"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
          {student.profile_photo ? (
            <Image src={student.profile_photo} alt={student.full_name} width={48} height={48} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold"
              style={{ background: "linear-gradient(135deg, rgba(0,245,255,0.25), rgba(124,58,237,0.25))" }}>
              {student.full_name?.charAt(0)}
            </div>
          )}
        </div>
        {/* Status dot */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#050508] ${getAvailabilityColor(student.availability_status)}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-white font-semibold text-sm truncate">{student.full_name}</p>
          {student.mood_status && (
            <span className="text-sm">{getMoodEmoji(student.mood_status)}</span>
          )}
          {student.role !== "student" && (
            <NeonBadge color={student.role === "admin" ? "cyan" : "violet"}>
              {student.role}
            </NeonBadge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <MapPin size={11} className="text-white/30" />
          <span className="text-white/40 text-xs">Room {student.room_number}</span>
          <span className="text-white/20 text-xs">·</span>
          <span className={`text-xs ${getAvailabilityColor(student.availability_status).replace("bg-", "text-")}`}>
            {getAvailabilityLabel(student.availability_status)}
          </span>
        </div>
        {student.bio && (
          <p className="text-white/30 text-xs mt-0.5 truncate">{student.bio}</p>
        )}
      </div>

      {/* Actions */}
      {!isMe && (
        <div className="flex gap-2 flex-shrink-0">
          <Link href={`/chats?userId=${student.id}`}>
            <motion.button
              whileTap={{ scale: 0.85 }}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:border-cyan-500/30 text-white/40 hover:text-cyan-400 hover:bg-cyan-500/10"
              title="Chat"
            >
              <MessageSquare size={16} />
            </motion.button>
          </Link>
          <motion.button
            id={`knock-${student.id}`}
            onClick={handleKnock}
            disabled={knocking}
            whileTap={{ scale: 0.85 }}
            animate={knocking ? { scale: [1, 1.1, 1], rotate: [-5, 5, -5, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: knocking
                ? "rgba(0,245,255,0.2)"
                : "rgba(255,255,255,0.06)",
              border: knocking
                ? "1px solid rgba(0,245,255,0.4)"
                : "1px solid rgba(255,255,255,0.08)",
              boxShadow: knocking ? "0 0 12px rgba(0,245,255,0.3)" : "none",
            }}
          >
            <DoorOpen size={16} className={knocking ? "text-cyan-400" : "text-white/40"} />
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
