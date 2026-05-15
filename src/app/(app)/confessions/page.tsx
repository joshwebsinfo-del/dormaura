"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, NeonBadge, LoadingSkeleton } from "@/components/ui/glass";
import { MessageSquareQuote, Plus, X, Lock } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import type { Confession } from "@/types";
import toast from "react-hot-toast";

export default function ConfessionsPage() {
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: confessions, isLoading } = useQuery({
    queryKey: ["confessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("confessions")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false });
      return data as Confession[];
    },
  });

  // Pending confessions (admin only)
  const { data: pending } = useQuery({
    queryKey: ["confessions-pending"],
    queryFn: async () => {
      if (user?.role !== "admin" && user?.role !== "moderator") return [];
      const { data } = await supabase
        .from("confessions")
        .select("*")
        .eq("approved", false)
        .order("created_at", { ascending: false });
      return data as Confession[];
    },
    enabled: user?.role === "admin" || user?.role === "moderator",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("confessions").insert({
        content: content.trim(),
        approved: false,
      });
      if (error) throw error;
      setContent("");
      setShowCreate(false);
      toast.success("Confession submitted anonymously! ✨ Awaiting approval.", { duration: 5000 });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    await supabase.from("confessions").update({ approved: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["confessions"] });
    queryClient.invalidateQueries({ queryKey: ["confessions-pending"] });
    toast.success("Confession approved!");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("confessions").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["confessions"] });
    queryClient.invalidateQueries({ queryKey: ["confessions-pending"] });
    toast.success("Confession removed");
  };

  const isAdmin = user?.role === "admin" || user?.role === "moderator";

  return (
    <div className="space-y-4 pt-2">
      <PageHeader
        title="Confessions"
        subtitle="Anonymous thoughts from the nest"
        icon={<MessageSquareQuote size={18} />}
        actions={
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)" }}
          >
            {showCreate ? <X size={14} className="text-white/60" /> : <Plus size={14} className="text-rose-400" />}
            <span className="text-white/80">{showCreate ? "Cancel" : "Confess"}</span>
          </motion.button>
        }
      />

      {/* Privacy notice */}
      <div className="glass-sm rounded-xl p-3 flex items-start gap-2.5">
        <Lock size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <p className="text-white/40 text-xs leading-relaxed">
          Confessions are completely anonymous. Your identity is never revealed.
          All submissions are reviewed before publishing.
        </p>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-2xl p-4 space-y-3 overflow-hidden"
          >
            <textarea
              id="confession-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your anonymous confession here... 🤫"
              rows={5}
              className="w-full input-glass text-sm resize-none"
              required
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              <span className="text-white/30 text-xs">{content.length}/500</span>
              <motion.button type="submit" disabled={loading || !content.trim()} whileTap={{ scale: 0.97 }}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
                style={{ background: "linear-gradient(135deg, rgba(244,63,94,0.3), rgba(168,85,247,0.3))", border: "1px solid rgba(244,63,94,0.3)", color: "#f9a8d4" }}>
                {loading ? "Submitting..." : "Submit Anonymously"}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Pending (admin) */}
      {isAdmin && pending && pending.length > 0 && (
        <div>
          <p className="text-white/30 text-xs font-medium uppercase tracking-wider mb-3">
            Pending Review ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map((c, i) => (
              <ConfessionCard
                key={c.id} confession={c} index={i}
                isAdmin={true} onApprove={handleApprove} onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Approved confessions */}
      <div>
        {isAdmin && <p className="text-white/30 text-xs font-medium uppercase tracking-wider mb-3">Published</p>}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <LoadingSkeleton key={i} className="h-24" />)}</div>
        ) : confessions && confessions.length > 0 ? (
          <div className="space-y-3 pb-4">
            {confessions.map((c, i) => (
              <ConfessionCard
                key={c.id} confession={c} index={i}
                isAdmin={isAdmin} onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🤫</div>
            <p className="text-white/60">No confessions yet</p>
            <p className="text-white/30 text-sm mt-1">Be the first to share anonymously</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfessionCard({
  confession, index, isAdmin, onApprove, onDelete,
}: {
  confession: Confession;
  index: number;
  isAdmin?: boolean;
  onApprove?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const confessionColors = [
    "rgba(244,63,94,0.06)",
    "rgba(168,85,247,0.06)",
    "rgba(0,245,255,0.06)",
    "rgba(251,146,60,0.06)",
    "rgba(34,197,94,0.06)",
  ];
  const bg = confessionColors[index % confessionColors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-2xl p-4 relative"
      style={{ background: bg }}
    >
      {!confession.approved && (
        <div className="absolute top-3 right-3">
          <NeonBadge color="amber">Pending</NeonBadge>
        </div>
      )}
      <p className="text-white/80 text-sm leading-relaxed italic">
        &ldquo;{confession.content}&rdquo;
      </p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-white/25 text-xs">
          Anonymous · {formatTimeAgo(confession.created_at)}
        </span>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {!confession.approved && onApprove && (
              <button onClick={() => onApprove(confession.id)}
                className="text-[10px] px-2 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/25 transition-all">
                Approve
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(confession.id)}
                className="text-[10px] px-2 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/25 hover:bg-rose-500/25 transition-all">
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
