"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";
import {
  Mic, MicOff, Video, VideoOff, Phone, PhoneOff,
  Users, Radio, Waves, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

type Participant = {
  userId: string;
  fullName: string;
  profilePhoto?: string | null;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
  peerConnection?: RTCPeerConnection;
};

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const CALL_ROOM = "dorm-house-call";

export default function LiveCallPage() {
  const { user } = useAuthStore();
  const supabase = createClient();

  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeCallCount, setActiveCallCount] = useState(0);
  const [callDuration, setCallDuration] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update call duration timer
  useEffect(() => {
    if (inCall) {
      callStartTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      setCallDuration(0);
    }
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, [inCall]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Subscribe to active call participant count
  useEffect(() => {
    const presenceChannel = supabase
      .channel("live-call-presence", { config: { presence: { key: user?.id || "anon" } } })
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setActiveCallCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && user && inCall) {
          await presenceChannel.track({ userId: user.id, fullName: user.full_name });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [inCall, user, supabase]);

  const createPeerConnection = useCallback(
    (remoteUserId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setParticipants((prev) =>
          prev.map((p) =>
            p.userId === remoteUserId ? { ...p, stream: remoteStream } : p
          )
        );
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: {
              from: user?.id,
              to: remoteUserId,
              candidate: event.candidate,
            },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setParticipants((prev) => prev.filter((p) => p.userId !== remoteUserId));
          peerConnectionsRef.current.delete(remoteUserId);
        }
      };

      peerConnectionsRef.current.set(remoteUserId, pc);
      return pc;
    },
    [user?.id]
  );

  const joinCall = async () => {
    if (!user) {
      toast.error("Please sign in to join the live call");
      return;
    }
    try {
      toast.loading("Getting your camera & mic...", { id: "media" });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      toast.dismiss("media");

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Set up signaling channel
      const channel = supabase.channel(CALL_ROOM);
      channelRef.current = channel;

      // Handle offers from new joiners
      channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.to !== user.id) return;

        const pc = createPeerConnection(payload.from);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        channel.send({
          type: "broadcast",
          event: "answer",
          payload: { from: user.id, to: payload.from, answer },
        });
      });

      // Handle answers
      channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.to !== user.id) return;
        const pc = peerConnectionsRef.current.get(payload.from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        }
      });

      // Handle ICE candidates
      channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.to !== user.id) return;
        const pc = peerConnectionsRef.current.get(payload.from);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      });

      // Handle new user join - send them an offer
      channel.on("broadcast", { event: "user-joined" }, async ({ payload }) => {
        if (payload.userId === user.id) return;

        // Add participant
        setParticipants((prev) => {
          if (prev.find((p) => p.userId === payload.userId)) return prev;
          return [...prev, { userId: payload.userId, fullName: payload.fullName, profilePhoto: payload.profilePhoto, isMuted: false, isVideoOff: false }];
        });

        // Create offer for the new user
        const pc = createPeerConnection(payload.userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        channel.send({
          type: "broadcast",
          event: "offer",
          payload: { from: user.id, to: payload.userId, offer },
        });
      });

      // Handle user leaving
      channel.on("broadcast", { event: "user-left" }, ({ payload }) => {
        setParticipants((prev) => prev.filter((p) => p.userId !== payload.userId));
        const pc = peerConnectionsRef.current.get(payload.userId);
        if (pc) { pc.close(); peerConnectionsRef.current.delete(payload.userId); }
        toast(`${payload.fullName} left the call`, { icon: "👋" });
      });

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Announce joining
          channel.send({
            type: "broadcast",
            event: "user-joined",
            payload: { userId: user.id, fullName: user.full_name, profilePhoto: user.profile_photo },
          });

          // Broadcast global alert to notify everyone in the house
          const signalChannel = supabase.channel("dorm-house-call-signal");
          signalChannel.subscribe((sigStatus) => {
            if (sigStatus === "SUBSCRIBED") {
              signalChannel.send({
                type: "broadcast",
                event: "call-alert",
                payload: {
                  hostName: user.full_name,
                  hostPhoto: user.profile_photo,
                },
              });
              // Remove the signal channel after sending
              setTimeout(() => {
                supabase.removeChannel(signalChannel);
              }, 3000);
            }
          });
        }
      });

      setInCall(true);
      toast.success("You joined the House Call! 📞🏠");
    } catch (err: any) {
      toast.dismiss("media");
      if (err.name === "NotAllowedError") {
        toast.error("Camera/mic permission denied. Please allow access.");
      } else {
        toast.error("Could not join the call: " + err.message);
      }
    }
  };

  const leaveCall = useCallback(() => {
    // Announce leaving
    if (channelRef.current && user) {
      channelRef.current.send({
        type: "broadcast",
        event: "user-left",
        payload: { userId: user.id, fullName: user.full_name },
      });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Stop all tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    setParticipants([]);
    setInCall(false);
    toast("You left the House Call", { icon: "📵" });
  }, [user, supabase]);

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (inCall) leaveCall(); };
  }, [inCall, leaveCall]);

  const allParticipants = inCall && user
    ? [
        { userId: user.id, fullName: user.full_name, profilePhoto: user.profile_photo, stream: localStreamRef.current || undefined, isMuted, isVideoOff, isLocal: true },
        ...participants.map(p => ({ ...p, isLocal: false })),
      ]
    : [];

  return (
    <div className="space-y-4 pt-2 pb-24">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(124,58,237,0.2))", border: "1px solid rgba(239,68,68,0.3)" }}>
              <Radio size={16} className="text-rose-400" />
            </div>
            <h1 className="font-display font-bold text-xl text-white">House Live Call</h1>
          </div>
          <p className="text-white/40 text-xs mt-1 ml-10">Everyone in the dorm joins one call</p>
        </div>
        {inCall && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span className="text-rose-400 text-xs font-bold">{formatDuration(callDuration)}</span>
          </div>
        )}
      </motion.div>

      {!inCall ? (
        /* Pre-call lobby */
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          {/* Call card */}
          <div className="glass rounded-2xl p-6 text-center space-y-4"
            style={{ border: "1px solid rgba(239,68,68,0.2)", boxShadow: "0 0 40px rgba(239,68,68,0.05)" }}>
            <div className="relative mx-auto w-20 h-20">
              <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 rounded-full bg-rose-500/20" />
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.05, 0.3] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.3 }}
                className="absolute inset-0 rounded-full bg-rose-500/10" />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.3), rgba(124,58,237,0.3))", border: "1px solid rgba(239,68,68,0.4)" }}>
                <Phone size={32} className="text-rose-400" />
              </div>
            </div>

            <div>
              <h2 className="text-white font-bold text-lg">Dorm House Call</h2>
              <p className="text-white/50 text-sm mt-1">
                Start or join the live group call for everyone in the dorm.
                All residents can see and hear each other in real time.
              </p>
            </div>

            {activeCallCount > 0 && (
              <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <Users size={14} className="text-emerald-400" />
                <span className="text-emerald-400 text-sm font-semibold">{activeCallCount} resident{activeCallCount > 1 ? "s" : ""} in call</span>
              </div>
            )}

            <div className="bg-black/30 rounded-xl p-3 text-left space-y-2">
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Before you join</p>
              {["Allow camera & microphone access when prompted", "Works best on Wi-Fi or good mobile data", "You can mute/turn off camera anytime"].map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-cyan-400 text-[8px] font-bold">{i + 1}</span>
                  </div>
                  <p className="text-white/60 text-xs">{tip}</p>
                </div>
              ))}
            </div>

            <motion.button
              onClick={joinCall}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-3"
              style={{ background: "linear-gradient(135deg, #ef4444, #7c3aed)", boxShadow: "0 8px 32px rgba(239,68,68,0.3)" }}
            >
              <Phone size={22} />
              {activeCallCount > 0 ? `Join ${activeCallCount} in Call` : "Start House Call"}
            </motion.button>

            {!user && (
              <p className="text-white/30 text-xs flex items-center justify-center gap-1">
                <AlertCircle size={12} /> Sign in to join the call
              </p>
            )}
          </div>
        </motion.div>
      ) : (
        /* In-call view */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {/* Video grid */}
          <div className={`grid gap-2 ${allParticipants.length === 1 ? "grid-cols-1" : allParticipants.length <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
            {allParticipants.map((participant) => (
              <ParticipantTile
                key={participant.userId}
                participant={participant}
                isLocal={participant.isLocal}
                localVideoRef={participant.isLocal ? localVideoRef : undefined}
              />
            ))}
          </div>

          {allParticipants.length === 1 && (
            <div className="glass rounded-xl p-4 text-center">
              <Waves size={24} className="text-white/30 mx-auto mb-2" />
              <p className="text-white/50 text-sm">Waiting for others to join...</p>
              <p className="text-white/30 text-xs mt-1">Share this with your dorm mates!</p>
            </div>
          )}

          {/* Controls */}
          <div className="fixed bottom-20 left-0 right-0 flex items-center justify-center gap-4 pb-2 z-30">
            <motion.button
              onClick={toggleMute}
              whileTap={{ scale: 0.9 }}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
              style={{
                background: isMuted ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)",
                border: isMuted ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(20px)",
              }}
            >
              {isMuted ? <MicOff size={22} className="text-rose-400" /> : <Mic size={22} className="text-white" />}
            </motion.button>

            <motion.button
              onClick={leaveCall}
              whileTap={{ scale: 0.9 }}
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl"
              style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 0 30px rgba(239,68,68,0.4)" }}
            >
              <PhoneOff size={24} className="text-white" />
            </motion.button>

            <motion.button
              onClick={toggleVideo}
              whileTap={{ scale: 0.9 }}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
              style={{
                background: isVideoOff ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)",
                border: isVideoOff ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(20px)",
              }}
            >
              {isVideoOff ? <VideoOff size={22} className="text-rose-400" /> : <Video size={22} className="text-white" />}
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ParticipantTile({
  participant, isLocal, localVideoRef,
}: {
  participant: { userId: string; fullName: string; profilePhoto?: string | null; stream?: MediaStream; isMuted: boolean; isVideoOff: boolean; isLocal: boolean; peerConnection?: RTCPeerConnection };
  isLocal: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    if (el && participant.stream) {
      el.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative rounded-2xl overflow-hidden aspect-video bg-black/60"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {participant.isVideoOff || !participant.stream ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, rgba(0,245,255,0.05), rgba(124,58,237,0.05))" }}>
          {participant.profilePhoto ? (
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/10">
              <Image src={participant.profilePhoto} alt={participant.fullName} width={56} height={56} className="object-cover w-full h-full" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, rgba(0,245,255,0.3), rgba(124,58,237,0.3))" }}>
              {participant.fullName?.charAt(0)}
            </div>
          )}
        </div>
      ) : (
        <video
          ref={isLocal ? (el) => {
            if (localVideoRef) (localVideoRef as any).current = el;
            setVideoRef(el);
          } : setVideoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      )}

      {/* Name tag */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
        {participant.isMuted && <MicOff size={10} className="text-rose-400" />}
        <span className="text-white text-xs font-medium">
          {participant.fullName?.split(" ")[0]}{isLocal ? " (You)" : ""}
        </span>
      </div>

      {/* Speaking animation - placeholder pulse */}
      {!participant.isMuted && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: "2px solid rgba(0,245,255,0.0)" }} />
      )}
    </motion.div>
  );
}
