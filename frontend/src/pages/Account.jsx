import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, formatINR } from "@/lib/api";
import { Package, LogOut, ShoppingBag } from "lucide-react";

const STATUS_STYLES = {
  confirmed: "bg-[#B58D3E]/15 text-[#8A6A1E]",
  dispatched: "bg-[#1E3A5F]/15 text-[#1E3A5F]",
  delivered: "bg-[#185D64]/15 text-[#185D64]",
  cancelled: "bg-[#7E1F35]/15 text-[#7E1F35]",
};

export const Account = () => {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .get("/customer/orders")
      .then((r) => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [isAuthenticated]);

  if (loading) return <div className="container-x py-24 text-center text-[#6E7B85]">Loading…</div>;
  if (!isAuthenticated) return <Navigate to="/login?next=/account" replace />;
  if (user.role !== "customer") return <Navigate to="/admin" replace />;

  return (
    <div className="bg-[#E8E3D7] min-h-[70vh]">
      <div className="container-x py-12">
        {/* Profile header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-14 h-14 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#A0684E] text-[#E8E3D7] flex items-center justify-center font-display text-xl">
                {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display text-3xl">{user?.name || "Welcome"}</h1>
              <p className="text-sm text-[#6E7B85]">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            data-testid="account-logout"
            className="inline-flex items-center gap-2 text-sm border border-[#2A2E30]/20 px-4 py-2.5 rounded-sm hover:bg-[#DDD5C4] transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>

        {/* Orders */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <Package size={18} className="text-[#A0684E]" />
            <h2 className="font-display text-2xl">Your orders</h2>
          </div>

          {loadingOrders ? (
            <p className="text-[#6E7B85]">Loading your orders…</p>
          ) : orders.length === 0 ? (
            <div className="border border-[#2A2E30]/10 rounded-sm p-10 text-center bg-[#DDD5C4]/30">
              <ShoppingBag size={28} className="mx-auto text-[#A0684E]" />
              <p className="font-display text-2xl mt-4">No orders yet</p>
              <p className="text-sm text-[#6E7B85] mt-2">When you place an order, it will show up here.</p>
              <Link
                to="/shop/kurtis"
                className="mt-6 inline-flex bg-[#A0684E] text-[#E8E3D7] px-6 py-3 rounded-sm uppercase tracking-widest text-sm"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <Link
                  key={o.order_number}
                  to={`/order/${o.order_number}`}
                  data-testid={`account-order-${o.order_number}`}
                  className="block border border-[#2A2E30]/10 rounded-sm p-5 bg-[#DDD5C4]/30 hover:border-[#A0684E]/40 transition-colors"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-body text-sm text-[#2A2E30]">
                        Order <span className="font-medium">{o.order_number}</span>
                      </div>
                      <div className="text-xs text-[#6E7B85] mt-0.5">
                        {new Date(o.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}{" "}
                        · {o.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-[11px] uppercase tracking-widest px-2.5 py-1 rounded-sm ${STATUS_STYLES[o.status] || ""}`}>
                        {o.status}
                      </span>
                      <span className="font-display text-lg text-[#A0684E]">{formatINR(o.total)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Account;
