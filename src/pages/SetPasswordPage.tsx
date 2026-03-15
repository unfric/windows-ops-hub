import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity, ShieldCheck, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";


const SetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const handleInvitationSession = async () => {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const refreshToken = params.get("refresh_token");
        const accessToken = params.get("access_token");

        if (refreshToken) {
          console.log("Invitation token detected, refreshing session...");
          const { error } = await api.users.refreshSession(refreshToken);
          if (error) throw error;
          toast.success("Identity verified. Terminal ready.");
        } else if (!accessToken) {
          // If no tokens in hash, check if we already have a session
          const { data: { session } } = await api.users.getSession();
          if (!session) {
            console.log("No invitation session found, redirecting to login.");
            navigate("/login");
          }
        }
      } catch (error: any) {
        console.error("Session refresh error:", error);
        toast.error("Invitation session expired or invalid.");
        navigate("/login");
      } finally {
        setSessionLoading(false);
      }
    };

    handleInvitationSession();
  }, [navigate]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await api.users.updatePassword(password);
      toast.success("Password set successfully! Activating terminal...");
      // Hard redirect to clear all Supabase hashes/tokens from URL
      setTimeout(() => window.location.href = window.location.origin, 2000);
    } catch (error: any) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505] text-primary/40 font-mono tracking-widest animate-pulse">
        INITIALIZING ENCRYPTION LAYER...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#050505] selection:bg-primary/30 selection:text-white">
      {/* Background Effect */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary),0.05)_0%,rgba(0,0,0,0)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />
      </div>

      <div className="relative z-10 w-full max-w-[500px]">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 blur-2xl opacity-50" />
        
        <Card className="relative z-10 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-2xl overflow-hidden">
          <CardContent className="p-10 lg:p-14 space-y-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-20 w-20 rounded-[28px] bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
                <Lock className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <h2 className="text-4xl font-black tracking-tight text-white uppercase italic">
                Secure your Access
              </h2>
              <p className="text-white/40 text-sm font-medium tracking-wide max-w-[280px]">
                Welcome to Pulse. Initialize your encryption cipher to activate your terminal.
              </p>
            </div>

            <form onSubmit={handleSetPassword} className="space-y-6">
              <div className="space-y-2.5 group">
                <Label className="text-[10px] font-black uppercase text-white/20 tracking-[0.4em] ml-1 group-focus-within:text-primary">New Master Password</Label>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="bg-white/[0.03] border-white/5 h-16 rounded-[20px] text-white placeholder:text-white/10 focus:ring-primary/40 focus:border-primary/50 text-lg px-8 font-bold"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <ShieldCheck className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-white/10 group-focus-within:text-primary/40 transition-colors" />
                </div>
              </div>

              <div className="space-y-2.5 group">
                <Label className="text-[10px] font-black uppercase text-white/20 tracking-[0.4em] ml-1 group-focus-within:text-primary">Confirm Cipher</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="bg-white/[0.03] border-white/5 h-16 rounded-[20px] text-white placeholder:text-white/10 focus:ring-primary/40 focus:border-primary/50 text-lg px-8 font-bold"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-18 bg-primary hover:bg-primary/90 text-white text-lg font-black uppercase tracking-[0.3em] rounded-[24px] shadow-xl mt-4 group"
                disabled={loading}
              >
                {loading ? "CONFIGURING..." : "ACTIVATE ACCOUNT"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetPasswordPage;
