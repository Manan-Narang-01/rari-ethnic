import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Package, ShoppingBag, Plus, Home, Settings, CalendarClock } from "lucide-react";
import { Toaster } from "sonner";

export const AdminLayout = () => {
  const { user, logout, loading } = useAuth();
  const nav = useNavigate();

  if (loading)
    return <div className="p-10 text-center text-[#6E7B85]">Loading…</div>;
  if (!user) {
    nav("/admin/login", { replace: true });
    return null;
  }

  const doLogout = () => {
    logout();
    nav("/admin/login", { replace: true });
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
          <NavLink to="/admin" end className={linkClass} data-testid="admin-nav-products">
            <Package size={16} /> Products
          </NavLink>
          <NavLink to="/admin/products/new" className={linkClass} data-testid="admin-nav-new-product">
            <Plus size={16} /> Add product
          </NavLink>
          <NavLink to="/admin/orders" className={linkClass} data-testid="admin-nav-orders">
            <ShoppingBag size={16} /> Orders
          </NavLink>
          <NavLink to="/admin/campaigns" className={linkClass} data-testid="admin-nav-campaigns">
            <CalendarClock size={16} /> Events
          </NavLink>
          <NavLink to="/admin/settings" className={linkClass} data-testid="admin-nav-settings">
            <Settings size={16} /> Site settings
          </NavLink>
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
          <Outlet />
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
