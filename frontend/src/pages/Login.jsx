import { useState } from "react";
import { Navigate, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth, isStaffRole } from "@/context/AuthContext";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { PasswordInput } from "@/components/PasswordInput";
import { GOOGLE_CLIENT_ID } from "@/lib/api";
import { LOGIN } from "@/constants/testIds/auth";
import { ShieldCheck, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

// Where to land after sign-in when the caller didn't ask for a specific
// page via ?next= — customers go to their account, staff to the dashboard.
const defaultDest = (user) => (isStaffRole(user?.role) ? "/admin" : "/account");

export const Login = () => {
  const { isAuthenticated, user, login, loginWithGoogle, devLogin, loading } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [devEmail, setDevEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const explicitNext = params.get("next");
  const next = explicitNext || "/account";
  const nextQuery = next !== "/account" ? `?next=${encodeURIComponent(next)}` : "";
  const googleConfigured = !!GOOGLE_CLIENT_ID;

  if (loading) return <div className="container-x py-24 text-center text-[#6E7B85]">Loading…</div>;
  if (isAuthenticated) return <Navigate to={explicitNext || defaultDest(user)} replace />;

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const loggedInUser = await login(email.trim(), password);
      toast.success("Signed in");
      nav(explicitNext || defaultDest(loggedInUser), { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail === "Please verify your email before signing in") {
        nav(`/verify-otp?email=${encodeURIComponent(email.trim())}${explicitNext ? `&next=${encodeURIComponent(explicitNext)}` : ""}`);
        return;
      }
      const msg = typeof detail === "string" ? detail : "Invalid email or password";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleCredential = async (credential) => {
    setBusy(true);
    try {
      const loggedInUser = await loginWithGoogle(credential);
      toast.success("Signed in");
      nav(explicitNext || defaultDest(loggedInUser), { replace: true });
    } catch (err) {
      const msg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Sign-in failed. Please try again.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDevLogin = async (e) => {
    e.preventDefault();
    if (!devEmail.includes("@")) return toast.error("Enter a valid email");
    setBusy(true);
    try {
      const loggedInUser = await devLogin(devEmail.trim());
      toast.success("Signed in (test mode)");
      nav(explicitNext || defaultDest(loggedInUser), { replace: true });
    } catch (err) {
      const msg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Sign-in failed. Please try again.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#E8E3D7] min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="text-sm text-[#6E7B85] hover:text-[#A0684E] inline-flex items-center gap-1">
          <ChevronLeft size={14} /> Back to shop
        </Link>
        <div className="mt-6 bg-[#DDD5C4]/50 border border-[#2A2E30]/10 rounded-sm p-8 text-center">
          <img src="/brand/logo-transparent.png" alt="Rari" className="h-16 mx-auto" />
          <h1 className="font-display text-3xl mt-4">Sign in to continue</h1>
          <p className="text-sm text-[#6E7B85] mt-2">
            You can browse freely — an account is only needed to place an order.
          </p>

          <form onSubmit={handlePasswordLogin} data-testid="login-password-form" className="mt-8 text-left space-y-4">
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
            <div>
              <label className="label-caps text-[#2A2E30]">Password</label>
              <PasswordInput
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid={LOGIN.passwordInput}
                className="w-full mt-1 border-b border-[#2A2E30]/25 bg-transparent py-2 outline-none focus:border-[#A0684E]"
              />
            </div>
            <div className="flex justify-end">
              <Link
                to={`/forgot-password${nextQuery}`}
                data-testid={LOGIN.forgotPasswordLink}
                className="text-xs text-[#A0684E] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={busy}
              data-testid={LOGIN.submitButton}
              className="w-full bg-[#2A2E30] text-[#E8E3D7] py-3.5 rounded-sm uppercase tracking-[0.2em] text-xs hover:bg-[#A0684E] transition-colors disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-4 text-sm text-[#6E7B85]">
            New here?{" "}
            <Link to={`/register${nextQuery}`} data-testid={LOGIN.registerLink} className="text-[#A0684E] hover:underline">
              Create an account
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-[#2A2E30]/10 flex items-center gap-3 text-[11px] uppercase tracking-widest text-[#6E7B85]">
            <span className="flex-1 h-px bg-[#2A2E30]/10" /> or <span className="flex-1 h-px bg-[#2A2E30]/10" />
          </div>

          <div className="mt-6 flex justify-center">
            {busy ? (
              <span className="text-sm text-[#6E7B85]">Signing you in…</span>
            ) : googleConfigured ? (
              <GoogleSignInButton onCredential={handleCredential} onError={(m) => toast.error(m)} />
            ) : (
              <form onSubmit={handleDevLogin} className="w-full text-left" data-testid="dev-login-form">
                <div className="mb-3 text-[11px] uppercase tracking-widest text-[#A0684E] text-center">
                  Test mode · Google not configured yet
                </div>
                <label className="label-caps text-[#2A2E30]">Email</label>
                <input
                  type="email"
                  required
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  placeholder="you@example.com"
                  data-testid="dev-login-email"
                  className="w-full mt-1 border-b border-[#2A2E30]/25 bg-transparent py-2 outline-none focus:border-[#A0684E]"
                />
                <button
                  type="submit"
                  data-testid="dev-login-submit"
                  className="w-full mt-6 bg-[#2A2E30] text-[#E8E3D7] py-3.5 rounded-sm uppercase tracking-[0.2em] text-xs hover:bg-[#A0684E] transition-colors"
                >
                  Continue
                </button>
              </form>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-[#2A2E30]/10 flex items-center justify-center gap-2 text-xs text-[#6E7B85]">
            <ShieldCheck size={14} className="text-[#A0684E]" />
            {googleConfigured
              ? "We only use your Google account to identify your orders."
              : "Temporary email login for testing — replaced by Google once configured."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
