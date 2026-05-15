import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: "glassnest-auth",
    }
  )
);

interface UIState {
  sidebarOpen: boolean;
  activeTab: string;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  activeTab: "home",
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

interface NotificationState {
  knockNotification: {
    fromUser: string;
    roomNumber: string;
  } | null;
  setKnockNotification: (
    notification: { fromUser: string; roomNumber: string } | null
  ) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  knockNotification: null,
  setKnockNotification: (notification) =>
    set({ knockNotification: notification }),
}));
