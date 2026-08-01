import { useEffect, useState } from "react";
import { api, buildWaLink, formatINR } from "@/lib/api";
import { MessageCircle, Phone, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const STATUS = ["pending_payment", "confirmed", "dispatched", "delivered", "cancelled"];
const statusLabel = (s) => (s === "pending_payment" ? "Awaiting payment" : s);

export const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/orders");
      setOrders(r.data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (orderNumber, status) => {
    try {
      await api.patch(`/admin/orders/${orderNumber}`, { status });
      toast.success(`Marked ${status}`);
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const totals = orders.reduce(
    (acc, o) => {
      acc.total += o.total;
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    { total: 0 }
  );

  return (
    <div>
      <div className="mb-8">
        <p className="label-caps">Fulfilment</p>
        <h1 className="font-display text-4xl mt-1">Orders</h1>
        <p className="text-sm text-[#6E7B85] mt-1">
          {orders.length} order{orders.length !== 1 ? "s" : ""} · {formatINR(totals.total || 0)} revenue
        </p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {STATUS.map((s) => (
          <div key={s} className="bg-[#DDD5C4]/40 border border-[#8B9A9F]/20 rounded-sm p-4">
            <div className="label-caps">{statusLabel(s)}</div>
            <div className="font-display text-2xl mt-1">{totals[s] || 0}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-[#6E7B85]">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-[#6E7B85]">
          No orders yet. When your first order comes in, it'll appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.order_number}
              data-testid={`admin-order-${o.order_number}`}
              className="bg-[#DDD5C4]/40 border border-[#8B9A9F]/20 rounded-sm"
            >
              <div
                onClick={() => setExpanded({ ...expanded, [o.order_number]: !expanded[o.order_number] })}
                className="grid grid-cols-[1fr_auto] md:grid-cols-[130px_1fr_140px_120px_40px] gap-3 px-4 py-4 cursor-pointer items-center"
              >
                <div className="hidden md:block font-display text-lg text-[#A0684E]">
                  {o.order_number}
                </div>
                <div>
                  <div className="font-body text-sm">{o.customer_name}</div>
                  <div className="text-xs text-[#6E7B85] mt-0.5">
                    <span className="md:hidden font-display text-[#A0684E]">{o.order_number} · </span>
                    {o.items.length} item{o.items.length > 1 ? "s" : ""} · {o.city}
                  </div>
                  <div className="text-[10px] text-[#6E7B85]/70 mt-0.5">
                    {new Date(o.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="hidden md:block font-medium">{formatINR(o.total)}</div>
                <StatusPill status={o.status} />
                <ChevronDown
                  size={16}
                  className={`transition-transform text-[#6E7B85] ${expanded[o.order_number] ? "rotate-180" : ""}`}
                />
              </div>

              {expanded[o.order_number] && (
                <div className="border-t border-[#8B9A9F]/20 px-4 py-5 space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    {/* Customer */}
                    <div>
                      <div className="label-caps">Customer</div>
                      <div className="mt-2 text-sm space-y-0.5">
                        <div className="font-medium">{o.customer_name}</div>
                        <div className="text-[#6E7B85]">{o.email}</div>
                        <div className="text-[#6E7B85]">{o.phone}</div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <a
                          href={buildWaLink(`Hi ${o.customer_name.split(" ")[0]}! Regarding your Rari Ethnic order ${o.order_number}.`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`admin-order-whatsapp-${o.order_number}`}
                          className="inline-flex items-center gap-1.5 bg-[#25D366] text-white px-3 py-1.5 rounded-sm text-xs hover:opacity-90"
                        >
                          <MessageCircle size={13} /> WhatsApp customer
                        </a>
                        <a
                          href={`tel:${o.phone}`}
                          className="inline-flex items-center gap-1.5 border border-[#8B9A9F]/40 px-3 py-1.5 rounded-sm text-xs hover:bg-[#DDD5C4]"
                        >
                          <Phone size={13} /> Call
                        </a>
                      </div>
                    </div>
                    {/* Address */}
                    <div>
                      <div className="label-caps">Shipping address</div>
                      <div className="mt-2 text-sm text-[#2A2E30]/85 leading-relaxed">
                        {o.address_line1}
                        {o.address_line2 && <>, {o.address_line2}</>}
                        <br />
                        {o.city}, {o.state} — {o.pincode}
                      </div>
                      {o.notes && (
                        <div className="mt-3 p-2.5 bg-[#B58D3E]/10 border border-[#B58D3E]/25 rounded-sm text-xs">
                          <strong>Note:</strong> {o.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <div className="label-caps mb-2">Items</div>
                    <div className="space-y-2">
                      {o.items.map((it, i) => (
                        <div key={i} className="flex gap-3 items-center bg-[#E8E3D7]/60 p-2 rounded-sm">
                          <img src={it.image} alt="" className="w-12 h-14 object-cover" onError={(e) => { e.currentTarget.style.opacity=0; }} />
                          <div className="flex-1">
                            <div className="text-sm">{it.name}</div>
                            <div className="text-xs text-[#6E7B85]">
                              {it.size && `Size ${it.size} · `}Qty {it.quantity} · {formatINR(it.price)} each
                            </div>
                          </div>
                          <div className="font-medium text-sm">{formatINR(it.price * it.quantity)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-3 gap-3 text-sm border-t border-[#8B9A9F]/20 pt-4">
                    <div>Subtotal: <strong>{formatINR(o.subtotal)}</strong></div>
                    <div>Shipping: <strong>{o.shipping === 0 ? "Free" : formatINR(o.shipping)}</strong></div>
                    <div>Total ({o.payment_method}): <strong className="text-[#A0684E]">{formatINR(o.total)}</strong></div>
                  </div>

                  {/* Actions */}
                  <div>
                    <div className="label-caps mb-2">Update status</div>
                    <div className="flex flex-wrap gap-2">
                      {STATUS.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(o.order_number, s)}
                          disabled={o.status === s}
                          data-testid={`admin-order-status-${o.order_number}-${s}`}
                          className={`px-3 py-1.5 text-xs uppercase tracking-widest rounded-sm border ${
                            o.status === s
                              ? "bg-[#2A2E30] text-[#E8E3D7] border-[#2A2E30] opacity-60"
                              : "border-[#8B9A9F]/40 hover:border-[#2A2E30]"
                          }`}
                        >
                          {statusLabel(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatusPill = ({ status }) => {
  const map = {
    pending_payment: "bg-[#6E7B85]/20 text-[#5A6870]",
    confirmed: "bg-[#B58D3E]/25 text-[#8C6E28]",
    dispatched: "bg-[#7B6E5A]/25 text-[#5A4E3E]",
    delivered: "bg-[#7B6E5A]/40 text-[#3E4245]",
    cancelled: "bg-[#A05B6A]/20 text-[#7A3A48]",
  };
  return (
    <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm ${map[status] || ""}`}>
      {status === "pending_payment" ? "Awaiting payment" : status}
    </span>
  );
};

export default AdminOrders;
