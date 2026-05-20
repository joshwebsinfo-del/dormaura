"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, MoreHorizontal, Trash2, Share2, Play } from "lucide-react";
import Image from "next/image";
import { formatTimeAgo, getMoodEmoji, getAvailabilityColor } from "@/lib/utils";
import type { Post } from "@/types";
import toast from "react-hot-toast";

interface PostCardProps {
  post: Post;
  index?: number;
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuthStore();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const isLiked = post.likes?.some((l) => l.user_id === user?.id);
  const likeCount = post.likes?.length || 0;
  const commentCount = post.comments?.length || 0;

  const handleLike = async () => {
    if (!user) return;
    if (isLiked) {
      await supabase.from("likes").delete().match({ post_id: post.id, user_id: user.id });
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_id: user.id });
      if (post.user_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          actor_id: user.id,
          type: "like",
          title: "Liked your post",
          content: `${user.full_name} liked your post: "${post.content.slice(0, 35)}${post.content.length > 35 ? "..." : ""}"`,
          link: "/home"
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !user) return;
    const cleanComment = comment.trim();
    await supabase.from("comments").insert({
      post_id: post.id,
      user_id: user.id,
      content: cleanComment,
    });
    if (post.user_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: post.user_id,
        actor_id: user.id,
        type: "comment",
        title: "Commented on your post",
        content: `${user.full_name} commented: "${cleanComment.slice(0, 35)}${cleanComment.length > 35 ? "..." : ""}"`,
        link: "/home"
      });
    }
    setComment("");
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const handleDelete = async () => {
    if (!user) return;
    await supabase.from("posts").delete().eq("id", post.id);
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    toast.success("Post deleted");
    setShowMenu(false);
  };

  return (
    <div className="glass rounded-2xl overflow-hidden shadow-lg border border-white/[0.05] mb-4">
      {/* Header */}
      <div className="p-4 pb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 bg-black/20">
              {post.user?.profile_photo ? (
                <Image src={post.user.profile_photo} alt={post.user.full_name} width={44} height={44} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
                  {post.user?.full_name?.charAt(0)}
                </div>
              )}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#050508] ${getAvailabilityColor(post.user?.availability_status || "away")}`} />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-[15px] tracking-tight">{post.user?.full_name}</span>
              {post.user?.mood_status && <span className="text-sm">{getMoodEmoji(post.user.mood_status)}</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-white/40 text-xs font-medium">Room {post.user?.room_number}</span>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-white/40 text-xs">{formatTimeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/90 hover:bg-white/10 transition-colors">
            <MoreHorizontal size={18} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 z-20 glass rounded-xl overflow-hidden min-w-[150px] border border-white/10 shadow-2xl">
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`); toast.success("Link copied!"); setShowMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/10 transition-colors">
                <Share2 size={15} /> Copy Link
              </button>
              {(user?.id === post.user_id || user?.role === "admin") && (
                <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors">
                  <Trash2 size={15} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-white/90 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Attachments */}
      {post.image_url && (
        <div className="px-4 pb-3">
          <div className="rounded-xl overflow-hidden border border-white/[0.05] bg-black/40">
            {post.image_url.match(/\.(mp4|webm|ogg|mov|m4v|quicktime)($|\?)/i) ? (
              <video 
                src={post.image_url} 
                controls 
                playsInline 
                className="w-full max-h-80 object-cover rounded-xl"
              />
            ) : (
              <Image src={post.image_url} alt="Post media" width={600} height={400} className="w-full object-cover max-h-80" />
            )}
          </div>
        </div>
      )}

      {post.audio_url && (
        <div className="px-4 pb-3">
          <div className="bg-black/30 border border-white/[0.05] rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-xl shrink-0">🎵</div>
            <audio controls className="w-full h-8 outline-none"><source src={post.audio_url} /></audio>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={handleLike} className={`flex items-center gap-2 text-sm font-medium transition-colors ${isLiked ? "text-rose-400" : "text-white/40 hover:text-white/80"}`}>
            <Heart size={18} className={isLiked ? "fill-rose-400" : ""} />
            {likeCount}
          </button>
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 text-sm font-medium text-white/40 hover:text-cyan-400 transition-colors">
            <MessageCircle size={18} />
            {commentCount}
          </button>
        </div>
      </div>

      {/* Animated Inline Comments Drawer */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/[0.05] bg-black/20 overflow-hidden"
          >
            <div className="p-3">
              <div className="space-y-3 mb-3 max-h-40 overflow-y-auto custom-scrollbar">
                {post.comments?.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 shrink-0 overflow-hidden">
                       {c.user?.profile_photo ? <Image src={c.user.profile_photo} alt="" width={24} height={24} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div>
                      <span className="text-white/80 text-xs font-bold mr-2">{c.user?.full_name}</span>
                      <span className="text-white/70 text-sm">{c.content}</span>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleComment} className="flex gap-2">
                <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment..." className="flex-1 input-glass text-sm py-2 px-3 rounded-xl" />
                <button type="submit" disabled={!comment.trim()} className="px-4 py-2 rounded-xl text-sm font-bold bg-cyan-500 text-black disabled:opacity-50 hover:bg-cyan-400 transition-colors">
                  Post
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
