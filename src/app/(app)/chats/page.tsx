"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/glass";
import { MessageCircle, Hash, Send, Users, MessageSquare, Flame, Clock, Plus, ShieldAlert, Sparkles, UserCheck } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { formatTimeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

type Channel = { id: string; name: string; description: string };
type Message = {
  id: string;
  channel_id: string;
  content: string;
  created_at: string;
  user: { id: string; full_name: string; profile_photo: string; role: string };
};

type DirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender?: { id: string; full_name: string; profile_photo: string };
  receiver?: { id: string; full_name: string; profile_photo: string };
};

type UserType = {
  id: string;
  full_name: string;
  profile_photo: string;
  room_number: string;
  availability_status: string;
};

export default function ChatsPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"community" | "personal">("community");
  
  // Community Chat State
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [content, setContent] = useState("");
  
  // Personal Chat State
  const [activeRecipient, setActiveRecipient] = useState<UserType | null>(null);
  const [dmContent, setDmContent] = useState("");
  const [dmType, setDmType] = useState<"text" | "whisper" | "borrow">("text");
  const [whisperTime, setWhisperTime] = useState(10); // seconds
  const [borrowItem, setBorrowItem] = useState("Iron 👔");
  const [borrowDuration, setBorrowDuration] = useState(30); // minutes
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getMessageSnippet = (content: string) => {
    try {
      if (content.startsWith("{")) {
        const parsed = JSON.parse(content);
        if (parsed.type === "whisper") return "🔥 Secret Whisper";
        if (parsed.type === "borrow") return `🤝 Borrow: ${parsed.item}`;
      }
    } catch (e) {}
    return content.length > 25 ? content.substring(0, 25) + "..." : content;
  };


  // Handle URL search param to auto-switch to Personal chat
  useEffect(() => {
    const userId = searchParams.get("userId");
    if (userId && user) {
      setActiveTab("personal");
      // Fetch recipient details
      const fetchRecipient = async () => {
        const { data } = await supabase.from("users").select("*").eq("id", userId).single();
        if (data) {
          setActiveRecipient(data as UserType);
        }
      };
      fetchRecipient();
    }
  }, [searchParams, user, supabase]);

  // Fetch Channels
  const { data: channels } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data } = await supabase.from("channels").select("*").order("name");
      if (data && data.length > 0 && !activeChannel) {
        setActiveChannel(data[0]);
      }
      return data as Channel[];
    },
  });

  // Fetch Messages for active channel
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["channel_messages", activeChannel?.id],
    enabled: activeTab === "community" && !!activeChannel?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("channel_messages")
        .select("*, user:users(id, full_name, profile_photo, role)")
        .eq("channel_id", activeChannel!.id)
        .order("created_at", { ascending: true });
      return data as Message[];
    },
  });

  // Fetch Residents list for DMs
  const { data: residents } = useQuery({
    queryKey: ["residents"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("*").order("full_name");
      return (data || []) as UserType[];
    },
  });

  // Fetch all DMs involving the current user to build the "Active Chats" list
  const { data: allDmsForActiveChats } = useQuery({
    queryKey: ["active_chat_messages", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select(`
          *,
          sender:users!sender_id(id, full_name, profile_photo, room_number),
          receiver:users!receiver_id(id, full_name, profile_photo, room_number)
        `)
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      return data as DirectMessage[];
    }
  });

  // Group direct messages by other user for the active threads section
  const activeChats: Array<{ user: { id: string; full_name: string; profile_photo: string; room_number: string }; lastMessage: DirectMessage }> = [];
  if (allDmsForActiveChats && user) {
    const seenUsers = new Set<string>();
    for (const msg of allDmsForActiveChats) {
      const otherUser = msg.sender_id === user.id ? msg.receiver : msg.sender;
      if (!otherUser) continue;
      if (!seenUsers.has(otherUser.id)) {
        seenUsers.add(otherUser.id);
        activeChats.push({
          user: otherUser as any,
          lastMessage: msg,
        });
      }
    }
  }

  // Fetch Direct Messages for active recipient
  const { data: directMessages, isLoading: dmsLoading } = useQuery({
    queryKey: ["direct_messages", activeRecipient?.id],
    enabled: activeTab === "personal" && !!activeRecipient?.id && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select(`
          *,
          sender:users!sender_id(id, full_name, profile_photo),
          receiver:users!receiver_id(id, full_name, profile_photo)
        `)
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${activeRecipient!.id}),and(sender_id.eq.${activeRecipient!.id},receiver_id.eq.${user!.id})`)
        .order("created_at", { ascending: true });
      return data as DirectMessage[];
    },
  });

  // Realtime subscription for community channels
  useEffect(() => {
    if (!activeChannel || activeTab !== "community") return;

    const channel = supabase
      .channel(`room:${activeChannel.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "channel_messages", filter: `channel_id=eq.${activeChannel.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["channel_messages", activeChannel.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChannel, queryClient, supabase, activeTab]);

  // Realtime subscription for direct messages (global so you get updates in real time)
  useEffect(() => {
    if (!user) return;

    const globalDmsChannel = supabase
      .channel("global_dms")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["active_chat_messages", user.id] });
          if (activeRecipient) {
            queryClient.invalidateQueries({ queryKey: ["direct_messages", activeRecipient.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalDmsChannel);
    };
  }, [activeRecipient, queryClient, supabase, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, directMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user || !activeChannel) return;

    const tempContent = content.trim();
    setContent(""); // optimistic clear

    const { error } = await supabase.from("channel_messages").insert({
      channel_id: activeChannel.id,
      user_id: user.id,
      content: tempContent,
    });

    if (error) {
      toast.error("Failed to send message");
      setContent(tempContent);
    }
  };

  const handleSendDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeRecipient) return;

    let payload = "";
    if (dmType === "text") {
      if (!dmContent.trim()) return;
      payload = dmContent.trim();
    } else if (dmType === "whisper") {
      if (!dmContent.trim()) return;
      payload = JSON.stringify({
        type: "whisper",
        text: dmContent.trim(),
        expiresAt: Date.now() + whisperTime * 1000,
        duration: whisperTime
      });
    } else if (dmType === "borrow") {
      payload = JSON.stringify({
        type: "borrow",
        item: borrowItem,
        endsAt: Date.now() + borrowDuration * 60 * 1000,
        duration: borrowDuration,
        status: "active"
      });
    }

    setDmContent("");
    setDmType("text"); // Reset to standard text

    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: activeRecipient.id,
      content: payload,
    });

    if (error) {
      toast.error("Failed to send direct message");
    } else {
      queryClient.invalidateQueries({ queryKey: ["direct_messages", activeRecipient.id] });
      
      // Determine what content to show in the notification
      let displayContent = "Sent you a message";
      if (dmType === "text") {
        displayContent = payload;
      } else if (dmType === "whisper") {
        displayContent = "🕵️ Sent you a vanishing whisper message";
      } else if (dmType === "borrow") {
        try {
          const parsed = JSON.parse(payload);
          displayContent = `🤝 Requested to borrow: "${parsed.item}"`;
        } catch {
          displayContent = "🤝 Requested to borrow an item";
        }
      }

      await supabase.from("notifications").insert({
        user_id: activeRecipient.id,
        actor_id: user.id,
        type: "dm",
        title: "New Direct Message 💬",
        content: displayContent.length > 50 ? `${displayContent.slice(0, 50)}...` : displayContent,
        link: `/chats?userId=${user.id}`,
      });
    }
  };

  const filteredResidents = residents?.filter(r => 
    r.id !== user?.id && 
    r.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mx-4 -mt-4 bg-black/40 relative">
      {/* Top Header Dashboard Tabs */}
      <div className="px-4 pt-4 pb-2 border-b border-white/10 glass shrink-0 z-10 relative">
        <div className="flex justify-between items-center mb-2">
          <PageHeader title="Nest Connect" subtitle="High bandwidth communication" icon={<MessageCircle size={18} />} />
          
          {/* Tab Switcher */}
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
            <button 
              onClick={() => setActiveTab("community")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "community" ? "bg-cyan-500 text-black" : "text-white/60 hover:text-white"
              }`}
            >
              <Users size={12} /> Community
            </button>
            <button 
              onClick={() => setActiveTab("personal")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "personal" ? "bg-cyan-500 text-black" : "text-white/60 hover:text-white"
              }`}
            >
              <MessageSquare size={12} /> Personal Chat
            </button>
          </div>
        </div>

        {/* Tab 1 Header: Channels list */}
        {activeTab === "community" && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar mt-3 pb-1">
            {channels?.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveChannel(c)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  activeChannel?.id === c.id 
                    ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" 
                    : "glass-sm text-white/60 hover:text-white"
                }`}
              >
                <Hash size={14} /> {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Tab 2 Header: DM search / Recipient List */}
        {activeTab === "personal" && (
          <div className="space-y-3 mt-2">
            <div className="flex gap-3 items-center">
              <input 
                type="text"
                placeholder="Search roommate to chat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 input-glass py-1.5 px-3 text-xs rounded-xl"
              />
              {activeRecipient && (
                <button 
                  onClick={() => setActiveRecipient(null)}
                  className="flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl px-3 py-1 text-cyan-400 text-xs font-semibold transition-all group"
                  title="Click to clear recipient and select another"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Chatting with {activeRecipient.full_name}</span>
                  <span className="text-[10px] text-white/40 ml-1 group-hover:text-white transition-colors">✕</span>
                </button>
              )}
            </div>

            {/* Premium Swipable Resident Avatars Carousel */}
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1.5 px-1">
              {filteredResidents?.map((r) => {
                const isSelected = activeRecipient?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveRecipient(r)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                  >
                    <div className={`w-11 h-11 rounded-full overflow-hidden border-2 transition-all p-0.5 ${
                      isSelected 
                        ? "border-cyan-500 shadow-md shadow-cyan-500/20 scale-105" 
                        : "border-white/10 group-hover:border-white/30"
                    }`}>
                      {r.profile_photo ? (
                        <Image src={r.profile_photo} alt="" width={40} height={40} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-white/5 text-white/60 rounded-full">
                          {r.full_name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className={`text-[9px] max-w-[50px] truncate font-medium ${
                      isSelected ? "text-cyan-400 font-semibold" : "text-white/40 group-hover:text-white/60"
                    }`}>
                      {r.full_name?.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main chat window container */}
      <div className="flex-1 flex overflow-hidden">
        {/* If Personal Tab: Left Column selector for users */}
        {activeTab === "personal" && (
          <div className="w-64 border-r border-white/5 bg-black/20 overflow-y-auto hidden md:flex flex-col shrink-0">
            {/* Active Chats Section */}
            <div className="p-3 text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center justify-between border-b border-white/5">
              <span>Active Chats</span>
              {activeChats.length > 0 && <span className="bg-cyan-500/20 px-1.5 py-0.5 rounded text-[8px] text-cyan-300 font-bold">{activeChats.length}</span>}
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1 p-2">
              {activeChats.length === 0 ? (
                <div className="py-8 px-4 text-center text-white/30 text-[11px] leading-relaxed">
                  <p>No active chats yet.</p>
                  <p className="mt-1 text-[10px]">Tap a roommate from the carousel to start!</p>
                </div>
              ) : (
                activeChats.map(({ user: r, lastMessage: msg }) => {
                  const isSelected = activeRecipient?.id === r.id;
                  const snippet = getMessageSnippet(msg.content);
                  const isUnread = !msg.read && msg.sender_id === r.id;
                  
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveRecipient(r as any)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left relative group ${
                        isSelected 
                          ? "bg-cyan-500/10 border border-cyan-500/20 text-white" 
                          : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-white/5 p-0.5">
                        {r.profile_photo ? (
                          <Image src={r.profile_photo} alt="" width={32} height={32} className="w-full h-full object-cover rounded-md" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white/40">{r.full_name?.charAt(0)}</div>
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <p className="text-xs font-semibold truncate leading-none mb-0.5">{r.full_name}</p>
                          <span className="text-[8px] text-white/20 shrink-0 font-medium">{formatTimeAgo(msg.created_at)}</span>
                        </div>
                        <p className={`text-[10px] truncate leading-none ${isUnread ? "text-cyan-400 font-semibold" : "text-white/30"}`}>
                          {snippet}
                        </p>
                      </div>

                      {isUnread && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-md shadow-cyan-500/50" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Other Roommates list */}
            <div className="p-3 text-[10px] uppercase font-bold text-white/30 tracking-wider border-t border-white/5">
              More Roommates
            </div>
            <div className="h-48 overflow-y-auto space-y-1 px-2 pb-4">
              {filteredResidents?.filter(r => !activeChats.some(ac => ac.user.id === r.id)).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveRecipient(r)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left ${
                    activeRecipient?.id === r.id 
                      ? "bg-white/10 text-white" 
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="w-6 h-6 rounded overflow-hidden shrink-0 border border-white/5 bg-white/5 flex items-center justify-center text-[10px] text-white/40">
                    {r.profile_photo ? (
                      <Image src={r.profile_photo} alt="" width={24} height={24} className="w-full h-full object-cover" />
                    ) : (
                      <span>{r.full_name?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium truncate leading-none mb-0.5">{r.full_name}</p>
                    <p className="text-[8px] text-white/25 leading-none">Room {r.room_number}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat message content view */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Messages lists */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === "community" ? (
              // 1. Community Messages List
              messagesLoading ? (
                <div className="flex justify-center py-10"><div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" /></div>
              ) : messages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/40 gap-3">
                  <Users size={32} className="opacity-50" />
                  <p>Welcome to #{activeChannel?.name}. Start chatting!</p>
                </div>
              ) : (
                messages?.map((msg, i) => {
                  const isMe = msg.user.id === user?.id;
                  const showAvatar = i === messages.length - 1 || messages[i + 1].user.id !== msg.user.id;
                  
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                      {!isMe && (
                        <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                          {msg.user.profile_photo ? (
                            <Image src={msg.user.profile_photo} alt="" width={32} height={32} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-white/50">{msg.user.full_name?.charAt(0)}</span>
                          )}
                        </div>
                      )}

                      <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
                        {!isMe && showAvatar && (
                          <span className="text-[10px] text-white/40 mb-1 ml-1 flex items-center gap-1">
                            {msg.user.full_name} 
                            {msg.user.role === 'admin' && <span className="text-cyan-400">✓</span>}
                          </span>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed ${
                          isMe 
                            ? "bg-cyan-500 text-black rounded-br-sm" 
                            : "glass border border-white/5 text-white/90 rounded-bl-sm"
                        }`}>
                          {msg.content}
                        </div>
                        {showAvatar && (
                          <span className="text-[9px] text-white/20 mt-1 mx-1">{formatTimeAgo(msg.created_at)}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              // 2. Personal DM Messages List with custom renderers for Whisper & Borrow
              !activeRecipient ? (
                // No recipient selected screen
                <div className="flex flex-col items-center justify-center h-full text-white/40 gap-3 p-6 text-center">
                  <div className="text-4xl mb-2">💬</div>
                  <h3 className="text-white font-bold">Your Personal Workspace</h3>
                  <p className="text-xs text-white/50 max-w-xs mb-3">Select roommate from the active chats list below, the horizontal carousel above, or use the search bar to find someone.</p>
                  
                  {/* Active chats list on mobile */}
                  <div className="w-full max-w-sm text-left bg-white/5 border border-white/10 rounded-3xl p-4 shadow-xl">
                    <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2.5 pb-1 border-b border-white/5 flex justify-between items-center">
                      <span>Active Conversation Threads</span>
                      {activeChats.length > 0 && <span className="bg-cyan-500/20 px-1 py-0.5 rounded text-[8px] text-cyan-300 font-bold">{activeChats.length}</span>}
                    </p>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {activeChats.length === 0 ? (
                        <p className="text-[11px] text-white/20 italic py-4 text-center">No active chats. Start one by tapping roommate avatars above!</p>
                      ) : (
                        activeChats.map(({ user: r, lastMessage: msg }) => {
                          const snippet = getMessageSnippet(msg.content);
                          const isUnread = !msg.read && msg.sender_id === r.id;
                          
                          return (
                            <button 
                              key={r.id} 
                              onClick={() => setActiveRecipient(r as any)} 
                              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs text-white/70 hover:bg-white/10 transition-colors relative text-left"
                            >
                              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/5 bg-white/5">
                                {r.profile_photo ? (
                                  <Image src={r.profile_photo} alt="" width={32} height={32} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white/40">{r.full_name?.charAt(0)}</div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-baseline mb-0.5">
                                  <p className="font-semibold truncate text-[11px] text-white leading-none mb-0.5">{r.full_name}</p>
                                  <span className="text-[8px] text-white/20 font-medium shrink-0">{formatTimeAgo(msg.created_at)}</span>
                                </div>
                                <p className={`text-[10px] truncate leading-none ${isUnread ? "text-cyan-400 font-semibold" : "text-white/40"}`}>
                                  {snippet}
                                </p>
                              </div>
                              {isUnread && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0 ml-1" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : dmsLoading ? (
                <div className="flex justify-center py-10"><div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" /></div>
              ) : directMessages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/40 gap-3">
                  <Sparkles size={32} className="text-cyan-400 animate-pulse" />
                  <p>Starting high-security chat with {activeRecipient.full_name}.</p>
                  <p className="text-xs text-white/20">All personal chats are direct, safe, and lightning fast.</p>
                </div>
              ) : (
                directMessages?.map((msg, i) => {
                  const isMe = msg.sender_id === user?.id;
                  const showAvatar = i === directMessages.length - 1 || directMessages[i + 1].sender_id !== msg.sender_id;

                  // Parse message type (Whisper, Borrow or Text)
                  let isJson = false;
                  let parsed: any = null;
                  try {
                    if (msg.content.startsWith("{")) {
                      parsed = JSON.parse(msg.content);
                      isJson = true;
                    }
                  } catch (e) {}

                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                      {!isMe && (
                        <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                          {activeRecipient.profile_photo ? (
                            <Image src={activeRecipient.profile_photo} alt="" width={32} height={32} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-white/50">{activeRecipient.full_name?.charAt(0)}</span>
                          )}
                        </div>
                      )}

                      <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
                        {!isMe && showAvatar && (
                          <span className="text-[10px] text-white/40 mb-1 ml-1 flex items-center gap-1">
                            {activeRecipient.full_name}
                          </span>
                        )}
                        {isJson && parsed.type === "whisper" ? (
                          // A. WHISPER (Vanishing Message Bubble)
                          <WhisperBubble text={parsed.text} expiresAt={parsed.expiresAt} isMe={isMe} />
                        ) : isJson && parsed.type === "borrow" ? (
                          // B. BORROW TIMER BUBBLE
                          <BorrowBubble item={parsed.item} endsAt={parsed.endsAt} isMe={isMe} duration={parsed.duration} />
                        ) : (
                          // C. STANDARD DM BUBBLE
                          <div className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed ${
                            isMe 
                              ? "bg-cyan-500 text-black rounded-br-sm" 
                              : "glass border border-white/5 text-white/90 rounded-bl-sm"
                          }`}>
                            {msg.content}
                          </div>
                        )}
                        {showAvatar && (
                          <span className="text-[9px] text-white/20 mt-1 mx-1">{formatTimeAgo(msg.created_at)}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom input section */}
          <div className="p-3 shrink-0 glass border-t border-white/5 pb-6">
            {activeTab === "community" ? (
              // Community Input Form
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl overflow-hidden focus-within:border-cyan-500/50 transition-colors">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`Message #${activeChannel?.name || "..."}`}
                    className="w-full bg-transparent text-white placeholder-white/30 px-4 py-3 text-[15px] resize-none outline-none max-h-32 min-h-[44px]"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!content.trim()}
                  className="w-12 h-12 shrink-0 rounded-full bg-cyan-500 flex items-center justify-center text-black disabled:opacity-50 hover:bg-cyan-400 transition-colors"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </form>
            ) : (
              // Personal DM Input Form with innovative controls (Whisper, Borrow)
              activeRecipient && (
                <div className="space-y-3">
                  {/* Innovative Mode Selectors */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setDmType("text")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                        dmType === "text" 
                          ? "bg-white/10 text-white border-white/20" 
                          : "text-white/40 border-transparent hover:text-white/70"
                      }`}
                    >
                      💬 Standard Text
                    </button>
                    <button 
                      onClick={() => setDmType("whisper")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                        dmType === "whisper" 
                          ? "bg-orange-500/20 text-orange-400 border-orange-500/30" 
                          : "text-white/40 border-transparent hover:text-orange-400"
                      }`}
                    >
                      <Flame size={12} /> Whisper
                    </button>
                    <button 
                      onClick={() => setDmType("borrow")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                        dmType === "borrow" 
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" 
                          : "text-white/40 border-transparent hover:text-cyan-400"
                      }`}
                    >
                      <Clock size={12} /> Borrow Timer
                    </button>
                  </div>

                  {/* Context controls based on selection */}
                  {dmType === "whisper" && (
                    <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-2.5 text-xs text-orange-400">
                      <Flame size={14} className="animate-pulse" />
                      <span>Message will vanish for recipient after</span>
                      <select 
                        value={whisperTime} 
                        onChange={(e) => setWhisperTime(parseInt(e.target.value))}
                        className="bg-black/60 border border-white/10 rounded px-1.5 py-0.5 text-white outline-none"
                      >
                        <option value={10}>10 seconds</option>
                        <option value={30}>30 seconds</option>
                        <option value={60}>1 minute</option>
                        <option value={300}>5 minutes</option>
                      </select>
                    </div>
                  )}

                  {dmType === "borrow" && (
                    <div className="space-y-2 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-3 text-xs text-cyan-400">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <Clock size={14} className="animate-pulse" />
                        <span>Borrow Integration Form</span>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] text-white/40 uppercase block mb-1">Item to borrow</label>
                          <input 
                            type="text" 
                            value={borrowItem}
                            onChange={(e) => setBorrowItem(e.target.value)}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-white outline-none text-xs"
                          />
                        </div>
                        <div className="w-24">
                          <label className="text-[10px] text-white/40 uppercase block mb-1">Duration</label>
                          <select 
                            value={borrowDuration}
                            onChange={(e) => setBorrowDuration(parseInt(e.target.value))}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-white outline-none text-xs"
                          >
                            <option value={5}>5 mins</option>
                            <option value={15}>15 mins</option>
                            <option value={30}>30 mins</option>
                            <option value={60}>1 hour</option>
                            <option value={120}>2 hours</option>
                            <option value={1440}>1 day</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Submission */}
                  <form onSubmit={handleSendDM} className="flex items-end gap-2">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl overflow-hidden focus-within:border-cyan-500/50 transition-colors">
                      {dmType === "borrow" ? (
                        <div className="px-4 py-3 text-xs text-white/60 italic">
                          Click Send to request borrowing <strong>{borrowItem}</strong> for {borrowDuration} minutes.
                        </div>
                      ) : (
                        <textarea
                          value={dmContent}
                          onChange={(e) => setDmContent(e.target.value)}
                          placeholder={dmType === "whisper" ? "Write a secret whisper..." : "Type your message..."}
                          className="w-full bg-transparent text-white placeholder-white/30 px-4 py-3 text-[15px] resize-none outline-none max-h-32 min-h-[44px]"
                          rows={1}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendDM(e);
                            }
                          }}
                        />
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={dmType !== "borrow" && !dmContent.trim()}
                      className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-black disabled:opacity-50 transition-colors ${
                        dmType === "whisper" 
                          ? "bg-orange-500 hover:bg-orange-400" 
                          : "bg-cyan-500 hover:bg-cyan-400"
                      }`}
                    >
                      <Send size={18} className="ml-1" />
                    </button>
                  </form>
                </div>
              )
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

// Whisper Vanishing message renderer
function WhisperBubble({ text, expiresAt, isMe }: { text: string; expiresAt: number; isMe: boolean }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [burned, setBurned] = useState(false);

  useEffect(() => {
    const check = () => {
      const rem = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 0) {
        setBurned(true);
      }
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (burned) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-white/20 italic text-xs">
        <ShieldAlert size={12} className="text-red-400/50" />
        Whisper expired & vanished
      </div>
    );
  }

  return (
    <div className={`px-4 py-3 rounded-2xl relative overflow-hidden flex flex-col gap-1.5 ${
      isMe 
        ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-br-sm shadow-lg shadow-orange-500/20" 
        : "bg-gradient-to-r from-orange-500/20 to-orange-500/10 border border-orange-500/30 text-orange-200 rounded-bl-sm"
    }`}>
      <div className="flex items-center justify-between gap-6 text-[10px] font-semibold text-white/50 tracking-wider">
        <span className="flex items-center gap-1"><Flame size={10} className="animate-pulse" /> WHISPER MESSAGE</span>
        <span className="bg-black/40 px-2 py-0.5 rounded-md font-mono">{timeLeft}s remaining</span>
      </div>
      <p className="text-[15px] font-medium tracking-tight whitespace-pre-wrap">{text}</p>
    </div>
  );
}

// Borrow timer message renderer
function BorrowBubble({ item, endsAt, isMe, duration }: { item: string; endsAt: number; isMe: boolean; duration: number }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const totalSec = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      if (totalSec <= 0) {
        setExpired(true);
        setTimeLeft("00:00");
      } else {
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        const hr = Math.floor(mins / 60);
        const displayMin = mins % 60;
        
        let formatStr = "";
        if (hr > 0) formatStr += `${hr}h `;
        formatStr += `${displayMin.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        setTimeLeft(formatStr);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <div className={`px-4 py-3 rounded-2xl w-72 flex flex-col gap-2 border ${
      isMe 
        ? "bg-cyan-500/10 border-cyan-500/30 text-white rounded-br-sm" 
        : "bg-white/5 border-white/10 text-white rounded-bl-sm"
    }`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
        <span className="text-[10px] font-bold tracking-wider text-cyan-400 flex items-center gap-1">
          <Clock size={10} className={expired ? "" : "animate-pulse"} />
          {expired ? "BORROW COMPLETE" : "ACTIVE BORROW TIMER"}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${expired ? "bg-red-500/20 text-red-400" : "bg-cyan-500/20 text-cyan-400 font-bold"}`}>
          {timeLeft}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-2xl shrink-0">🤝</div>
        <div>
          <p className="text-xs text-white/40 leading-none">Borrowed Item</p>
          <p className="text-sm font-semibold text-white mt-0.5">{item}</p>
        </div>
      </div>

      <div className="flex items-center justify-between bg-black/30 rounded-xl px-3 py-1.5 mt-1 border border-white/5">
        <span className="text-[10px] text-white/40">Total Rent Time:</span>
        <span className="text-[10px] font-bold text-white/80">{duration} minutes</span>
      </div>

      {expired && (
        <div className="flex items-center gap-1.5 text-[10px] text-orange-400/90 font-medium animate-pulse mt-1 bg-orange-500/10 border border-orange-500/20 rounded-lg p-1.5 justify-center">
          <UserCheck size={10} />
          Please return this item back soon!
        </div>
      )}
    </div>
  );
}
