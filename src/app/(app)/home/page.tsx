"use client";

import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { GlassCard, LoadingSkeleton, NeonBadge } from "@/components/ui/glass";
import { PostCard } from "@/components/features/post-card";
import { MoodBar } from "@/components/features/mood-bar";
import { QuickActions } from "@/components/features/quick-actions";
import type { Post, User as UserType } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { 
  Sparkles, Plus, Image as ImageIcon, Video, ShoppingBag, 
  X, Send, ArrowLeft, ArrowRight, Heart, MessageCircle, Clock, Music
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

interface Story {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  bg_gradient: string | null;
  created_at: string;
  expires_at: string;
  user: UserType;
}

const STORY_GRADIENTS = [
  "linear-gradient(135deg, #facc15 0%, #eab308 100%)", // Cyber Gold
  "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)", // Glacial Neon
  "linear-gradient(135deg, #ec4899 0%, #d946ef 100%)", // Sunset Pink
  "linear-gradient(135deg, #10b981 0%, #059669 100%)", // Emerald Green
  "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", // Violet Sky
];

export default function HomePage() {
  const { user } = useAuthStore();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Dialog & Creator states
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [isStoryPaused, setIsStoryPaused] = useState(false);

  // Post form states
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [postLoading, setPostLoading] = useState(false);

  // Story form states
  const [storyType, setStoryType] = useState<"text" | "image">("text");
  const [storyText, setStoryText] = useState("");
  const [storyGradient, setStoryGradient] = useState(STORY_GRADIENTS[0]);
  const [storyImage, setStoryImage] = useState<File | null>(null);
  const [storyImagePreview, setStoryImagePreview] = useState<string | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);

  // Query Feed
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

  // Query Stories
  const { data: stories, refetch: refetchStories } = useQuery<Story[]>({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*, user:users(*)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) return [];
      return data as unknown as Story[];
    },
  });

  // Realtime updates
  useEffect(() => {
    const feedChannel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["feed"] });
      })
      .subscribe();

    const storyChannel = supabase
      .channel("stories-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => {
        refetchStories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(feedChannel);
      supabase.removeChannel(storyChannel);
    };
  }, [supabase, queryClient, refetchStories]);

  const [storyProgress, setStoryProgress] = useState(0);

  // Reset progress when changing story
  useEffect(() => {
    setStoryProgress(0);
  }, [activeStoryIndex]);

  // Story timer automation (lasts 10 seconds, then drops, pause on press)
  useEffect(() => {
    if (activeStoryIndex === null || !stories) {
      setStoryProgress(0);
      return;
    }
    if (isStoryPaused) return;

    const duration = 10000; // 10 seconds per story
    const startProgress = storyProgress;
    const startTime = Date.now() - (startProgress / 100) * duration;

    let animId: number;
    const update = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setStoryProgress(pct);

      if (pct >= 100) {
        // Automatically drop story when finished
        setActiveStoryIndex(null);
      } else {
        animId = requestAnimationFrame(update);
      }
    };
    animId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animId);
  }, [activeStoryIndex, stories, isStoryPaused]);

  // Post image handler
  const handlePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostImage(file);
      setPostImagePreview(URL.createObjectURL(file));
    }
  };

  // Story image handler
  const handleStoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStoryImage(file);
      setStoryImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle Post submission
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() || !user) return;
    setPostLoading(true);

    try {
      let image_url: string | null = null;
      if (postImage) {
        const ext = postImage.name.split(".").pop();
        const filename = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(filename, postImage, { cacheControl: "3600" });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(filename);
        image_url = publicUrl;
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: postContent.trim(),
        image_url
      });
      if (error) throw error;

      setPostContent("");
      setPostImage(null);
      setPostImagePreview(null);
      setPostModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Post nested successfully! 🚀");
    } catch (err: any) {
      toast.error(err.message || "Failed to post");
    } finally {
      setPostLoading(false);
    }
  };

  // Handle Story submission
  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (storyType === "text" && !storyText.trim()) return;
    if (storyType === "image" && !storyImage) return;
    setStoryLoading(true);

    try {
      let image_url: string | null = null;
      if (storyType === "image" && storyImage) {
        const ext = storyImage.name.split(".").pop();
        const filename = `stories/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(filename, storyImage, { cacheControl: "3600" });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(filename);
        image_url = publicUrl;
      }

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        content: storyType === "text" ? storyText.trim() : null,
        image_url: storyType === "image" ? image_url : null,
        bg_gradient: storyType === "text" ? storyGradient : null,
      });
      if (error) throw error;

      setStoryText("");
      setStoryImage(null);
      setStoryImagePreview(null);
      setStoryModalOpen(false);
      refetchStories();
      toast.success("Story posted! Expires in 25 hours. ⏰🔥");
    } catch (err: any) {
      toast.error(err.message || "Failed to post story");
    } finally {
      setStoryLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-2 pb-24 relative min-h-[85vh]">
      {/* Greetings */}
      {user && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <p className="text-white/40 text-sm">Good day, {user.full_name?.split(" ")[0]} 👋</p>
            <h2 className="text-white font-display font-bold text-lg">What&apos;s in the nest?</h2>
          </div>
          <NeonBadge color="cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Live
          </NeonBadge>
        </motion.div>
      )}

      {/* Stories Tray */}
      <div className="relative">
        <div className="flex items-center gap-3 overflow-x-auto py-2.5 hide-scrollbar px-1 select-none">
          {/* Add story card */}
          <div 
            onClick={() => setStoryModalOpen(true)}
            className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group"
          >
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] transition-all">
              {user?.profile_photo ? (
                <Image src={user.profile_photo} alt={user.full_name} width={64} height={64} className="object-cover w-full h-full group-hover:scale-105 transition-all opacity-80" />
              ) : (
                <span className="text-white font-bold text-lg">{user?.full_name?.charAt(0)}</span>
              )}
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute w-6 h-6 rounded-lg bg-cyan-500 flex items-center justify-center text-black border-2 border-[#050508]">
                <Plus size={14} className="stroke-[3]" />
              </div>
            </div>
            <span className="text-[10px] font-semibold text-white/50 group-hover:text-white transition-colors">Add Story</span>
          </div>

          {/* Render loaded Active Stories */}
          {stories && stories.map((story, idx) => (
            <div
              key={story.id}
              onClick={() => setActiveStoryIndex(idx)}
              className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0"
            >
              <div className="relative p-[2.5px] rounded-2xl bg-gradient-to-tr from-cyan-400 via-violet-500 to-amber-400 shadow-[0_0_12px_rgba(0,245,255,0.15)] hover:scale-105 transition-all">
                <div className="w-[59px] h-[59px] rounded-[13px] overflow-hidden bg-[#050508]">
                  {story.image_url ? (
                    <Image src={story.image_url} alt={story.user.full_name} width={59} height={59} className="object-cover w-full h-full" />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center p-1"
                      style={{ background: story.bg_gradient || STORY_GRADIENTS[0] }}
                    >
                      <span className="text-white text-[8px] font-bold tracking-tight text-center line-clamp-3 leading-snug font-sans">
                        {story.content}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-semibold text-white/60 truncate max-w-[66px]">{story.user.full_name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feeling and Explore Hub */}
      <div className="bg-black/20 border border-white/[0.05] rounded-2xl p-4 space-y-4 shadow-xl">
        <div>
          <h3 className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">How are you feeling?</h3>
          <MoodBar />
        </div>
        <div>
          <h3 className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">Explore Features</h3>
          <QuickActions />
        </div>
      </div>

      {/* Main Feed Section */}
      <div className="flex items-center gap-2 mt-4 mb-2 pl-1">
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

      {/* ============================================================
          FLOATING POST BUTTON
          ============================================================ */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setPostModalOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-violet-600 text-black flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] z-40 transition-all border border-cyan-400/30"
      >
        <Plus size={28} className="stroke-[2.5]" />
      </motion.button>

      {/* ============================================================
          STORY CREATOR MODAL
          ============================================================ */}
      <AnimatePresence>
        {storyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass border border-white/[0.08] w-full max-w-md rounded-3xl overflow-hidden p-5 flex flex-col gap-4 shadow-2xl relative"
            >
              <button 
                onClick={() => setStoryModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                <Clock size={16} className="text-cyan-400" />
                <h3 className="text-white font-bold text-base">Add Daily Story</h3>
              </div>

              {/* Type Switch */}
              <div className="grid grid-cols-2 gap-2 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setStoryType("text")}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${storyType === "text" ? "bg-cyan-500 text-black shadow-lg" : "text-white/60 hover:text-white"}`}
                >
                  📝 Text Gradient
                </button>
                <button
                  type="button"
                  onClick={() => setStoryType("image")}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${storyType === "image" ? "bg-cyan-500 text-black shadow-lg" : "text-white/60 hover:text-white"}`}
                >
                  📸 Photo Story
                </button>
              </div>

              {/* Text Story Form */}
              {storyType === "text" ? (
                <div className="space-y-4">
                  <div 
                    className="h-44 rounded-2xl flex items-center justify-center p-4 relative overflow-hidden transition-all duration-300 border border-white/10"
                    style={{ background: storyGradient }}
                  >
                    <textarea
                      placeholder="Type a daily thought..."
                      value={storyText}
                      onChange={(e) => setStoryText(e.target.value)}
                      maxLength={180}
                      rows={3}
                      className="bg-transparent text-center text-white placeholder-white/60 text-lg font-bold outline-none border-none w-full max-w-[280px] resize-none leading-relaxed"
                    />
                  </div>

                  {/* Gradient picker */}
                  <div className="flex gap-2.5 justify-center">
                    {STORY_GRADIENTS.map((grad) => (
                      <button
                        key={grad}
                        onClick={() => setStoryGradient(grad)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${storyGradient === grad ? "border-white scale-110 shadow-lg" : "border-transparent hover:scale-105"}`}
                        style={{ background: grad }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                /* Image Story Form */
                <div className="space-y-4">
                  {storyImagePreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 h-44">
                      <Image src={storyImagePreview} alt="Story preview" width={400} height={200} className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => { setStoryImage(null); setStoryImagePreview(null); }} 
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="h-44 rounded-2xl border border-dashed border-white/20 hover:border-cyan-500/40 flex flex-col items-center justify-center gap-2 cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                      <ImageIcon size={28} className="text-white/40" />
                      <span className="text-xs text-white/50 font-medium">Select Story Photo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleStoryImageChange} />
                    </label>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleStorySubmit}
                disabled={storyLoading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm font-bold mt-2"
              >
                {storyLoading ? (
                  <span className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Send size={15} /> Publish Story
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================
          FLOATING POST CREATION MODAL
          ============================================================ */}
      <AnimatePresence>
        {postModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass border border-white/[0.08] w-full max-w-lg rounded-3xl overflow-hidden p-5 flex flex-col gap-4 shadow-2xl relative"
            >
              <button 
                onClick={() => setPostModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                <Sparkles size={16} className="text-cyan-400" />
                <h3 className="text-white font-bold text-base">Write new Post</h3>
              </div>

              {/* Form body */}
              <form onSubmit={handlePostSubmit} className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
                    {user?.profile_photo ? (
                      <Image src={user.profile_photo} alt={user.full_name} width={40} height={40} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-cyan-500/30 to-violet-500/30">
                        {user?.full_name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <textarea
                    placeholder={`What is happening, ${user?.full_name?.split(" ")[0]}?`}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={4}
                    className="flex-1 bg-transparent text-white placeholder-white/40 text-[15px] resize-none outline-none leading-relaxed mt-1"
                    autoFocus
                  />
                </div>

                {/* Post image preview */}
                {postImagePreview && (
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 max-h-48">
                    <Image src={postImagePreview} alt="Preview" width={500} height={250} className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => { setPostImage(null); setPostImagePreview(null); }} 
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Toolbar */}
                <div className="border-t border-white/[0.05] pt-3.5 flex items-center justify-between">
                  <label className="cursor-pointer flex items-center gap-2 text-white/50 hover:text-cyan-400 transition-colors text-sm font-semibold">
                    <ImageIcon size={18} />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePostImageChange} />
                  </label>

                  <button 
                    type="submit" 
                    disabled={!postContent.trim() || postLoading} 
                    className="btn-primary py-2.5 px-6 flex items-center gap-2 text-sm font-bold text-black"
                  >
                    {postLoading ? (
                      <span className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <Send size={14} /> Publish
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================
          IMMERSIVE STORIES VIEWER (FACEBOOK/INSTAGRAM STYLE)
          ============================================================ */}
      <AnimatePresence>
        {activeStoryIndex !== null && stories && (
          <div 
            onPointerDown={() => setIsStoryPaused(true)}
            onPointerUp={() => setIsStoryPaused(false)}
            onTouchStart={() => setIsStoryPaused(true)}
            onTouchEnd={() => setIsStoryPaused(false)}
            className="fixed inset-0 z-50 flex flex-col bg-black justify-between overflow-hidden"
          >
            
            {/* Top Area: Progress lines & Info */}
            <div className="px-4 pt-4 pb-2 z-10 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex gap-1.5 mb-3.5">
                {stories.map((s, idx) => (
                  <div key={s.id} className="h-[3px] flex-1 rounded bg-white/20 overflow-hidden">
                    <div 
                      className="h-full bg-cyan-400"
                      style={{
                        width: idx === activeStoryIndex 
                          ? `${storyProgress}%` 
                          : idx < activeStoryIndex 
                            ? "100%" 
                            : "0%"
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shrink-0">
                    {stories[activeStoryIndex].user.profile_photo ? (
                      <Image src={stories[activeStoryIndex].user.profile_photo} alt={stories[activeStoryIndex].user.full_name} width={36} height={36} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold bg-cyan-500/20">
                        {stories[activeStoryIndex].user.full_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm tracking-tight">{stories[activeStoryIndex].user.full_name}</h4>
                    <p className="text-white/40 text-[10px] mt-0.5">Daily Story</p>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveStoryIndex(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Middle Area: Story Content */}
            <div className="flex-1 flex items-center justify-center p-4 relative">
              {/* Previous Tap Zone */}
              <div 
                onClick={() => {
                  if (activeStoryIndex > 0) {
                    setActiveStoryIndex(activeStoryIndex - 1);
                  }
                }}
                className="absolute left-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer"
              />

              {/* Next Tap Zone */}
              <div 
                onClick={() => {
                  if (activeStoryIndex < stories.length - 1) {
                    setActiveStoryIndex(activeStoryIndex + 1);
                  } else {
                    setActiveStoryIndex(null);
                  }
                }}
                className="absolute right-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer"
              />

              {/* Render Story details */}
              {stories[activeStoryIndex].image_url ? (
                <div className="relative w-full max-w-md h-full max-h-[70vh] rounded-3xl overflow-hidden border border-white/5">
                  <Image 
                    src={stories[activeStoryIndex].image_url!} 
                    alt="Story image" 
                    fill 
                    className="object-cover" 
                  />
                  {stories[activeStoryIndex].content && (
                    <div className="absolute bottom-6 inset-x-4 bg-black/60 backdrop-blur-md p-3.5 border border-white/5 rounded-2xl text-center">
                      <p className="text-white text-sm font-semibold tracking-tight leading-relaxed">
                        {stories[activeStoryIndex].content}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  className="w-full max-w-md h-full max-h-[70vh] rounded-3xl flex items-center justify-center p-6 border border-white/5 shadow-2xl relative"
                  style={{ background: stories[activeStoryIndex].bg_gradient || STORY_GRADIENTS[0] }}
                >
                  <p className="text-white text-2xl font-black text-center leading-relaxed tracking-tight max-w-[280px]">
                    {stories[activeStoryIndex].content}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Area: Controls */}
            <div className="flex items-center justify-between px-6 py-6 z-10 bg-gradient-to-t from-black/80 to-transparent">
              <button 
                disabled={activeStoryIndex === 0}
                onClick={() => setActiveStoryIndex(activeStoryIndex - 1)}
                className="btn-glass p-2 rounded-xl text-white/60 hover:text-white disabled:opacity-20"
              >
                <ArrowLeft size={16} />
              </button>

              <span className="text-[10px] text-white/30 tracking-widest font-mono">
                {activeStoryIndex + 1} OF {stories.length}
              </span>

              <button 
                disabled={activeStoryIndex === stories.length - 1}
                onClick={() => setActiveStoryIndex(activeStoryIndex + 1)}
                className="btn-glass p-2 rounded-xl text-white/60 hover:text-white disabled:opacity-20"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
