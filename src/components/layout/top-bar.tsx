"use client";

import { motion } from "framer-motion";
import { Bell, Search, Zap, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { useAuthStore } from "@/store";
import { NotificationDrawer } from "@/components/features/notification-drawer";

export function TopBar({ title }: { title?: string }) {
  const { user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 px-4"
        style={{
          background: "linear-gradient(to bottom, rgba(5,5,8,0.9) 0%, rgba(5,5,8,0.0) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center justify-between py-4">
          <button onClick={() => router.push("/home")} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(0,245,255,0.2), rgba(124,58,237,0.2))", border: "1px solid rgba(0,245,255,0.3)", boxShadow: "0 0 20px rgba(0,245,255,0.2)" }}>
              <Zap size={18} className="text-cyan-400" />
            </div>
            <span className="font-display font-bold text-white text-base tracking-tight">
              Dorm<span className="text-cyan-400">Aura</span>
            </span>
          </button>

          {title && <span className="text-white/80 font-medium text-sm">{title}</span>}

          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/search")}
              className="w-9 h-9 rounded-xl glass-sm flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <Search size={17} />
            </button>

            {/* House Live Call button */}
            <motion.button
              onClick={() => router.push("/live-call")}
              animate={{ boxShadow: ["0 0 0px rgba(239,68,68,0)", "0 0 12px rgba(239,68,68,0.5)", "0 0 0px rgba(239,68,68,0)"] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="relative w-9 h-9 rounded-xl glass-sm flex items-center justify-center text-rose-400 hover:bg-rose-500/10 transition-all"
              title="House Live Call"
            >
              <Radio size={17} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping opacity-75" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500" />
            </motion.button>

            <button onClick={() => setIsNotificationOpen(true)}
              className="relative w-9 h-9 rounded-xl glass-sm flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <Bell size={17} className={unreadCount > 0 ? "text-cyan-400 fill-cyan-400/10 animate-bounce" : ""} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-cyan-500 text-black text-[9px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                  {unreadCount}
                </span>
              )}
            </button>

            {user && (
              <button onClick={() => router.push("/profile")}
                className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/40 transition-all">
                {user.profile_photo ? (
                  <Image src={user.profile_photo} alt={user.full_name} width={36} height={36} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ background: "linear-gradient(135deg, rgba(0,245,255,0.3), rgba(124,58,237,0.3))" }}>
                    {user.full_name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.header>

      <NotificationDrawer 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)}
        onNotificationsFetched={(count) => setUnreadCount(count)}
      />
    </>
  );
}
