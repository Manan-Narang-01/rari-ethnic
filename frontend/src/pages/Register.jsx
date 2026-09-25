import { useState } from "react";
import { Navigate, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PasswordInput } from "@/components/PasswordInput";
import { Seo } from "@/components/Seo";
import { REGISTER } from "@/constants/testIds/auth";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export const Register = () => {
  const { isAuthenticated, register, loading } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  // First-time signup lands on the home page unless the user was sent here
  // from a gated flow (e.g. checkout), in which case honor that destination.
  const next = params.get("next") || "/";
  const [form, setForm] = useState({ name: "", email: "", password: "", passwordConfirm: "" });
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="container-x py-24 text-center text-[#6E7B85]">Loading…</div>;
  if (isAuthenticated) return <Navigate to={next} replace />;

  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    if (form.password !== form.passwordConfirm) return toast.error("Passwords don't match");
    setBusy(true);
    try {
      const email = form.email.trim();
      await register(form.name.trim(), email, form.password);
      nav(`/verify-otp?email=${encodeURIComponent(email)}${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`);
    } catch (err) {
      const msg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Could not create account. Please try again.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#E8E3D7] min-h-[70vh] flex items-center justify-center px-4 py-16">
      <Seo title="Create Account" noindex />
      <div className="w-full max-w-md">
        <Link to="/" className="text-sm text-[#6E7B85] hover:text-[#A0684E] inline-flex items-center gap-1">
          <ChevronLeft size={14} /> Back to shop
        </Link>
        <div className="mt-6 bg-[#DDD5C4]/50 border border-[#2A2E30]/10 rounded-sm p-8">
          <img src="/brand/logo-transparent.png" alt="Rari" className="h-16 mx-auto" />
          <h1 className="font-display text-3xl mt-4 text-center">Create your account</h1>
          <p className="text-sm text-[#6E7B85] mt-2 text-center">
            Save your details so checkout is faster next time.
          </p>

          <form onSubmit={submit} data-testid="register-form" className="mt-8 space-y-5 text-left">
            <div>
              <label className="label-caps text-[#2A2E30]">Full name</label>
              <input
                required
                value={form.name}
                onChange={setField("name")}
                data-testid={REGISTER.nameInput}
                className="w-full mt-1 border-b border-[#2A2E30]/25 bg-transparent py-2 outline-none focus:border-[#A0684E]"
              />
            </div>
            <div>
              <label className="label-caps text-[#2A2E30]">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={setField("email")}
                data-testid={REGISTER.emailInput}
                className="w-full mt-1 border-b border-[#2A2E30]/25 bg-transparent py-2 outline-none focus:border-[#A0684E]"
              />
            </div>
            <div>
              <label className="label-caps text-[#2A2E30]">Password</label>
              <PasswordInput
                required
                value={form.password}
                onChange={setField("password")}
                data-testid={REGISTER.passwordInput}
                className="w-full mt-1 border-b border-[#2A2E30]/25 bg-transparent py-2 outline-none focus:border-[#A0684E]"
              />
            </div>
            <div>
              <label className="label-caps text-[#2A2E30]">Confirm password</label>
              <PasswordInput
                required
                value={form.passwordConfirm}
                onChange={setField("passwordConfirm")}
                data-testid={REGISTER.passwordConfirmInput}
                className="w-full mt-1 border-b border-[#2A2E30]/25 bg-transparent py-2 outline-none focus:border-[#A0684E]"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              data-testid={REGISTER.submitButton}
              className="w-full bg-[#2A2E30] text-[#E8E3D7] py-3.5 rounded-sm uppercase tracking-[0.2em] text-xs hover:bg-[#A0684E] transition-colors disabled:opacity-60"
            >
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#2A2E30]/10 text-center text-sm text-[#6E7B85]">
            Already have an account?{" "}
            <Link
              to={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
              data-testid={REGISTER.loginLink}
              className="text-[#A0684E] hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
