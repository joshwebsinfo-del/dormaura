"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, NeonBadge, LoadingSkeleton } from "@/components/ui/glass";
import { Search, Plus, X, Image as ImageIcon } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import Image from "next/image";
import type { LostFoundItem } from "@/types";
import toast from "react-hot-toast";

export default function LostFoundPage() {
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<"all" | "lost" | "found">("all");
  const [form, setForm] = useState({ type: "lost" as "lost" | "found", title: "", description: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["lost-found"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lost_found")
        .select("*, user:users(*)")
        .order("created_at", { ascending: false });
      return data as LostFoundItem[];
    },
  });

  const filtered = filter === "all" ? items : items?.filter((i) => i.type === filter);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      let image_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const filename = `${user.id}/${Date.now()}.${ext}`;
        await supabase.storage.from("lost-found").upload(filename, imageFile);
        const { data: { publicUrl } } = supabase.storage.from("lost-found").getPublicUrl(filename);
        image_url = publicUrl;
      }
      const { error } = await supabase.from("lost_found").insert({
        user_id: user.id,
        type: form.type,
        title: form.title,
        description: form.description,
        image_url,
      });
      if (error) throw error;
      setForm({ type: "lost", title: "", description: "" });
      setImageFile(null);
      setImagePreview(null);
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["lost-found"] });
      toast.success(`Posted to ${form.type === "lost" ? "Lost" : "Found"}! 🔍`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <PageHeader
        title="Lost & Found"
        subtitle="Help each other find missing items"
        icon={<Search size={18} />}
        actions={
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.25)" }}
          >
            {showCreate ? <X size={14} className="text-white/60" /> : <Plus size={14} className="text-orange-400" />}
            <span className="text-white/80">{showCreate ? "Cancel" : "Post"}</span>
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
            {/* Type toggle */}
            <div className="flex gap-2 p-1 rounded-xl bg-white/[0.04]">
              {(["lost", "found"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    form.type === t
                      ? t === "lost"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  {t === "lost" ? "😢 I Lost Something" : "✅ I Found Something"}
                </button>
              ))}
            </div>
            <input
              id="lost-found-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={`What did you ${form.type}?`}
              className="w-full input-glass text-sm"
              required
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description, location, contact info..."
              rows={3}
              className="w-full input-glass text-sm resize-none"
            />
            <label htmlFor="lost-found-image" className="flex items-center gap-2 text-white/40 hover:text-white/60 text-sm cursor-pointer transition-colors">
              <ImageIcon size={14} />
              {imagePreview ? "Change photo" : "Add photo"}
              <input id="lost-found-image" type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }}} />
            </label>
            {imagePreview && (
              <div className="relative">
                <Image src={imagePreview} alt="Preview" width={300} height={150} className="w-full h-32 object-cover rounded-xl" />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white">
                  <X size={12} />
                </button>
              </div>
            )}
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? "Posting..." : "Post"}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "lost", "found"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === f
                ? f === "lost"
                  ? "text-rose-400 border border-rose-400/30 bg-rose-400/10"
                  : f === "found"
                  ? "text-emerald-400 border border-emerald-400/30 bg-emerald-400/10"
                  : "text-cyan-400 border border-cyan-400/30 bg-cyan-400/10"
                : "text-white/40 border border-white/10 hover:text-white/60"
            }`}
          >
            {f === "all" ? "All" : f === "lost" ? "😢 Lost" : "✅ Found"}
          </button>
        ))}
      </div>

      {/* Items */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <LoadingSkeleton key={i} className="h-28" />)}</div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-3 pb-4">
          {filtered.map((item, i) => (
            <LostFoundCard key={item.id} item={item} index={i} />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-white/60">Nothing here yet</p>
        </div>
      )}
    </div>
  );
}

function LostFoundCard({ item, index }: { item: LostFoundItem; index: number }) {
  const isLost = item.type === "lost";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {item.image_url && (
        <Image src={item.image_url} alt={item.title} width={400} height={200}
          className="w-full h-40 object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <NeonBadge color={isLost ? "rose" : "cyan"}>
                {isLost ? "😢 Lost" : "✅ Found"}
              </NeonBadge>
              <span className="text-white font-semibold text-sm">{item.title}</span>
            </div>
            <p className="text-white/60 text-sm">{item.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-white/30 text-xs">
                By {item.user?.full_name} · Room {item.user?.room_number}
              </span>
              <span className="text-white/20 text-xs">· {formatTimeAgo(item.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
