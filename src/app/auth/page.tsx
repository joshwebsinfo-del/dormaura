"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Zap,
  ArrowRight,
  Chrome,
  KeyRound,
} from "lucide-react";

type AuthMode = "signin" | "signup" | "otp";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const checkApproved = async (email: string) => {
    const { data } = await supabase
      .from("approved_students")
      .select("email")
      .eq("email", email.toLowerCase())
      .single();
    return !!data;
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) toast.error(error.message);
    setLoading(false);
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Automatically grant admin role to this account upon sign in
      if (data?.user?.id && email.toLowerCase() === "joshuamujakari15@gmail.com") {
        await supabase.from("users").update({ role: "admin" }).eq("id", data.user.id);
      }

      toast.success("Welcome back to DormAura! 🏠");
      router.push("/home");
    } catch (err: any) {
      toast.error(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      toast.success("Account created! Check your email to verify. ✉️", {
        duration: 6000,
      });
      setMode("signin");
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setOtpSent(true);
      toast.success("Magic link sent to your email! ✨");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#050508" }}
    >
      {/* Aurora bg */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 30% 20%, rgba(0,245,255,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 70% 80%, rgba(124,58,237,0.08) 0%, transparent 60%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ boxShadow: ["0 0 20px rgba(0,245,255,0.3)", "0 0 40px rgba(0,245,255,0.5)", "0 0 20px rgba(0,245,255,0.3)"] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,245,255,0.15), rgba(124,58,237,0.15))",
              border: "1px solid rgba(0,245,255,0.3)",
            }}
          >
            <Zap size={28} className="text-cyan-400" />
          </motion.div>
          <h1 className="font-display font-bold text-3xl text-white">
            Dorm<span className="text-cyan-400">Aura</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Your boarding house ecosystem ✨
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(40px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* Mode tabs */}
          <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/[0.04]">
            {(["signin", "signup", "otp"] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  mode === m
                    ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {m === "signin"
                  ? "Sign In"
                  : m === "signup"
                  ? "Sign Up"
                  : "Magic Link"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl mb-4 transition-all duration-200 hover:bg-white/10 active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Chrome size={18} className="text-white/70" />
                <span className="text-white/80 text-sm font-medium">
                  Continue with Google
                </span>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-white/30 text-xs">or</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              {/* Email/Password Form */}
              {(mode === "signin" || mode === "signup") && (
                <form
                  onSubmit={mode === "signin" ? handleEmailSignIn : handleSignUp}
                  className="space-y-3"
                >
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                    />
                    <input
                      id="auth-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full input-glass pl-10"
                    />
                  </div>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                    />
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full input-glass pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Removed warning */}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full btn-primary flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        {mode === "signin" ? "Enter the Nest" : "Create Account"}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </motion.button>
                </form>
              )}

              {/* OTP / Magic Link */}
              {mode === "otp" && (
                <form onSubmit={handleOTPRequest} className="space-y-3">
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                    />
                    <input
                      id="otp-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full input-glass pl-10"
                    />
                  </div>

                  {otpSent && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-cyan-400 text-xs px-1"
                    >
                      ✨ Check your email for a magic link to sign in instantly!
                    </motion.p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading || otpSent}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <KeyRound size={16} />
                    {otpSent ? "Link Sent!" : "Send Magic Link"}
                  </motion.button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          DormAura © 2025 — Your boarding house ecosystem
        </p>
      </motion.div>
    </div>
  );
}
