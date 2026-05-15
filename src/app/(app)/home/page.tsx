"use client";

import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { GlassCard, LoadingSkeleton, NeonBadge } from "@/components/ui/glass";
import { PostCard } from "@/components/features/post-card";
import { CreatePost } from "@/components/features/create-post";
import { MoodBar } from "@/components/features/mood-bar";
import { QuickActions } from "@/components/features/quick-actions";
import type { Post } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";

export default function HomePage() {
  const { user } = useAuthStore();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, user:users(*), likes(id, user_id), comments(id)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Post[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["feed"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, queryClient]);

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  return (
    <div className="space-y-4 pt-2">
      {user && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <p className="text-white/40 text-sm">{getGreeting()}, {user.full_name?.split(" ")[0]} 👋</p>
            <h2 className="text-white font-display font-bold text-lg">What&apos;s in the nest?</h2>
          </div>
          <NeonBadge color="cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Live
          </NeonBadge>
        </motion.div>
      )}

      {/* Dashboard Section */}
      <div className="bg-black/20 border border-white/[0.05] rounded-2xl p-4 space-y-4">
        <div>
          <h3 className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">How are you feeling?</h3>
          <MoodBar />
        </div>
        <div>
          <h3 className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">Explore</h3>
          <QuickActions />
        </div>
      </div>

      <CreatePost />

      <div className="flex items-center gap-2 mt-4 mb-2">
        <Sparkles size={14} className="text-cyan-400" />
        <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Latest from the Nest</span>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <LoadingSkeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <LoadingSkeleton className="h-3 w-32" />
                  <LoadingSkeleton className="h-2 w-20" />
                </div>
              </div>
              <LoadingSkeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-4 pb-4">
          {posts.map((post, index) => <PostCard key={post.id} post={post} index={index} />)}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🏠</div>
          <p className="text-white/60 font-medium">The nest is quiet...</p>
          <p className="text-white/30 text-sm mt-1">Be the first to post something!</p>
        </motion.div>
      )}
    </div>
  );
}
