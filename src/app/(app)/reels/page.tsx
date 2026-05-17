"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Upload, Play, Volume2, VolumeX, MessageCircle, X, Send, Trash2 } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

export default function ReelsPage() {
  const { user } = useAuthStore();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [globalMuted, setGlobalMuted] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeCommentsReel, setActiveCommentsReel] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const { data: reels, isLoading } = useQuery({
    queryKey: ["reels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reels")
        .select("*, user:users(*), likes:reel_likes(id, user_id), comments:reel_comments(*, user:users(id, full_name, profile_photo))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  useEffect(() => {
    const channel = supabase.channel("reels_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reel_comments" }, () => queryClient.invalidateQueries({ queryKey: ["reels"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "reel_likes" }, () => queryClient.invalidateQueries({ queryKey: ["reels"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, queryClient]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    toast.loading("Uploading Reel...", { id: "reel-upload" });
    try {
      const ext = file.name.split(".").pop();
      const filename = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("reels").upload(filename, file, { cacheControl: "3600" });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("reels").getPublicUrl(filename);
      const { error: dbError } = await supabase.from("reels").insert({ user_id: user.id, video_url: publicUrl, caption: "New reel! 🎥" });
      if (dbError) throw dbError;
      queryClient.invalidateQueries({ queryKey: ["reels"] });
      toast.success("Reel published! 🚀", { id: "reel-upload" });
    } catch (err: any) {
      toast.error(err.message || "Failed to upload", { id: "reel-upload" });
    } finally {
      setUploading(false);
    }
  };

  const handlePostComment = async (reelId: string) => {
    if (!commentText.trim() || !user) return;
    await supabase.from("reel_comments").insert({ reel_id: reelId, user_id: user.id, content: commentText.trim() });
    setCommentText("");
  };

  return (
    <div className="relative h-[calc(100vh-80px)] -mx-4 -mt-4 bg-black overflow-hidden">
      
      {/* Top Controls */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-3">
        <button onClick={() => setGlobalMuted(!globalMuted)}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/60 transition-colors">
          {globalMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-black shadow-lg hover:bg-cyan-400 transition-colors">
          <Upload size={18} />
        </button>
      </div>
      <input type="file" accept="video/*" ref={fileRef} onChange={handleUpload} className="hidden" />

      {/* Full screen swiping container */}
      <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center text-white/50">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        ) : reels?.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-white/50 gap-4">
            <Play size={40} className="text-white/20" />
            <p>No reels yet. Be the first!</p>
          </div>
        ) : (
          reels?.map((reel) => (
            <ReelItem 
              key={reel.id} 
              reel={reel} 
              user={user} 
              globalMuted={globalMuted}
              onToggleMute={() => setGlobalMuted(!globalMuted)}
              onOpenComments={() => setActiveCommentsReel(reel.id)}
            />
          ))
        )}
      </div>

      {/* Comments Modal */}
      {activeCommentsReel && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col justify-end">
          <div className="h-[60%] bg-[#0a0a0f] rounded-t-3xl border-t border-white/10 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="text-white font-bold">Comments</h3>
              <button onClick={() => setActiveCommentsReel(null)} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white/60">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {reels?.find(r => r.id === activeCommentsReel)?.comments?.map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 overflow-hidden">
                    {c.user?.profile_photo && <Image src={c.user.profile_photo} alt="" width={32} height={32} className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <span className="text-white/80 text-xs font-bold block mb-0.5">{c.user?.full_name}</span>
                    <span className="text-white/90 text-sm">{c.content}</span>
                  </div>
                </div>
              ))}
              {reels?.find(r => r.id === activeCommentsReel)?.comments?.length === 0 && (
                <p className="text-center text-white/40 mt-10">No comments yet. Be the first!</p>
              )}
            </div>
            <div className="p-4 border-t border-white/5 bg-black/20">
              <form onSubmit={(e) => { e.preventDefault(); handlePostComment(activeCommentsReel); }} className="flex gap-2">
                <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="flex-1 input-glass rounded-xl px-4 py-2 text-sm" />
                <button type="submit" disabled={!commentText.trim()} className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center text-black disabled:opacity-50">
                  <Send size={16} className="ml-1" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Child Component for Smart Scrolling
function ReelItem({ reel, user, globalMuted, onToggleMute, onOpenComments }: any) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const isLiked = reel.likes?.some((l: any) => l.user_id === user?.id) || false;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsPlaying(true);
          videoRef.current?.play().catch(() => {});
        } else {
          setIsPlaying(false);
          videoRef.current?.pause();
          if (videoRef.current) videoRef.current.currentTime = 0; // reset video when out of view
        }
      },
      { threshold: 0.6 } // Video plays when 60% of it is in the viewport
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleLike = async () => {
    if (!user) return;
    if (isLiked) {
      await supabase.from("reel_likes").delete().match({ reel_id: reel.id, user_id: user.id });
    } else {
      await supabase.from("reel_likes").insert({ reel_id: reel.id, user_id: user.id });
    }
  };

  const handleDelete = async () => {
    if (reel.user_id !== user?.id && user?.role !== "admin") return;
    const confirmDelete = window.confirm("Are you sure you want to delete this Reel?");
    if (!confirmDelete) return;
    try {
      await supabase.from("reels").delete().eq("id", reel.id);
      queryClient.invalidateQueries({ queryKey: ["reels"] });
      toast.success("Reel deleted! 🗑️");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete Reel");
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full snap-start bg-black">
      {/* Video Player */}
      <video 
        ref={videoRef}
        src={reel.video_url} 
        loop 
        muted={globalMuted} 
        playsInline
        className="w-full h-full object-cover cursor-pointer"
        onClick={() => {
          if (isPlaying) {
            videoRef.current?.pause();
            setIsPlaying(false);
          } else {
            videoRef.current?.play();
            setIsPlaying(true);
          }
        }}
      />

      {/* Play Icon Overlay if Paused */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center text-white/80 backdrop-blur-sm">
            <Play size={32} className="ml-2" />
          </div>
        </div>
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/90 pointer-events-none" />
      
      {/* Right side interactions */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 pointer-events-auto z-20">
        <div className="flex flex-col items-center gap-1">
          <button onClick={toggleLike}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 transition-transform active:scale-90">
            <Heart size={24} className={isLiked ? "fill-rose-500 text-rose-500" : "text-white"} />
          </button>
          <span className="text-white font-bold text-sm drop-shadow-md">{reel.likes?.length || 0}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button onClick={onOpenComments}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 transition-transform active:scale-90">
            <MessageCircle size={24} className="text-white" />
          </button>
          <span className="text-white font-bold text-sm drop-shadow-md">{reel.comments?.length || 0}</span>
        </div>
        {(reel.user_id === user?.id || user?.role === "admin") && (
          <div className="flex flex-col items-center gap-1">
            <button onClick={handleDelete}
              className="w-12 h-12 rounded-full bg-rose-500/20 backdrop-blur-md flex items-center justify-center border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-transform active:scale-90"
              title="Delete Reel"
            >
              <Trash2 size={20} />
            </button>
            <span className="text-rose-400 font-bold text-xs drop-shadow-md">Delete</span>
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="absolute left-4 bottom-20 right-20 pointer-events-auto z-20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
            {reel.user?.profile_photo ? (
              <Image src={reel.user.profile_photo} alt="" width={40} height={40} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold">
                {reel.user?.full_name?.charAt(0)}
              </div>
            )}
          </div>
          <span className="text-white font-bold drop-shadow-md text-lg">{reel.user?.full_name}</span>
        </div>
        <p className="text-white/90 text-sm drop-shadow-md line-clamp-2">{reel.caption}</p>
      </div>
    </div>
  );
}
