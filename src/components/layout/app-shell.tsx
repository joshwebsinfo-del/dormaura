"use client";

import { AuroraBackground } from "@/components/ui/glass";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import { KnockAlert } from "@/components/features/knock-alert";
import { useAuthStore } from "@/store";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { setUser } = useAuthStore();

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
