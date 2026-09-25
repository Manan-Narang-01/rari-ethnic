import { useState } from "react";
import { Navigate, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { VERIFY_OTP } from "@/constants/testIds/auth";
import { Seo } from "@/components/Seo";
import { ChevronLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";

export const VerifyOtp = () => {
  const { isAuthenticated, verifyOtp, resendOtp, loading } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const email = params.get("email") || "";
  const next = params.get("next") || "/";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  if (loading) return <div className="container-x py-24 text-center text-[#6E7B85]">Loading…</div>;
  if (isAuthenticated) return <Navigate to={next} replace />;
  if (!email) return <Navigate to="/register" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) return toast.error("Enter the 6-digit code");
    setBusy(true);
    try {
      await verifyOtp(email, code.trim());
      toast.success("Account verified");
      nav(next, { replace: true });
    } catch (err) {
      const msg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Invalid or expired code";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await resendOtp(email);
      toast.success("A new code has been sent");
    } catch {
      toast.error("Could not resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-[#E8E3D7] min-h-[70vh] flex items-center justify-center px-4 py-16">
      <Seo title="Verify Your Email" noindex />
      <div className="w-full max-w-md">
        <Link to="/register" className="text-sm text-[#6E7B85] hover:text-[#A0684E] inline-flex items-center gap-1">
          <ChevronLeft size={14} /> Back
        </Link>
        <div className="mt-6 bg-[#DDD5C4]/50 border border-[#2A2E30]/10 rounded-sm p-8 text-center">
          <MailCheck size={28} className="mx-auto text-[#A0684E]" />
          <h1 className="font-display text-3xl mt-4">Verify your email</h1>
          <p className="text-sm text-[#6E7B85] mt-2">
            We sent a 6-digit code to <strong>{email}</strong>. Enter it below to activate your account.
          </p>

          <form onSubmit={submit} data-testid="verify-otp-form" className="mt-8 space-y-5 text-left">
            <div>
              <label className="label-caps text-[#2A2E30]">Verification code</label>
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                data-testid={VERIFY_OTP.codeInput}
                className="w-full mt-1 border-b border-[#2A2E30]/25 bg-transparent py-2 text-center text-2xl tracking-[0.5em] outline-none focus:border-[#A0684E]"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              data-testid={VERIFY_OTP.submitButton}
              className="w-full bg-[#2A2E30] text-[#E8E3D7] py-3.5 rounded-sm uppercase tracking-[0.2em] text-xs hover:bg-[#A0684E] transition-colors disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Verify & continue"}
            </button>
          </form>

          <div className="mt-6 text-sm text-[#6E7B85]">
            Didn't get a code?{" "}
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              data-testid={VERIFY_OTP.resendButton}
              className="text-[#A0684E] hover:underline disabled:opacity-60"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
