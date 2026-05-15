"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, NeonBadge, LoadingSkeleton } from "@/components/ui/glass";
import { HelpCircle, Plus, X, Check } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import type { WhoHasRequest } from "@/types";
import toast from "react-hot-toast";

const COMMON_ITEMS = [
  "Charger 🔌", "Iron 👔", "Calculator 🧮", "Extension Cable 🔋",
  "Notes 📝", "Scissors ✂️", "Stapler 📌", "Umbrella ☂️",
  "Needle & Thread 🧵", "Medicine 💊",
];

export default function WhoHasPage() {
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["who-has"],
    queryFn: async () => {
      const { data } = await supabase
        .from("who_has_requests")
        .select("*, user:users(*)")
        .eq("resolved", false)
        .order("created_at", { ascending: false });
      return data as WhoHasRequest[];
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("who_has_requests").insert({
        user_id: user.id,
        item_name: itemName.trim(),
        description: description.trim() || null,
        resolved: false,
      });
      if (error) throw error;
      setItemName("");
      setDescription("");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["who-has"] });
      toast.success("Request posted! 📢");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    await supabase.from("who_has_requests").update({ resolved: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["who-has"] });
    toast.success("Marked as resolved! ✅");
  };

  return (
    <div className="space-y-4 pt-2">
      <PageHeader
        title="Who Has?"
        subtitle="Ask the nest for items you need"
        icon={<HelpCircle size={18} />}
        actions={
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}
          >
            {showCreate ? <X size={14} className="text-white/60" /> : <Plus size={14} className="text-emerald-400" />}
            <span className="text-white/80">{showCreate ? "Cancel" : "Ask"}</span>
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
            <p className="text-white/50 text-xs">Quick select an item:</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_ITEMS.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setItemName(itemName === item ? "" : item)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                    itemName === item
                      ? "text-emerald-400 border border-emerald-400/40 bg-emerald-400/10"
                      : "text-white/50 border border-white/10 hover:text-white/70"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <input
              id="who-has-item"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Or type a custom item..."
              className="w-full input-glass text-sm"
              required
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details (optional)..."
              rows={2}
              className="w-full input-glass text-sm resize-none"
            />
            <motion.button
              type="submit"
              disabled={loading || !itemName.trim()}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl text-sm font-semibold text-emerald-400 flex items-center justify-center gap-2"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}
            >
              {loading ? "Posting..." : "Post Request"}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Requests list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <LoadingSkeleton key={i} className="h-24" />)}
        </div>
      ) : requests && requests.length > 0 ? (
        <div className="space-y-3 pb-4">
          {requests.map((req, i) => (
            <WhoHasCard
              key={req.id}
              request={req}
              index={i}
              currentUserId={user?.id}
              onResolve={handleResolve}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🙋</div>
          <p className="text-white/60">No active requests</p>
          <p className="text-white/30 text-sm mt-1">Need something? Just ask the nest!</p>
        </div>
      )}
    </div>
  );
}

function WhoHasCard({
  request, index, currentUserId, onResolve,
}: {
  request: WhoHasRequest;
  index: number;
  currentUserId?: string;
  onResolve: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-white font-semibold text-sm">{request.item_name}</span>
            <NeonBadge color="cyan">Needed</NeonBadge>
          </div>
          {request.description && (
            <p className="text-white/50 text-xs mb-2">{request.description}</p>
          )}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60">
              {request.user?.full_name?.charAt(0)}
            </div>
            <span className="text-white/40 text-xs">{request.user?.full_name}</span>
            <span className="text-white/20 text-xs">· Room {request.user?.room_number}</span>
            <span className="text-white/20 text-xs">· {formatTimeAgo(request.created_at)}</span>
          </div>
        </div>
        {request.user_id === currentUserId && (
          <button
            onClick={() => onResolve(request.id)}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-emerald-400 hover:bg-emerald-400/10 transition-all border border-emerald-400/20"
          >
            <Check size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
