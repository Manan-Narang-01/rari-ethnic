import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { toast } from "sonner";

const STAFF_ROLES = ["admin", "super_admin"];

export const AdminLogin = () => {
  const { user, login, logout, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nav = useNavigate();

  if (loading) return <div className="p-10 text-center text-[#6E7B85]">Loading…</div>;
  if (user && STAFF_ROLES.includes(user.role)) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { user: loggedInUser } = await login(email, password);
      if (!STAFF_ROLES.includes(loggedInUser.role)) {
        logout();
        toast.error("This sign-in is for staff accounts only");
        return;
      }
      toast.success("Welcome back");
      nav("/admin", { replace: true });
    } catch (err) {
      const msg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Invalid credentials";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E8E3D7] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/brand/logo-transparent.png" alt="Rari" className="h-20 mx-auto" />
          <p className="mt-4 label-caps">Admin sign-in</p>
        </div>
        <form
          onSubmit={submit}
          data-testid="admin-login-form"
          className="bg-[#DDD5C4]/60 border border-[#8B9A9F]/25 rounded-sm p-8 space-y-5 backdrop-blur-sm"
        >
          <div>
            <label className="label-caps text-[#2A2E30]">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="admin-email"
              className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label-caps text-[#2A2E30]">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="admin-password"
              className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]"
              autoComplete="current-password"
            />
          </div>
          <button
            disabled={submitting}
            type="submit"
            data-testid="admin-login-submit"
            className="w-full bg-[#2A2E30] text-[#E8E3D7] py-3.5 rounded-sm uppercase tracking-[0.2em] text-xs hover:bg-[#A0684E] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Lock size={14} /> {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-xs text-center text-[#6E7B85] mt-6">
          Rari · Handcrafted Ethnic · Admin
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
