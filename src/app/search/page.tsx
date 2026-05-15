"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AuroraBackground, LoadingSkeleton } from "@/components/ui/glass";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import { Search, X } from "lucide-react";
import { getMoodEmoji, getAvailabilityColor, formatTimeAgo } from "@/lib/utils";
import Image from "next/image";
import type { User, Post } from "@/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"people" | "posts">("people");
  const supabase = createClient();

  const { data: people, isLoading: loadingPeople } = useQuery({
    queryKey: ["search-people", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data } = await supabase
        .from("users")
        .select("*")
        .or(`full_name.ilike.%${query}%,room_number.ilike.%${query}%`)
        .limit(20);
      return data as User[];
    },
    enabled: query.length > 1,
  });

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ["search-posts", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data } = await supabase
        .from("posts")
        .select("*, user:users(*)")
        .ilike("content", `%${query}%`)
        .limit(10);
      return data as Post[];
    },
    enabled: query.length > 1,
  });

  return (
    <AuroraBackground>
      <div className="flex flex-col min-h-screen max-w-lg mx-auto">
        <TopBar />
        <main className="flex-1 px-4 pb-24 overflow-y-auto">
          <div className="space-y-4 pt-2">
            <h1 className="text-white font-display font-bold text-xl">Search</h1>

            {/* Search input */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                id="global-search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students, rooms, posts..."
                className="w-full input-glass pl-10 pr-10"
              />
              {query && (
                <button onClick={() => setQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Tabs */}
            {query.length > 1 && (
              <div className="flex gap-2 p-1 glass rounded-xl">
                {(["people", "posts"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab
                        ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-400 border border-cyan-500/30"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {tab === "people" ? `👤 People (${people?.length || 0})` : `📝 Posts (${posts?.length || 0})`}
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            {query.length > 1 ? (
              activeTab === "people" ? (
                loadingPeople ? (
                  <div className="space-y-2">{[1,2,3].map(i => <LoadingSkeleton key={i} className="h-16" />)}</div>
                ) : people && people.length > 0 ? (
                  <div className="space-y-2">
                    {people.map((person, i) => (
                      <motion.div key={person.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="glass rounded-xl p-3 flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                            {person.profile_photo ? (
                              <Image src={person.profile_photo} alt={person.full_name} width={40} height={40} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold"
                                style={{ background: "linear-gradient(135deg, rgba(0,245,255,0.2), rgba(124,58,237,0.2))" }}>
                                {person.full_name?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#050508] ${getAvailabilityColor(person.availability_status)}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-white font-semibold text-sm">{person.full_name}</p>
                            {person.mood_status && <span className="text-sm">{getMoodEmoji(person.mood_status)}</span>}
                          </div>
                          <p className="text-white/40 text-xs">Room {person.room_number}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="glass rounded-2xl p-6 text-center">
                    <p className="text-white/50 text-sm">No students found</p>
                  </div>
                )
              ) : (
                loadingPosts ? (
                  <div className="space-y-3">{[1,2].map(i => <LoadingSkeleton key={i} className="h-24" />)}</div>
                ) : posts && posts.length > 0 ? (
                  <div className="space-y-3">
                    {posts.map((post, i) => (
                      <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="glass rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-white text-xs font-bold">
                            {post.user?.full_name?.charAt(0)}
                          </div>
                          <span className="text-white/60 text-xs">{post.user?.full_name}</span>
                          <span className="text-white/20 text-xs ml-auto">{formatTimeAgo(post.created_at)}</span>
                        </div>
                        <p className="text-white/80 text-sm line-clamp-3">{post.content}</p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="glass rounded-2xl p-6 text-center">
                    <p className="text-white/50 text-sm">No posts found</p>
                  </div>
                )
              )
            ) : (
              <div className="glass rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-white/60 font-medium">Search the nest</p>
                <p className="text-white/30 text-sm mt-1">Find students, rooms, or posts</p>
              </div>
            )}
          </div>
        </main>
        <BottomNav />
      </div>
    </AuroraBackground>
  );
}
