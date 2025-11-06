import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
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
          emailRedirectTo: `${window.location.origin}/`, // after clicking the email link
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

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <div className="pm-card w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-1">Sign in</h1>
        <p className="text-slate-600 text-sm mb-6">
          Use your email and we’ll send you a magic link.
        </p>

        {sent ? (
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
              autoFocus
              required
            />
            {errorMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
                {errorMsg}
              </div>
            )}
            <button
              type="submit"
              className="pm-btn w-full"
              disabled={loading || !email.trim()}
            >
              {loading ? "Sending..." : "Send Magic Link"}
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
