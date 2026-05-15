"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, NeonBadge, LoadingSkeleton } from "@/components/ui/glass";
import { Wrench, Plus, X, Check } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import type { MaintenanceRequest } from "@/types";
import toast from "react-hot-toast";

const ISSUE_TYPES = [
  "Broken Light 💡",
  "Plumbing Issue 🚿",
  "Electricity Problem ⚡",
  "Broken Lock 🔒",
  "Window/Door Issue 🪟",
  "Pest Problem 🐛",
  "Other 🔧",
];

export default function MaintenancePage() {
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [issue, setIssue] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("maintenance_requests")
        .select("*, user:users(*)")
        .order("created_at", { ascending: false });
      return data as MaintenanceRequest[];
    },
  });

  const myRequests = requests?.filter((r) => r.user_id === user?.id);
  const allRequests = user?.role !== "student" ? requests : undefined;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("maintenance_requests").insert({
        user_id: user.id,
        room_number: user.room_number,
        issue: `${selectedType ? selectedType + " - " : ""}${issue}`,
        status: "pending",
      });
      if (error) throw error;
      setIssue("");
      setSelectedType("");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Request submitted! 🔧");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "moderator";

  return (
    <div className="space-y-4 pt-2">
      <PageHeader
        title="Maintenance"
        subtitle="Report issues in your room"
        icon={<Wrench size={18} />}
        actions={
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.25)" }}
          >
            {showCreate ? <X size={14} className="text-white/60" /> : <Plus size={14} className="text-orange-400" />}
            <span className="text-white/80">{showCreate ? "Cancel" : "Report"}</span>
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
            <p className="text-white/60 text-xs font-medium">Room {user?.room_number} • Select issue type</p>
            <div className="flex flex-wrap gap-2">
              {ISSUE_TYPES.map((type) => (
                <button type="button" key={type} onClick={() => setSelectedType(selectedType === type ? "" : type)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                    selectedType === type
                      ? "text-orange-400 border border-orange-400/40 bg-orange-400/10"
                      : "text-white/50 border border-white/10 hover:text-white/70"
                  }`}>
                  {type}
                </button>
              ))}
            </div>
            <textarea id="maintenance-issue" value={issue} onChange={(e) => setIssue(e.target.value)}
              placeholder="Describe the issue in detail..." rows={3}
              className="w-full input-glass text-sm resize-none" required />
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: "linear-gradient(135deg, rgba(251,146,60,0.3), rgba(251,146,60,0.1))", border: "1px solid rgba(251,146,60,0.3)", color: "#fb923c" }}>
              {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full" /> : "Submit Request"}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* My requests */}
      <div>
        <p className="text-white/30 text-xs font-medium uppercase tracking-wider mb-3">My Requests</p>
        {isLoading ? (
          <div className="space-y-2">{[1,2].map(i => <LoadingSkeleton key={i} className="h-20" />)}</div>
        ) : myRequests && myRequests.length > 0 ? (
          <div className="space-y-2">
            {myRequests.map((req, i) => <RequestCard key={req.id} request={req} index={i} isAdmin={false} />)}
          </div>
        ) : (
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-white/40 text-sm">No requests submitted yet</p>
          </div>
        )}
      </div>

      {/* All requests (admin) */}
      {isAdmin && allRequests && (
        <div>
          <p className="text-white/30 text-xs font-medium uppercase tracking-wider mb-3">All Requests</p>
          <div className="space-y-2">
            {allRequests.map((req, i) => <RequestCard key={req.id} request={req} index={i} isAdmin={true} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestCard({ request, index, isAdmin }: { request: MaintenanceRequest; index: number; isAdmin: boolean }) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const statusConfig = {
    pending: { color: "amber", label: "Pending", bg: "rgba(251,191,36,0.1)" },
    in_progress: { color: "blue" as const, label: "In Progress", bg: "rgba(59,130,246,0.1)" },
    fixed: { color: "cyan" as const, label: "Fixed ✓", bg: "rgba(0,245,255,0.1)" },
  };

  const config = statusConfig[request.status];

  const handleStatusChange = async (newStatus: "pending" | "in_progress" | "fixed") => {
    await supabase.from("maintenance_requests").update({ status: newStatus }).eq("id", request.id);
    queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-xl p-4"
      style={{ background: config.bg }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <NeonBadge color={config.color as "amber" | "blue" | "cyan"}>{config.label}</NeonBadge>
            <span className="text-white/30 text-xs">Room {request.room_number}</span>
          </div>
          <p className="text-white/80 text-sm">{request.issue}</p>
          <p className="text-white/30 text-xs mt-1">{formatTimeAgo(request.created_at)}</p>
        </div>
        {isAdmin && (
          <div className="flex flex-col gap-1">
            {request.status === "pending" && (
              <button onClick={() => handleStatusChange("in_progress")}
                className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 transition-all">
                Start
              </button>
            )}
            {request.status === "in_progress" && (
              <button onClick={() => handleStatusChange("fixed")}
                className="text-[10px] px-2 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/25 transition-all">
                <Check size={10} className="inline mr-0.5" />Fixed
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
