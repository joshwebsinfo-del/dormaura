"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, NeonBadge, LoadingSkeleton } from "@/components/ui/glass";
import { ShoppingBag, Plus, X, Tag, Image as ImageIcon, Trash2 } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import Image from "next/image";
import type { MarketplaceItem } from "@/types";
import toast from "react-hot-toast";

const CATEGORIES = ["All", "Clothes", "Electronics", "Food", "Notes", "Other"];

export default function MarketplacePage() {
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [form, setForm] = useState({ title: "", description: "", price: "", category: "Other" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["marketplace"],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_items")
        .select("*, seller:users!seller_id(*)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return data as MarketplaceItem[];
    },
  });

  const filtered = activeCategory === "All" ? items : items?.filter((i) => i.title.toLowerCase().includes(activeCategory.toLowerCase()));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      let image_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const filename = `${user.id}/${Date.now()}.${ext}`;
        await supabase.storage.from("marketplace").upload(filename, imageFile);
        const { data: { publicUrl } } = supabase.storage.from("marketplace").getPublicUrl(filename);
        image_url = publicUrl;
      }
      const { error } = await supabase.from("marketplace_items").insert({
        seller_id: user.id,
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        image_url,
        status: "active",
      });
      if (error) throw error;
      setForm({ title: "", description: "", price: "", category: "Other" });
      setImageFile(null);
      setImagePreview(null);
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      toast.success("Item listed! 🛍️");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <PageHeader
        title="Marketplace"
        subtitle="Buy & sell within the nest"
        icon={<ShoppingBag size={18} />}
        actions={
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(37,99,235,0.15))", border: "1px solid rgba(168,85,247,0.25)" }}
          >
            {showCreate ? <X size={14} className="text-white/60" /> : <Plus size={14} className="text-violet-400" />}
            <span className="text-white/80">{showCreate ? "Cancel" : "List Item"}</span>
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
            <input id="market-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Item name" className="w-full input-glass text-sm" required />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description..." rows={2} className="w-full input-glass text-sm resize-none" />
            <div className="flex gap-2">
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Price ($)" className="flex-1 input-glass text-sm" required min="0" step="0.01" />
              <label htmlFor="market-image" className="flex items-center justify-center gap-2 px-3 py-2.5 glass-sm rounded-xl cursor-pointer text-white/50 hover:text-white/80 transition-colors text-sm">
                <ImageIcon size={16} />
                <input id="market-image" type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }}} />
                Photo
              </label>
            </div>
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
              {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full" /> : "List for Sale"}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              activeCategory === cat
                ? "text-violet-400 border border-violet-500/30 bg-violet-500/10"
                : "text-white/40 border border-white/10 hover:text-white/60"
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Items grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map((i) => <LoadingSkeleton key={i} className="h-52" />)}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 pb-4">
          {filtered.map((item, i) => <MarketplaceCard key={item.id} item={item} index={i} />)}
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🛍️</div>
          <p className="text-white/60">No items listed yet</p>
          <p className="text-white/30 text-sm mt-1">Be the first to sell something!</p>
        </div>
      )}
    </div>
  );
}

function MarketplaceCard({ item, index }: { item: MarketplaceItem; index: number }) {
  const { user } = useAuthStore();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const handleMarkSold = async () => {
    if (item.seller_id !== user?.id) return;
    await supabase.from("marketplace_items").update({ status: "sold" }).eq("id", item.id);
    queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    toast.success("Marked as sold!");
  };

  const handleDelete = async () => {
    if (item.seller_id !== user?.id && user?.role !== "admin") return;
    await supabase.from("marketplace_items").delete().eq("id", item.id);
    queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    toast.success("Item deleted! 🗑️");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {item.image_url ? (
        <div className="h-36 overflow-hidden">
          <Image src={item.image_url} alt={item.title} width={200} height={144} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-36 flex items-center justify-center" style={{ background: "rgba(168,85,247,0.08)" }}>
          <ShoppingBag size={32} className="text-violet-400/50" />
        </div>
      )}
      <div className="p-3">
        <p className="text-white font-semibold text-sm truncate">{item.title}</p>
        <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{item.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-cyan-400 font-bold text-sm">${item.price}</span>
          {item.seller_id === user?.id ? (
            <div className="flex gap-2 items-center">
              <button onClick={handleMarkSold} className="text-[10px] text-white/40 hover:text-emerald-400 transition-colors">Mark Sold</button>
              <button onClick={handleDelete} className="text-[10px] text-rose-400/60 hover:text-rose-400 transition-colors" title="Delete Listing">
                <Trash2 size={12} />
              </button>
            </div>
          ) : (
            <NeonBadge color="violet"><Tag size={9} /> Buy</NeonBadge>
          )}
        </div>
        <p className="text-white/20 text-[10px] mt-1.5">{item.seller?.full_name}</p>
      </div>
    </motion.div>
  );
}
