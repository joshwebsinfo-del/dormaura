"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQuery } from "@tanstack/react-query";
import { AuroraBackground, PageHeader } from "@/components/ui/glass";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import {
  Users, Shield, Package, Wrench, Bell, MessageSquareQuote,
  TrendingUp, Check, X, Trash2
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const supabase = createClient();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, posts, maintenance, marketplace, confessions] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("maintenance_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("marketplace_items").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("confessions").select("id", { count: "exact", head: true }).eq("approved", false),
      ]);
      return {
        users: users.count || 0,
        posts: posts.count || 0,
        pendingMaintenance: maintenance.count || 0,
        activeListings: marketplace.count || 0,
        pendingConfessions: confessions.count || 0,
      };
    },
  });

  const { data: recentUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data;
    },
  });

  if (user?.role !== "admin" && user?.role !== "moderator") {
    return (
      <AuroraBackground>
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="glass rounded-2xl p-8 text-center max-w-xs">
            <Shield size={40} className="text-rose-400 mx-auto mb-4" />
            <p className="text-white font-semibold">Access Denied</p>
            <p className="text-white/40 text-sm mt-2">Admin access required</p>
          </div>
        </div>
      </AuroraBackground>
    );
  }

  const statCards = [
    { label: "Total Students", value: stats?.users || 0, icon: Users, color: "#00f5ff", bg: "rgba(0,245,255,0.08)" },
    { label: "Total Posts", value: stats?.posts || 0, icon: TrendingUp, color: "#a855f7", bg: "rgba(168,85,247,0.08)" },
    { label: "Pending Maintenance", value: stats?.pendingMaintenance || 0, icon: Wrench, color: "#fb923c", bg: "rgba(251,146,60,0.08)" },
    { label: "Market Listings", value: stats?.activeListings || 0, icon: Package, color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
    { label: "Pending Confessions", value: stats?.pendingConfessions || 0, icon: MessageSquareQuote, color: "#f43f5e", bg: "rgba(244,63,94,0.08)" },
  ];

  return (
    <AuroraBackground>
      <div className="flex flex-col min-h-screen max-w-lg mx-auto">
        <TopBar />
        <main className="flex-1 px-4 pb-24 overflow-y-auto">
          <div className="space-y-4 pt-2">
            <PageHeader
              title="Admin Dashboard"
              subtitle="Manage the GlassNest"
              icon={<Shield size={18} />}
            />

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {statCards.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.07 }}
                    className="glass rounded-2xl p-4"
                    style={{ background: stat.bg }}
                  >
                    <Icon size={20} style={{ color: stat.color }} className="mb-2" />
                    <p className="text-white font-bold text-2xl font-display">{stat.value}</p>
                    <p className="text-white/40 text-xs mt-0.5">{stat.label}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* User management */}
            <div>
              <p className="text-white/30 text-xs font-medium uppercase tracking-wider mb-3">
                Recent Users
              </p>
              <div className="space-y-2">
                {recentUsers?.map((u: any, i: number) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, rgba(0,245,255,0.2), rgba(124,58,237,0.2))" }}>
                        {u.full_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{u.full_name}</p>
                        <p className="text-white/30 text-xs">Room {u.room_number} · {u.role}</p>
                      </div>
                    </div>
                    <AdminUserActions userId={u.id} role={u.role} onUpdate={refetchUsers} />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    </AuroraBackground>
  );
}

function AdminUserActions({ userId, role, onUpdate }: { userId: string; role: string; onUpdate: () => void }) {
  const supabase = createClient();
  const { user } = useAuthStore();

  const handleRoleChange = async (newRole: string) => {
    await supabase.from("users").update({ role: newRole }).eq("id", userId);
    onUpdate();
    toast.success(`Role updated to ${newRole}`);
  };

  const handleDelete = async () => {
    if (!confirm("Remove this student from GlassNest?")) return;
    await supabase.from("users").delete().eq("id", userId);
    onUpdate();
    toast.success("Student removed");
  };

  if (userId === user?.id) return null;

  return (
    <div className="flex items-center gap-1">
      {role !== "moderator" && (
        <button onClick={() => handleRoleChange("moderator")}
          className="text-[10px] px-2 py-1 rounded-lg bg-violet-500/15 text-violet-400 border border-violet-500/20 hover:bg-violet-500/25 transition-all">
          Mod
        </button>
      )}
      {role !== "student" && (
        <button onClick={() => handleRoleChange("student")}
          className="text-[10px] px-2 py-1 rounded-lg bg-white/08 text-white/50 border border-white/10 hover:bg-white/15 transition-all">
          Student
        </button>
      )}
      <button onClick={handleDelete}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400/50 hover:text-rose-400 hover:bg-rose-400/10 transition-all">
        <Trash2 size={11} />
      </button>
    </div>
  );
}
