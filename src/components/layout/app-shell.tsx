"use client";

import { AuroraBackground } from "@/components/ui/glass";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import { KnockAlert } from "@/components/features/knock-alert";
import { useAuthStore } from "@/store";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types";
import toast from "react-hot-toast";
import Image from "next/image";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();
    const loadUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (profile) setUser(profile as User);
      }
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (profile) setUser(profile as User);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser]);

  // Listen globally to incoming Direct Messages and Live House Call alerts
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    // 1. Direct Messages listener
    const dmChannel = supabase
      .channel(`global-dms:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `receiver_id=eq.${user.id}` },
        async (payload: any) => {
          const senderId = payload.new.sender_id;
          // Fetch sender details to present beautiful toast notification
          const { data: sender } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", senderId)
            .single();
          const senderName = sender?.full_name || "Someone";
          toast.success(`💬 Message from ${senderName}: ${payload.new.content}`, {
            duration: 5000,
            icon: "💬",
          });
        }
      )
      .subscribe();

    // 2. Live Call Alerts listener
    const alertChannel = supabase
      .channel("dorm-house-call-signal")
      .on("broadcast", { event: "call-alert" }, (payload) => {
        const { hostName, hostPhoto } = payload.payload;
        if (user.full_name === hostName) return; // don't notify the host!

        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-sm w-full glass border border-rose-500/30 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-2xl backdrop-blur-xl bg-black/95`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-rose-500/20 relative bg-gradient-to-br from-rose-500 to-violet-500">
                  {hostPhoto ? (
                    <Image src={hostPhoto} alt={hostName} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                      {hostName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-white font-bold text-sm">📞 Live House Call</h4>
                  <p className="text-white/60 text-xs mt-0.5 truncate">{hostName} is calling...</p>
                </div>
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  window.location.href = "/live-call";
                }}
                className="bg-gradient-to-r from-rose-500 to-violet-600 hover:from-rose-600 hover:to-violet-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg border border-rose-400/20 active:scale-95 transition-all shrink-0"
              >
                Join Call
              </button>
            </div>
          ),
          { duration: 15000 }
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dmChannel);
      supabase.removeChannel(alertChannel);
    };
  }, [user]);

  return (
    <AuroraBackground>
      <div className="flex flex-col min-h-screen max-w-lg mx-auto relative">
        <TopBar />
        <main className="flex-1 px-4 pb-24 overflow-y-auto">
          {children}
        </main>
        <BottomNav />
        <KnockAlert />
      </div>
    </AuroraBackground>
  );
}
