"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/glass";
import { MessageCircle, Hash, Send, Users } from "lucide-react";
import Image from "next/image";
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

export default function ChatsPage() {
  const { user } = useAuthStore();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [content, setContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Channels
  const { data: channels, isLoading: channelsLoading } = useQuery({
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
    enabled: !!activeChannel?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("channel_messages")
        .select("*, user:users(id, full_name, profile_photo, role)")
        .eq("channel_id", activeChannel!.id)
        .order("created_at", { ascending: true });
      return data as Message[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!activeChannel) return;

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
  }, [activeChannel, queryClient, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mx-4 -mt-4 bg-black/40 relative">
      <div className="px-4 pt-4 pb-2 border-b border-white/10 glass shrink-0 z-10 relative">
        <PageHeader title="Community" subtitle="High bandwidth channels" icon={<MessageCircle size={18} />} />
        
        {/* Channel Selector */}
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
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesLoading ? (
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
                {/* Avatar */}
                {!isMe && (
                  <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                    {msg.user.profile_photo ? (
                      <Image src={msg.user.profile_photo} alt="" width={32} height={32} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-white/50">{msg.user.full_name?.charAt(0)}</span>
                    )}
                  </div>
                )}

                {/* Message Bubble */}
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
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 shrink-0 glass border-t border-white/5 pb-6">
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
      </div>
    </div>
  );
}
