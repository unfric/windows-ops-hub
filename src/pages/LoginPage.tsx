import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const LoginPage = () => {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignUp && !email.includes("@")) {
      toast.error("Please use a valid work email address.");
      return;
    }
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
    <div className="flex min-h-screen bg-white">
      {/* Left Panel: High-End Visual */}
      <div className="relative hidden w-[55%] lg:block">
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80"
          alt="Modern Workspace"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Subtle, luxurious overlay to enrich the image and ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        
        <div className="absolute bottom-16 left-16 right-16 text-white">
          <h2 className="text-4xl lg:text-5xl font-light tracking-wide mb-6 leading-tight max-w-xl">
            The standard for modern <br /> enterprise operations.
          </h2>
          <div className="w-12 h-px bg-white/60 mb-6" />
          <p className="text-white/80 font-light text-lg tracking-wide">
            Clarity, control, and operational excellence.
          </p>
        </div>
      </div>

      {/* Right Panel: Clean Form */}
      <div className="flex w-full lg:w-[45%] items-center justify-center p-8 sm:p-12 lg:p-24 bg-[#FAFAF9]">
        <div className="w-full max-w-[400px] space-y-12 animate-in fade-in duration-1000 slide-in-from-bottom-4">
          
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-4xl font-light tracking-tight text-slate-900">
              Pulse
            </h1>
            <p className="text-slate-500 max-w-sm font-light text-[15px] leading-relaxed">
              {isSignUp 
                ? "Provide your details to establish a new operational account." 
                : "Enter your credentials to access the operations hub."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2.5">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-widest text-slate-500 ml-1">
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="h-12 border-slate-200 bg-white px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-lg shadow-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-slate-500 ml-1">
                Work Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                className="h-12 border-slate-200 bg-white px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-lg shadow-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2.5">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Password
                </Label>
                {!isSignUp && (
                  <button type="button" className="text-[11px] font-medium uppercase tracking-wider text-slate-400 hover:text-slate-800 transition-colors">
                    Forgot?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-12 border-slate-200 bg-white px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-lg shadow-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-4 bg-slate-900 hover:bg-slate-800 text-white font-medium tracking-wide rounded-lg transition-all shadow-md active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                isSignUp ? "Create Account" : "Sign In"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-left pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500 font-light">
              {isSignUp ? "Already a member?" : "New to Pulse?"}{" "}
              <button
                type="button"
                className="font-medium text-slate-800 hover:text-primary transition-colors hover:underline underline-offset-4"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Sign In" : "Request Access"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
