"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

function GlobalRealtimeListener() {
  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase.channel("global-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notices" }, (payload) => {
        toast("🔔 New Notice Posted!", { icon: "📣", duration: 4000 });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_items" }, (payload) => {
        toast("🛍️ New item in the Marketplace!", { duration: 4000 });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "confessions" }, (payload) => {
        toast("🤫 Someone just confessed something...", { duration: 4000 });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes cache for blazing fast navigation
            retry: 1,
            refetchOnWindowFocus: false, // Prevents unnecessary refetches
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalRealtimeListener />
      {children}
    </QueryClientProvider>
  );
}
