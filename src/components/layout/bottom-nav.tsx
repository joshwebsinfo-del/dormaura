"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, MessageCircle, PlaySquare, ShoppingBag, User } from "lucide-react";
import { useUIStore } from "@/store";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "home", label: "Home", icon: Home, href: "/home" },
  { id: "chats", label: "Chats", icon: MessageCircle, href: "/chats" },
  { id: "reels", label: "Reels", icon: PlaySquare, href: "/reels" },
  { id: "market", label: "Market", icon: ShoppingBag, href: "/marketplace" },
  { id: "profile", label: "Profile", icon: User, href: "/profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setActiveTab } = useUIStore();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="bottom-nav safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              href={item.href}
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 group"
            >
              <AnimatePresence>
                {active && (
                  <motion.div layoutId="nav-glow"
                    className="absolute inset-0 rounded-xl bg-cyan-500/10 border border-cyan-500/20"
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              <motion.div animate={{ scale: active ? 1.1 : 1 }} transition={{ duration: 0.2 }} className="relative z-10">
                <Icon size={20} className={cn("transition-all duration-200",
                  active ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]" : "text-white/40 group-hover:text-white/70"
                )} />
              </motion.div>

              <span className={cn("text-[10px] font-medium relative z-10 transition-colors duration-200",
                active ? "text-cyan-400" : "text-white/30 group-hover:text-white/50"
              )}>
                {item.label}
              </span>

              {active && (
                <motion.div layoutId="nav-dot"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400"
                  style={{ boxShadow: "0 0 6px rgba(0,245,255,0.8)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
