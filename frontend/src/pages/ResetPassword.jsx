import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

// Same role-agnostic design as ForgotPassword.jsx — works for both admin and
// customer accounts. The token field is editable (not just read from the URL)
// because there's no real email delivery yet: the backend only logs the raw
// reset token server-side for now (see docs/BACKEND_ARCHITECTURE.md §12).
export const ResetPassword = () => {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const next = params.get("next") || "/login";
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!token.trim()) return toast.error("Enter your reset code");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== passwordConfirm) return toast.error("Passwords don't match");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token: token.trim(), new_password: password });
      toast.success("Password reset. Please sign in.");
      nav(next, { replace: true });
    } catch (err) {
      const msg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Invalid or expired reset code.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#E8E3D7] min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to={next} className="text-sm text-[#6E7B85] hover:text-[#A0684E] inline-flex items-center gap-1">
          <ChevronLeft size={14} /> Back to sign in
        </Link>
        <div className="mt-6 bg-[#DDD5C4]/50 border border-[#2A2E30]/10 rounded-sm p-8">
          <img src="/brand/logo-transparent.png" alt="Rari" className="h-16 mx-auto" />
          <h1 className="font-display text-3xl mt-4 text-center">Reset your password</h1>
          <p className="text-xs text-[#A0684E] uppercase tracking-widest mt-3 text-center">
            Test mode · check the server log for your reset code
          </p>

          <form onSubmit={submit} data-testid="reset-password-form" className="mt-8 space-y-5 text-left">
            <div>
              <label className="label-caps text-[#2A2E30]">Reset code</label>
              <input
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                data-testid="reset-password-token"
                className="w-full mt-1 border-b border-[#2A2E30]/25 bg-transparent py-2 outline-none focus:border-[#A0684E]"
              />
            </div>
            <div>
              <label className="label-caps text-[#2A2E30]">New password</label>
              <PasswordInput
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="reset-password-new"
                className="w-full mt-1 border-b border-[#2A2E30]/25 bg-transparent py-2 outline-none focus:border-[#A0684E]"
              />
            </div>
            <div>
              <label className="label-caps text-[#2A2E30]">Confirm new password</label>
              <PasswordInput
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                data-testid="reset-password-confirm"
                className="w-full mt-1 border-b border-[#2A2E30]/25 bg-transparent py-2 outline-none focus:border-[#A0684E]"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              data-testid="reset-password-submit"
              className="w-full bg-[#2A2E30] text-[#E8E3D7] py-3.5 rounded-sm uppercase tracking-[0.2em] text-xs hover:bg-[#A0684E] transition-colors disabled:opacity-60"
            >
              {busy ? "Resetting…" : "Reset password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
