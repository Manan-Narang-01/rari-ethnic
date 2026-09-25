import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Seo } from "@/components/Seo";
import { LOGIN } from "@/constants/testIds/auth";
import { ChevronLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";

// Not tied to either auth context: works for both admin and customer emails,
// since /auth/forgot-password is role-agnostic (looks up by email across the
// unified users collection). ?next= remembers which login screen to return to.
export const ForgotPassword = () => {
  const [params] = useSearchParams();
  const next = params.get("next") || "/login";
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) return toast.error("Enter a valid email");
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#E8E3D7] min-h-[70vh] flex items-center justify-center px-4 py-16">
      <Seo title="Forgot Password" noindex />
      <div className="w-full max-w-md">
        <Link to={next} className="text-sm text-[#6E7B85] hover:text-[#A0684E] inline-flex items-center gap-1">
          <ChevronLeft size={14} /> Back to sign in
        </Link>
        <div className="mt-6 bg-[#DDD5C4]/50 border border-[#2A2E30]/10 rounded-sm p-8 text-center">
          <img src="/brand/logo-transparent.png" alt="Rari" className="h-16 mx-auto" />
          <h1 className="font-display text-3xl mt-4">Forgot your password?</h1>

          {sent ? (
            <div className="mt-6" data-testid="forgot-password-sent">
              <MailCheck size={28} className="mx-auto text-[#A0684E]" />
              <p className="text-sm text-[#6E7B85] mt-3">
                If an account exists for <strong>{email.trim()}</strong>, a reset link has been
                sent. Check your inbox.
              </p>
              <Link
                to={`/reset-password${next !== "/login" ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="mt-6 inline-flex text-sm text-[#A0684E] hover:underline"
              >
                Already have a reset code?
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-[#6E7B85] mt-2">
                Enter your email and we'll send you a reset link.
              </p>
              <form onSubmit={submit} data-testid="forgot-password-form" className="mt-8 space-y-5 text-left">
                <div>
                  <label className="label-caps text-[#2A2E30]">Email</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid={LOGIN.emailInput}
                    className="w-full mt-1 border-b border-[#2A2E30]/25 bg-transparent py-2 outline-none focus:border-[#A0684E]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  data-testid="forgot-password-submit"
                  className="w-full bg-[#2A2E30] text-[#E8E3D7] py-3.5 rounded-sm uppercase tracking-[0.2em] text-xs hover:bg-[#A0684E] transition-colors disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
