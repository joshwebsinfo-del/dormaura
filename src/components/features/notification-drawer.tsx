"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MessageCircle, MessageSquare, DoorOpen, Megaphone, Check, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { formatTimeAgo } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: "like" | "comment" | "dm" | "knock" | "announcement" | "call";
  title: string;
  content: string;
  link?: string;
  read: boolean;
  created_at: string;
  actor?: {
    id: string;
    full_name: string;
    profile_photo: string | null;
    room_number: string | null;
  };
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationsFetched?: (count: number) => void;
}

export function NotificationDrawer({ isOpen, onClose, onNotificationsFetched }: NotificationDrawerProps) {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          actor:users!actor_id(id, full_name, profile_photo, room_number)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setNotifications(data || []);
      
      const unread = (data || []).filter(n => !n.read).length;
      if (onNotificationsFetched) {
        onNotificationsFetched(unread);
      }
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  // Set up real-time subscription for instant updates
  useEffect(() => {
    if (!user) return;

    // Fetch initial unread count on mount
    const checkUnreadCount = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, read")
        .eq("user_id", user.id)
        .eq("read", false);
      
      if (onNotificationsFetched) {
        onNotificationsFetched(data?.length || 0);
      }
    };
    checkUnreadCount();

    const channel = supabase
      .channel(`user-notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
          // Vibrate if mobile supported
          if ("vibrate" in navigator) {
            navigator.vibrate(80);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const handleMarkAllRead = async () => {
    if (!user || notifications.length === 0) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      if (onNotificationsFetched) {
        onNotificationsFetched(0);
      }
      toast.success("All marked as read ✨");
    } catch (err: any) {
      toast.error("Failed to mark read");
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Navigate and mark as read
    if (!notif.read) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notif.id);
      
      setNotifications(prev => 
        prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
      );
      
      const unread = notifications.filter(n => n.id !== notif.id && !n.read).length;
      if (onNotificationsFetched) {
        onNotificationsFetched(unread);
      }
    }

    onClose();

    if (notif.link) {
      router.push(notif.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like":
        return (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Heart size={16} className="fill-rose-500/10" />
          </div>
        );
      case "comment":
        return (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <MessageCircle size={16} />
          </div>
        );
      case "dm":
        return (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <MessageSquare size={16} />
          </div>
        );
      case "knock":
        return (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <DoorOpen size={16} />
          </div>
        );
      case "call":
        return (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Radio size={16} />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Megaphone size={16} />
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
          />

          {/* Drawer container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-black/75 backdrop-blur-2xl border-l border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-lg tracking-tight">Activity Center</h3>
                <p className="text-white/40 text-xs">Real-time alerts and interactions</p>
              </div>

              <div className="flex items-center gap-2">
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-white/50 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all flex items-center gap-1.5 text-xs font-semibold"
                    title="Mark all as read"
                  >
                    <Check size={14} />
                    <span>Read all</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all border border-white/5"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {loading ? (
                <div className="space-y-3 pt-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="glass rounded-2xl p-4 flex gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-xl bg-white/5 shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 bg-white/10 rounded w-1/3" />
                        <div className="h-2.5 bg-white/5 rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    layoutId={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`relative glass-sm rounded-2xl p-4 flex gap-3 border transition-all cursor-pointer group ${
                      notif.read
                        ? "bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.03] hover:border-white/[0.08]"
                        : "bg-gradient-to-r from-cyan-950/20 via-black/40 to-black/40 border-cyan-500/25 hover:border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.03)]"
                    }`}
                  >
                    {/* Unread indicator */}
                    {!notif.read && (
                      <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                    )}

                    {/* Actor avatar or icon */}
                    <div className="shrink-0 relative">
                      {notif.actor?.profile_photo ? (
                        <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10">
                          <Image
                            src={notif.actor.profile_photo}
                            alt=""
                            width={36}
                            height={36}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        getIcon(notif.type)
                      )}
                    </div>

                    {/* Text content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-white font-bold text-[13px] tracking-tight">
                          {notif.title}
                        </span>
                        <span className="text-[9px] text-white/30 font-medium whitespace-nowrap">
                          {formatTimeAgo(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-white/60 text-xs mt-1 leading-relaxed break-words pr-2">
                        {notif.content}
                      </p>
                      {notif.actor && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">
                            Room {notif.actor.room_number || "N/A"}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-3xl mb-4 relative">
                    🔔
                    <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-white/20 animate-ping" />
                  </div>
                  <h4 className="text-white/80 font-bold text-sm">Quiet in the Nest</h4>
                  <p className="text-white/30 text-xs mt-1 max-w-[200px] mx-auto leading-relaxed">
                    You have no new notifications. Activity will show up here!
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
