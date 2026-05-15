import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function getMoodEmoji(mood: string | null): string {
  const moods: Record<string, string> = {
    studying: "📚",
    sleeping: "😴",
    gaming: "🎮",
    music: "🎵",
    chill: "☁️",
    prayer: "🙏",
  };
  return mood ? moods[mood] || "✨" : "✨";
}

export function getAvailabilityColor(status: string): string {
  const colors: Record<string, string> = {
    in_room: "bg-emerald-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    available: "bg-cyan-500",
    sleeping: "bg-indigo-500",
  };
  return colors[status] || "bg-gray-500";
}

export function getAvailabilityLabel(status: string): string {
  const labels: Record<string, string> = {
    in_room: "In Room",
    away: "Away",
    busy: "Busy",
    available: "Available",
    sleeping: "Sleeping",
  };
  return labels[status] || "Unknown";
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
