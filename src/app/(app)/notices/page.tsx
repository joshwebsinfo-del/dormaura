"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, NeonBadge, LoadingSkeleton } from "@/components/ui/glass";
import { Bell, Pin, Plus, X } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import type { Notice } from "@/types";
import toast from "react-hot-toast";

export default function NoticesPage() {
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: notices, isLoading } = useQuery({
    queryKey: ["notices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notices")
        .select("*, creator:users!created_by(*)")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return data as Notice[];
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("notices").insert({
        title: title.trim(),
        content: content.trim(),
        created_by: user.id,
        pinned: false,
      });
      if (error) throw error;
      setTitle("");
      setContent("");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      toast.success("Notice posted!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "moderator";

  return (
    <div className="space-y-4 pt-2">
      <PageHeader
        title="Notice Board"
        subtitle="Important announcements & updates"
        icon={<Bell size={18} />}
        actions={
          isAdmin && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: "linear-gradient(135deg, rgba(0,245,255,0.15), rgba(124,58,237,0.15))", border: "1px solid rgba(0,245,255,0.2)" }}
            >
              {showCreate ? <X size={14} className="text-white/60" /> : <Plus size={14} className="text-cyan-400" />}
              <span className="text-white/80">{showCreate ? "Cancel" : "Post"}</span>
            </motion.button>
          )
        }
      />

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.form
            onSubmit={handleCreate}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-2xl p-4 space-y-3 overflow-hidden"
          >
            <input
              id="notice-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notice title..."
              className="w-full input-glass text-sm font-semibold"
              required
            />
            <textarea
              id="notice-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Notice content..."
              rows={4}
              className="w-full input-glass text-sm resize-none"
              required
            />
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full" />
              ) : "Post Notice"}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Notices list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <LoadingSkeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : notices && notices.length > 0 ? (
        <div className="space-y-3">
          {notices.map((notice, i) => (
            <NoticeCard key={notice.id} notice={notice} index={i} isAdmin={isAdmin} />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-white/60">No notices yet</p>
          <p className="text-white/30 text-sm mt-1">Check back later for updates</p>
        </div>
      )}
    </div>
  );
}

function NoticeCard({ notice, index, isAdmin }: { notice: Notice; index: number; isAdmin?: boolean }) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const handlePin = async () => {
    await supabase.from("notices").update({ pinned: !notice.pinned }).eq("id", notice.id);
    queryClient.invalidateQueries({ queryKey: ["notices"] });
  };

  const handleDelete = async () => {
    await supabase.from("notices").delete().eq("id", notice.id);
    queryClient.invalidateQueries({ queryKey: ["notices"] });
    toast.success("Notice removed");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="glass rounded-2xl p-4 relative overflow-hidden"
      style={{
        borderColor: notice.pinned ? "rgba(250,204,21,0.25)" : undefined,
        boxShadow: notice.pinned ? "0 0 20px rgba(250,204,21,0.08)" : undefined,
      }}
    >
      {/* Pinned accent */}
      {notice.pinned && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400/50 via-yellow-400 to-yellow-400/50" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {notice.pinned && (
              <NeonBadge color="amber">
                <Pin size={10} /> Pinned
              </NeonBadge>
            )}
            <h3 className="text-white font-semibold text-sm">{notice.title}</h3>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">{notice.content}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-white/30 text-xs">
              By {notice.creator?.full_name || "Admin"}
            </span>
            <span className="text-white/20 text-xs">·</span>
            <span className="text-white/30 text-xs">
              {formatTimeAgo(notice.created_at)}
            </span>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button onClick={handlePin}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${notice.pinned ? "text-yellow-400 bg-yellow-400/10" : "text-white/30 hover:text-white/60 hover:bg-white/10"}`}>
              <Pin size={13} />
            </button>
            <button onClick={handleDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-400/50 hover:text-rose-400 hover:bg-rose-400/10 transition-all">
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
