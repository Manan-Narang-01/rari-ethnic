import { Suspense } from "react";
import { Link, NavLink, Outlet, useNavigate, Navigate } from "react-router-dom";
import { useAuth, STAFF_ROLES, isStaffRole } from "@/context/AuthContext";
import { LogOut, Package, ShoppingBag, Plus, Home, Settings, CalendarClock, Tags, RefreshCw, CreditCard, History } from "lucide-react";
import { Toaster } from "sonner";

// Centralized, role-filtered sidebar config. A future Super-Admin-only page
// is just one entry here with roles: ["super_admin"] — pair it with a route
// wrapped in <RequireRole roles={["super_admin"]}> (components/admin/RequireRole.jsx)
// and dependencies=[Depends(require_super_admin)] on its backend router.
const NAV_ITEMS = [
  { to: "/admin", end: true, icon: Package, label: "Products", testid: "admin-nav-products", roles: STAFF_ROLES },
  { to: "/admin/products/new", icon: Plus, label: "Add product", testid: "admin-nav-new-product", roles: STAFF_ROLES },
  { to: "/admin/categories", icon: Tags, label: "Categories", testid: "admin-nav-categories", roles: STAFF_ROLES },
  { to: "/admin/orders", icon: ShoppingBag, label: "Orders", testid: "admin-nav-orders", roles: STAFF_ROLES },
  { to: "/admin/exchanges", icon: RefreshCw, label: "Exchanges", testid: "admin-nav-exchanges", roles: STAFF_ROLES },
  { to: "/admin/campaigns", end: true, icon: CalendarClock, label: "Events", testid: "admin-nav-campaigns", roles: STAFF_ROLES },
  { to: "/admin/campaigns/logs", icon: History, label: "Event logs", testid: "admin-nav-campaign-logs", roles: STAFF_ROLES },
  { to: "/admin/settings", icon: Settings, label: "Site settings", testid: "admin-nav-settings", roles: STAFF_ROLES },
  { to: "/admin/integrations", icon: CreditCard, label: "Integrations", testid: "admin-nav-integrations", roles: STAFF_ROLES },
];

export const AdminLayout = () => {
  const { user, logout, loading } = useAuth();
  const nav = useNavigate();

  if (loading)
    return <div className="p-10 text-center text-[#6E7B85]">Loading…</div>;
  if (!user) return <Navigate to="/login?next=/admin" replace />;
  if (!isStaffRole(user.role)) return <Navigate to="/account" replace />;

  const doLogout = () => {
    logout();
    nav("/login", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm transition-colors ${
      isActive
        ? "bg-[#A0684E] text-[#E8E3D7]"
        : "text-[#2A2E30] hover:bg-[#DDD5C4]"
    }`;

  return (
    <div className="min-h-screen bg-[#E8E3D7] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="md:w-64 md:min-h-screen border-b md:border-b-0 md:border-r border-[#8B9A9F]/25 bg-[#DDD5C4]/40">
        <div className="p-6">
          <Link to="/admin" className="flex items-center gap-2">
            <img src="/brand/logo-transparent.png" alt="Rari" className="h-11" />
          </Link>
          <p className="label-caps mt-3">Admin</p>
        </div>
        <nav className="px-3 py-2 space-y-1">
          {NAV_ITEMS.filter((item) => item.roles.includes(user.role)).map(({ to, end, icon: Icon, label, testid }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} data-testid={testid}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
          <div className="pt-4 mt-4 border-t border-[#8B9A9F]/20 space-y-1">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm text-[#2A2E30] hover:bg-[#DDD5C4]"
            >
              <Home size={16} /> View live site
            </a>
            <button
              onClick={doLogout}
              data-testid="admin-logout"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm text-[#6E7B85] hover:bg-[#DDD5C4]"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </nav>
        <div className="p-4 mt-auto hidden md:block">
          <div className="text-xs text-[#6E7B85] truncate" data-testid="admin-user-email">
            {user.email}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="p-6 md:p-10">
          {/* Each admin page is its own lazy chunk (see App.js) -- this keeps
              the sidebar mounted while switching between them instead of the
              whole layout flashing to a loading screen on every nav click. */}
          <Suspense fallback={<div className="text-[#6E7B85]">Loading…</div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <Toaster
        position="top-right"
        theme="light"
        toastOptions={{
          style: {
            background: "#E8E3D7",
            border: "1px solid rgba(139,154,159,0.3)",
            color: "#2A2E30",
            fontFamily: "DM Sans, sans-serif",
          },
        }}
      />
    </div>
  );
};

export default AdminLayout;
