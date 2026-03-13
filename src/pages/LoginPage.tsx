import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity } from "lucide-react";

const LoginPage = () => {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, name);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! Please check your email to verify.");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#050505] selection:bg-primary/30 selection:text-white">
      {/* Immersive Deep-Field Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/auth-bg.png" 
          alt="Luxury Architecture" 
          className="w-full h-full object-cover opacity-50 scale-110 animate-[pulse_10s_infinite_alternate]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0)_0%,rgba(0,0,0,1)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/30 to-black/80" />
      </div>

      {/* Kinetic Light Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/15 rounded-full blur-[160px] z-0 animate-[pulse_8s_infinite]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[160px] z-0 animate-[pulse_12s_infinite]" />
      
      {/* Scanning Line Effect */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
        <div className="w-full h-[1px] bg-primary/50 absolute animate-[scan_4s_linear_infinite]" />
      </div>

      {/* Main Orchestrator Container */}
      <div className="relative z-10 w-full max-w-7xl lg:grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Left Side: Ethereal Branding */}
        <div className="hidden lg:flex flex-col justify-center space-y-12 text-white p-12 pr-0 border-r border-white/5">
          <div className="flex items-center gap-6">
            <div className="relative h-20 w-20 rounded-[24px] bg-white/5 backdrop-blur-3xl border border-white/10 flex items-center justify-center shadow-[0_0_60px_rgba(var(--primary),0.1)] group">
              <div className="absolute inset-0 bg-primary/20 rounded-[24px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Activity className="h-10 w-10 text-primary animate-[pulse_2s_infinite] relative z-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-6xl font-black tracking-[-0.08em] uppercase italic leading-none bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">Pulse</span>
              <span className="text-[10px] font-black tracking-[0.6em] uppercase text-primary/70 mt-3 flex items-center gap-2">
                <span className="h-px w-8 bg-primary/30" />
                INDUSTRIAL ENGINE
              </span>
            </div>
          </div>

          <div className="space-y-8">
            <h1 className="text-8xl font-black tracking-[-0.06em] leading-[0.85]">
              Master <br />
              <span className="italic relative">
                Orchestra.
                <div className="absolute -bottom-2 left-0 w-[40%] h-1 bg-primary/50 blur-[2px]" />
              </span>
            </h1>
            <p className="text-2xl text-white/40 max-w-lg font-light leading-relaxed">
              Achieve absolute synchronization across your global factory network. Precision is not an objective—it's our baseline.
            </p>
          </div>

          <div className="flex items-center gap-12 pt-12">
            <div className="flex flex-col group">
              <span className="text-4xl font-black group-hover:text-primary transition-colors">REAL-TIME</span>
              <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Analytics Sync</span>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="flex flex-col group">
              <span className="text-4xl font-black group-hover:text-primary transition-colors">v1.2.4</span>
              <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Release Grade</span>
            </div>
          </div>
        </div>

        {/* Right Side: High-Velocity Portal Form */}
        <div className="flex justify-center lg:justify-start">
          <div className="relative w-full max-w-[520px]">
            {/* Form Glow */}
            <div className="absolute -inset-4 bg-primary/10 blur-[80px] rounded-[60px] opacity-50 z-0" />
            
            <Card className="relative z-10 w-full bg-black/40 backdrop-blur-[60px] border border-white/10 shadow-[0_48px_128px_-12px_rgba(0,0,0,0.8)] rounded-[48px] overflow-hidden">
              <CardContent className="p-12 lg:p-16 space-y-10">
                {/* Mobile Branding (Refined) */}
                <div className="lg:hidden flex flex-col items-center gap-4 mb-10">
                  <div className="h-16 w-16 rounded-[20px] bg-primary/10 backdrop-blur-xl border border-primary/20 flex items-center justify-center">
                    <Activity className="h-8 w-8 text-primary animate-[pulse_3s_infinite]" />
                  </div>
                  <span className="text-3xl font-black tracking-tighter text-white uppercase italic">Pulse</span>
                </div>

                <div className="space-y-3 text-center lg:text-left">
                  <h2 className="text-5xl font-black tracking-tight text-white italic">
                    {isSignUp ? "INITIALIZE" : "ENGAGE"}
                  </h2>
                  <p className="text-white/30 text-lg font-medium tracking-tight">
                    {isSignUp ? "Establish your command protocols." : "Authorized personnel only—Pulse link required."}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {isSignUp && (
                    <div className="space-y-2.5 group">
                      <Label htmlFor="name" className="text-[10px] font-black uppercase text-white/20 tracking-[0.4em] ml-1 group-focus-within:text-primary transition-all duration-500">Commander ID</Label>
                      <Input 
                        id="name" 
                        placeholder="IDENTIFY" 
                        className="bg-white/[0.03] border-white/5 h-16 rounded-[20px] text-white placeholder:text-white/10 focus:ring-primary/40 focus:border-primary/50 focus:bg-white/[0.06] transition-all duration-500 text-lg px-8 shadow-inner font-bold tracking-tight"
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required 
                      />
                    </div>
                  )}
                  <div className="space-y-2.5 group">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase text-white/20 tracking-[0.4em] ml-1 group-focus-within:text-primary transition-all duration-500">Secure Protocol Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="nexus@link.io" 
                      className="bg-white/[0.03] border-white/5 h-16 rounded-[20px] text-white placeholder:text-white/10 focus:ring-primary/40 focus:border-primary/50 focus:bg-white/[0.06] transition-all duration-500 text-lg px-8 shadow-inner font-bold tracking-tight"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-2.5 group">
                    <div className="flex items-center justify-between ml-1">
                      <Label htmlFor="password" className="text-[10px] font-black uppercase text-white/20 tracking-[0.4em] group-focus-within:text-primary transition-all duration-500">Encryption Cipher</Label>
                      {!isSignUp && (
                        <button type="button" className="text-[10px] font-black uppercase text-primary/40 hover:text-primary tracking-[0.3em] transition-all">RECOVER</button>
                      )}
                    </div>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      className="bg-white/[0.03] border-white/5 h-16 rounded-[20px] text-white placeholder:text-white/10 focus:ring-primary/40 focus:border-primary/50 focus:bg-white/[0.06] transition-all duration-500 text-lg px-8 shadow-inner font-bold tracking-tight"
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      minLength={6} 
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-20 bg-primary hover:bg-primary/90 text-white text-xl font-black uppercase tracking-[0.3em] rounded-[24px] shadow-[0_12px_48px_rgba(var(--primary),0.3)] transition-all active:scale-[0.97] mt-6 flex items-center justify-center gap-3 overflow-hidden group" 
                    disabled={loading}
                  >
                    {loading ? (
                      "SYNCHRONIZING..."
                    ) : (
                      <>
                        {isSignUp ? "ESTABLISH" : "INITIATE ENGINE"}
                        <Activity className="h-5 w-5 animate-pulse group-hover:scale-125 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="pt-10 text-center border-t border-white/10">
                  <p className="text-sm font-bold tracking-tight text-white/20 uppercase">
                    {isSignUp ? "Already bridged?" : "New operative?"}{" "}
                    <button 
                      type="button" 
                      className="text-primary font-black ml-2 hover:text-white transition-colors underline-offset-4 hover:underline" 
                      onClick={() => setIsSignUp(!isSignUp)}
                    >
                      {isSignUp ? "CONNECT" : "REQUEST LINK"}
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          from { top: 0; }
          to { top: 100%; }
        }
      `}} />
    </div>
  );
};

export default LoginPage;
