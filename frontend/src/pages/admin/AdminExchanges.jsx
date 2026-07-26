import { useEffect, useState } from "react";
import { api, buildWaLink, formatINR } from "@/lib/api";
import { MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

const STATUS = ["pending", "approved", "rejected", "completed"];

export const AdminExchanges = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/exchange-requests");
      setRequests(r.data);
    } catch {
      toast.error("Failed to load exchange requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (req, status) => {
    try {
      await api.put(`/admin/exchange-requests/${req.id}`, { status, admin_note: notes[req.id] ?? req.admin_note });
      toast.success(`Marked ${status}`);
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const totals = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-8">
        <p className="label-caps">15-day policy</p>
        <h1 className="font-display text-4xl mt-1">Exchange requests</h1>
        <p className="text-sm text-[#6E7B85] mt-1">
          {requests.length} request{requests.length !== 1 ? "s" : ""} total
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {STATUS.map((s) => (
          <div key={s} className="bg-[#DDD5C4]/40 border border-[#8B9A9F]/20 rounded-sm p-4">
            <div className="label-caps">{s}</div>
            <div className="font-display text-2xl mt-1">{totals[s] || 0}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-[#6E7B85]">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-[#6E7B85]">
          No exchange requests yet. Customers can request one from a delivered order within 15 days.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              data-testid={`admin-exchange-${r.id}`}
              className="bg-[#DDD5C4]/40 border border-[#8B9A9F]/20 rounded-sm p-5 space-y-4"
            >
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="font-display text-lg text-[#A0684E]">{r.order_number}</div>
                  <div className="text-sm mt-0.5">{r.customer_name} · {r.email}</div>
                  <div className="text-xs text-[#6E7B85] mt-0.5">
                    {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}Order total {formatINR(r.order_total)}
                  </div>
                </div>
                <StatusPill status={r.status} />
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="label-caps">Reason</div>
                  <div className="mt-1">{r.reason}</div>
                  {r.notes && <div className="text-xs text-[#6E7B85] mt-1">"{r.notes}"</div>}
                </div>
                <div className="flex gap-2 items-start md:justify-end">
                  <a
                    href={buildWaLink(`Hi ${r.customer_name.split(" ")[0]}! Regarding your exchange request for order ${r.order_number}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-[#25D366] text-white px-3 py-1.5 rounded-sm text-xs hover:opacity-90"
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                  <a
                    href={`tel:${r.phone}`}
                    className="inline-flex items-center gap-1.5 border border-[#8B9A9F]/40 px-3 py-1.5 rounded-sm text-xs hover:bg-[#DDD5C4]"
                  >
                    <Phone size={13} /> Call
                  </a>
                </div>
              </div>

              <div>
                <label className="label-caps">Admin note</label>
                <input
                  value={notes[r.id] ?? r.admin_note}
                  onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                  className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 text-sm outline-none focus:border-[#A0684E]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(r, s)}
                    disabled={r.status === s}
                    data-testid={`admin-exchange-status-${r.id}-${s}`}
                    className={`px-3 py-1.5 text-xs uppercase tracking-widest rounded-sm border ${
                      r.status === s
                        ? "bg-[#2A2E30] text-[#E8E3D7] border-[#2A2E30] opacity-60"
                        : "border-[#8B9A9F]/40 hover:border-[#2A2E30]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatusPill = ({ status }) => {
  const map = {
    pending: "bg-[#B58D3E]/25 text-[#8C6E28]",
    approved: "bg-[#185D64]/25 text-[#185D64]",
    rejected: "bg-[#A05B6A]/20 text-[#7A3A48]",
    completed: "bg-[#7B6E5A]/25 text-[#3E4245]",
  };
  return (
    <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm ${map[status] || ""}`}>
      {status}
    </span>
  );
};

export default AdminExchanges;
