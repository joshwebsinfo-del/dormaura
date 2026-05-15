"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, LoadingSkeleton } from "@/components/ui/glass";
import { Star, Plus, X } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import type { Poll, PollOption } from "@/types";
import toast from "react-hot-toast";

export default function PollsPage() {
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: polls, isLoading } = useQuery({
    queryKey: ["polls"],
    queryFn: async () => {
      const { data } = await supabase
        .from("polls")
        .select("*, creator:users!created_by(*), options:poll_options(*)")
        .order("created_at", { ascending: false });
      return data as Poll[];
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || options.filter((o) => o.trim()).length < 2 || !user) return;
    setLoading(true);
    try {
      const { data: poll, error } = await supabase
        .from("polls")
        .insert({ question: question.trim(), created_by: user.id })
        .select()
        .single();
      if (error) throw error;

      const opts = options.filter((o) => o.trim()).map((o) => ({
        poll_id: poll.id,
        option_text: o.trim(),
        votes: 0,
      }));
      await supabase.from("poll_options").insert(opts);

      setQuestion("");
      setOptions(["", ""]);
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      toast.success("Poll created! 🗳️");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <PageHeader
        title="Polls"
        subtitle="Quick votes from the nest"
        icon={<Star size={18} />}
        actions={
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.25)" }}
          >
            {showCreate ? <X size={14} className="text-white/60" /> : <Plus size={14} className="text-yellow-400" />}
            <span className="text-white/80">{showCreate ? "Cancel" : "Create Poll"}</span>
          </motion.button>
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
              id="poll-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask the nest something... e.g. Football today?"
              className="w-full input-glass text-sm font-medium"
              required
            />
            <p className="text-white/40 text-xs">Options (min 2):</p>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opt}
                  onChange={(e) => {
                    const updated = [...options];
                    updated[i] = e.target.value;
                    setOptions(updated);
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 input-glass text-sm"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    className="w-10 h-10 rounded-xl glass-sm flex items-center justify-center text-rose-400/60 hover:text-rose-400 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button type="button" onClick={() => setOptions([...options, ""])}
                className="flex items-center gap-2 text-white/40 hover:text-white/70 text-xs transition-colors">
                <Plus size={13} /> Add Option
              </button>
            )}
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? "Creating..." : "Launch Poll 🗳️"}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Polls list */}
      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <LoadingSkeleton key={i} className="h-40" />)}</div>
      ) : polls && polls.length > 0 ? (
        <div className="space-y-4 pb-4">
          {polls.map((poll, i) => <PollCard key={poll.id} poll={poll} index={i} currentUserId={user?.id} />)}
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🗳️</div>
          <p className="text-white/60">No polls yet</p>
          <p className="text-white/30 text-sm mt-1">Create a poll to get the nest&apos;s opinion!</p>
        </div>
      )}
    </div>
  );
}

function PollCard({ poll, index, currentUserId }: { poll: Poll; index: number; currentUserId?: string }) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [voted, setVoted] = useState<string | null>(null);

  const totalVotes = poll.options?.reduce((sum, o) => sum + (o.votes || 0), 0) || 0;

  const handleVote = async (optionId: string) => {
    if (voted) return;
    setVoted(optionId);
    await supabase
      .from("poll_options")
      .update({ votes: (poll.options?.find(o => o.id === optionId)?.votes || 0) + 1 })
      .eq("id", optionId);
    queryClient.invalidateQueries({ queryKey: ["polls"] });
    toast.success("Vote recorded! 🗳️");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="glass rounded-2xl p-4"
    >
      <h3 className="text-white font-semibold text-base mb-1">{poll.question}</h3>
      <p className="text-white/30 text-xs mb-4">
        By {poll.creator?.full_name} · {formatTimeAgo(poll.created_at)} · {totalVotes} votes
      </p>

      <div className="space-y-2">
        {poll.options?.map((option) => {
          const percent = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const isWinning = totalVotes > 0 && option.votes === Math.max(...(poll.options?.map(o => o.votes) || [0]));

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!!voted}
              className="w-full text-left relative overflow-hidden rounded-xl transition-all disabled:cursor-default"
              style={{
                border: voted === option.id ? "1px solid rgba(0,245,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Progress bar background */}
              {voted && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: isWinning
                      ? "linear-gradient(90deg, rgba(0,245,255,0.15), rgba(0,245,255,0.05))"
                      : "rgba(255,255,255,0.04)",
                  }}
                />
              )}
              <div className="relative z-10 flex items-center justify-between px-3 py-2.5">
                <span className="text-white/80 text-sm">{option.option_text}</span>
                {voted ? (
                  <span className={`text-xs font-bold ${isWinning ? "text-cyan-400" : "text-white/40"}`}>
                    {percent}%
                  </span>
                ) : (
                  <span className="text-white/20 text-xs">{option.votes}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
