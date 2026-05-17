"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Users,
  Package,
  HelpCircle,
  Search,
  Star,
  MessageSquareQuote,
  Crown,
} from "lucide-react";

const actions = [
  {
    id: "premium",
    label: "Gold Pro",
    icon: Crown,
    href: "/premium",
    color: "rgba(250,204,21,0.15)",
    glow: "rgba(250,204,21,0.4)",
    iconColor: "#facc15",
  },
  {
    id: "directory",
    label: "Directory",
    icon: Users,
    href: "/directory",
    color: "rgba(0,245,255,0.15)",
    glow: "rgba(0,245,255,0.3)",
    iconColor: "#00f5ff",
  },
  {
    id: "lost-found",
    label: "Lost & Found",
    icon: Search,
    href: "/lost-found",
    color: "rgba(251,146,60,0.15)",
    glow: "rgba(251,146,60,0.3)",
    iconColor: "#fb923c",
  },
  {
    id: "who-has",
    label: "Who Has?",
    icon: HelpCircle,
    href: "/who-has",
    color: "rgba(34,197,94,0.15)",
    glow: "rgba(34,197,94,0.3)",
    iconColor: "#22c55e",
  },
  {
    id: "marketplace",
    label: "Market",
    icon: Package,
    href: "/marketplace",
    color: "rgba(168,85,247,0.15)",
    glow: "rgba(168,85,247,0.3)",
    iconColor: "#a855f7",
  },
  {
    id: "polls",
    label: "Polls",
    icon: Star,
    href: "/polls",
    color: "rgba(250,204,21,0.15)",
    glow: "rgba(250,204,21,0.3)",
    iconColor: "#facc15",
  },
  {
    id: "confessions",
    label: "Confess",
    icon: MessageSquareQuote,
    href: "/confessions",
    color: "rgba(244,63,94,0.15)",
    glow: "rgba(244,63,94,0.3)",
    iconColor: "#f43f5e",
  },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <div className="overflow-x-auto -mx-1 px-1 custom-scrollbar">
      <div className="flex gap-2 pb-2" style={{ width: "max-content" }}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              id={`quick-action-${action.id}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push(action.href)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 min-w-[80px]"
              style={{
                background: action.color,
                borderColor: `${action.glow}50`,
              }}
            >
              <Icon
                size={20}
                style={{
                  color: action.iconColor,
                  filter: `drop-shadow(0 0 6px ${action.glow})`,
                }}
              />
              <span className="text-white/70 text-[11px] font-medium whitespace-nowrap">
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
