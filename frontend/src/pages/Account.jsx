import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, formatINR } from "@/lib/api";
import { Seo } from "@/components/Seo";
import { toast } from "sonner";
import { Package, LogOut, ShoppingBag, RefreshCw } from "lucide-react";

const STATUS_STYLES = {
  pending_payment: "bg-[#6E7B85]/15 text-[#5A6870]",
  confirmed: "bg-[#B58D3E]/15 text-[#8A6A1E]",
  dispatched: "bg-[#1E3A5F]/15 text-[#1E3A5F]",
  delivered: "bg-[#185D64]/15 text-[#185D64]",
  cancelled: "bg-[#7E1F35]/15 text-[#7E1F35]",
};
const statusLabel = (s) => (s === "pending_payment" ? "Awaiting payment" : s);

const EXCHANGE_WINDOW_DAYS = 15;
const EXCHANGE_REASONS = ["Size issue", "Color/design not as expected", "Damaged or defective", "Changed my mind", "Other"];

const EXCHANGE_STATUS_STYLES = {
  pending: "bg-[#B58D3E]/15 text-[#8A6A1E]",
  approved: "bg-[#185D64]/15 text-[#185D64]",
  rejected: "bg-[#7E1F35]/15 text-[#7E1F35]",
  completed: "bg-[#7B6E5A]/20 text-[#3E4245]",
};

const daysLeft = (deliveredAt) => {
  const deadline = new Date(deliveredAt).getTime() + EXCHANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000));
};

export const Account = () => {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [exchangeRequests, setExchangeRequests] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const loadExchangeRequests = () => api.get("/customer/exchange-requests").then((r) => setExchangeRequests(r.data));

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      api.get("/customer/orders").then((r) => setOrders(r.data)),
      loadExchangeRequests().catch(() => setExchangeRequests([])),
    ])
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [isAuthenticated]);

  if (loading) return <div className="container-x py-24 text-center text-[#6E7B85]">Loading…</div>;
  if (!isAuthenticated) return <Navigate to="/login?next=/account" replace />;
  if (user.role !== "customer") return <Navigate to="/admin" replace />;

  return (
    <div className="bg-[#E8E3D7] min-h-[70vh]">
      <Seo title="My Account" noindex />
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
                <div
                  key={o.order_number}
                  data-testid={`account-order-${o.order_number}`}
                  className="border border-[#2A2E30]/10 rounded-sm bg-[#DDD5C4]/30 hover:border-[#A0684E]/40 transition-colors"
                >
                  <Link to={`/order/${o.order_number}`} className="block p-5">
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
                          {statusLabel(o.status)}
                        </span>
                        <span className="font-display text-lg text-[#A0684E]">{formatINR(o.total)}</span>
                      </div>
                    </div>
                  </Link>

                  <ExchangeSection
                    order={o}
                    request={exchangeRequests.find((r) => r.order_number === o.order_number)}
                    onRequested={loadExchangeRequests}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ExchangeSection = ({ order, request, onRequested }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(EXCHANGE_REASONS[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (order.status !== "delivered" || !order.delivered_at) return null;

  const left = daysLeft(order.delivered_at);

  if (request) {
    return (
      <div className="px-5 pb-5 pt-0 flex items-center gap-2 text-xs">
        <RefreshCw size={13} className="text-[#6E7B85]" />
        <span className="text-[#6E7B85]">Exchange request:</span>
        <span className={`uppercase tracking-widest px-2 py-0.5 rounded-sm ${EXCHANGE_STATUS_STYLES[request.status] || ""}`}>
          {request.status}
        </span>
      </div>
    );
  }

  if (left <= 0) {
    return (
      <div className="px-5 pb-5 pt-0 text-xs text-[#6E7B85]">
        Exchange window closed ({EXCHANGE_WINDOW_DAYS} days from delivery)
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSubmitting(true);
    try {
      await api.post(`/customer/orders/${order.order_number}/exchange-requests`, { reason, notes });
      toast.success("Exchange request submitted");
      setOpen(false);
      onRequested();
    } catch (err) {
      const msg = typeof err?.response?.data?.detail === "string" ? err.response.data.detail : "Could not submit request";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div className="px-5 pb-5 pt-0 flex items-center gap-3">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
          data-testid={`request-exchange-${order.order_number}`}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#A0684E] border border-[#A0684E]/40 px-3 py-1.5 rounded-sm hover:bg-[#A0684E]/10"
        >
          <RefreshCw size={13} /> Request exchange
        </button>
        <span className="text-xs text-[#6E7B85]">{left} day{left !== 1 ? "s" : ""} left</span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="px-5 pb-5 pt-0 space-y-3">
      <div>
        <label className="label-caps">Reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 text-sm outline-none focus:border-[#A0684E]"
        >
          {EXCHANGE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="label-caps">Notes (optional)</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything that'll help us process this faster"
          className="w-full mt-1 border border-[#8B9A9F]/30 bg-[#E8E3D7]/50 p-2.5 rounded-sm text-sm outline-none focus:border-[#A0684E]"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          data-testid={`submit-exchange-${order.order_number}`}
          className="px-4 py-2 bg-[#A0684E] text-[#E8E3D7] rounded-sm text-xs uppercase tracking-widest hover:bg-[#8C4A3B] disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit request"}
        </button>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
          className="px-4 py-2 border border-[#8B9A9F]/40 rounded-sm text-xs uppercase tracking-widest hover:bg-[#DDD5C4]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default Account;
