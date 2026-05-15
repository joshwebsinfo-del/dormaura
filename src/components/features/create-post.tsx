"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Send, X, Music } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

export function CreatePost() {
  const { user } = useAuthStore();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setAudioFile(null);
      setAudioPreview(null);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioPreview(URL.createObjectURL(file));
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setLoading(true);
    try {
      let image_url: string | null = null;
      let audio_url: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const filename = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("post-images").upload(filename, imageFile, { cacheControl: "3600" });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(filename);
        image_url = publicUrl;
      }

      if (audioFile) {
        const ext = audioFile.name.split(".").pop();
        const filename = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("post-images").upload(filename, audioFile, { cacheControl: "3600" });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(filename);
        audio_url = publicUrl;
      }

      const { error } = await supabase.from("posts").insert({ user_id: user.id, content: content.trim(), image_url, audio_url });
      if (error) throw error;

      setContent("");
      setImageFile(null);
      setAudioFile(null);
      setImagePreview(null);
      setAudioPreview(null);
      setExpanded(false);
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Posted! 🚀");
    } catch (err: any) {
      toast.error(err.message || "Failed to post");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden border border-white/[0.05] shadow-lg mb-6">
      <form onSubmit={handleSubmit}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
              {user.profile_photo ? (
                <Image src={user.profile_photo} alt={user.full_name} width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-cyan-500/30 to-violet-500/30">
                  {user.full_name?.charAt(0)}
                </div>
              )}
            </div>

            <textarea
              placeholder={`What's happening, ${user.full_name?.split(" ")[0]}?`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setExpanded(true)}
              rows={expanded ? 3 : 1}
              className="flex-1 bg-transparent text-white placeholder-white/40 text-[15px] resize-none outline-none leading-relaxed mt-1"
            />
          </div>

          {/* Previews (No animation for speed) */}
          {imagePreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden border border-white/10">
              <Image src={imagePreview} alt="Preview" width={400} height={200} className="w-full object-cover max-h-48" />
              <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black transition-colors">
                <X size={16} />
              </button>
            </div>
          )}

          {audioPreview && (
            <div className="relative mt-3 glass rounded-xl p-3 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                <Music size={18} />
              </div>
              <div className="flex-1 text-sm text-white/90 truncate">{audioFile?.name}</div>
              <button type="button" onClick={() => { setAudioFile(null); setAudioPreview(null); }} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-colors">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {expanded && (
          <div className="border-t border-white/[0.05] bg-black/20 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <label className="cursor-pointer flex items-center gap-2 text-white/50 hover:text-cyan-400 transition-colors text-sm font-medium">
                <ImageIcon size={18} />
                <span>Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              
              <label className="cursor-pointer flex items-center gap-2 text-white/50 hover:text-violet-400 transition-colors text-sm font-medium">
                <Music size={18} />
                <span>Audio</span>
                <input type="file" accept="audio/*" className="hidden" onChange={handleAudioChange} />
              </label>
            </div>

            <button type="submit" disabled={!content.trim() || loading} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-cyan-500 text-black disabled:opacity-40 hover:bg-cyan-400 transition-colors">
              {loading ? "Posting..." : <><Send size={15} /> Post</>}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
