import { useState } from "react";
import { supabase } from "../lib/supabase";

type Mode = "magic" | "password";

export default function Login() {
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim()) return;

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to send magic link.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !password) return;

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      // Success → go home
      window.location.href = "/";
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <div className="pm-card w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-1">Sign in</h1>
        <p className="text-slate-600 text-sm mb-4">
          Choose a method to access your landlord console.
        </p>

        {/* Toggle */}
        <div className="mb-4 inline-flex rounded-lg border overflow-hidden">
          <button
            type="button"
            className={`px-3 py-2 text-sm ${
              mode === "magic" ? "bg-slate-900 text-white" : "bg-white"
            }`}
            onClick={() => {
              setMode("magic");
              setErrorMsg(null);
            }}
          >
            Magic Link
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm border-l ${
              mode === "password" ? "bg-slate-900 text-white" : "bg-white"
            }`}
            onClick={() => {
              setMode("password");
              setErrorMsg(null);
              setSent(false);
            }}
          >
            Email & Password
          </button>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Forms */}
        {mode === "magic" ? (
          sent ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
              Magic link sent to <span className="font-medium">{email}</span>. Check your inbox.
            </div>
          ) : (
            <form onSubmit={sendMagicLink} className="space-y-3">
              <input
                type="email"
                className="pm-input w-full"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="magic-email-input"
                autoFocus
                required
              />
              <button
                type="submit"
                className="pm-btn w-full"
                disabled={loading || !email.trim()}
                data-testid="magic-submit"
              >
                {loading ? "Sending..." : "Send Magic Link"}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={signInWithPassword} className="space-y-3">
            <input
              type="email"
              className="pm-input w-full"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="email-input"
              autoFocus
              required
            />
            <input
              type="password"
              className="pm-input w-full"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="password-input"
              required
            />
            <button
              type="submit"
              className="pm-btn w-full"
              disabled={loading || !email.trim() || !password}
              data-testid="login-submit"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        )}

        <div className="mt-6 text-xs text-slate-500">
          By continuing you agree to our Terms and acknowledge our Privacy Policy.
        </div>
      </div>
    </div>
  );
}
