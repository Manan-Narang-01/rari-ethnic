import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CheckCircle2, Circle, CalendarClock } from "lucide-react";

export const AdminCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const load = () => {
    api
      .get("/admin/campaigns")
      .then((r) => setCampaigns(r.data))
      .catch(() => toast.error("Failed to load campaigns"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const activate = async (c) => {
    const current = campaigns.find((x) => x.is_active && x.id !== c.id);
    if (current && !window.confirm(`Make "${c.name}" live? This will pause "${current.name}", which is currently live.`)) {
      return;
    }
    try {
      await api.put(`/admin/campaigns/${c.id}`, { is_active: true });
      toast.success(`"${c.name}" is now live`);
      load();
    } catch {
      toast.error("Could not activate");
    }
  };

  const deactivate = async (c) => {
    try {
      await api.put(`/admin/campaigns/${c.id}`, { is_active: false });
      toast.success("Campaign paused");
      load();
    } catch {
      toast.error("Could not update");
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete campaign "${c.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/campaigns/${c.id}`);
      toast.success("Campaign deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) return <div className="text-[#6E7B85]">Loading…</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Events & campaigns</h1>
          <p className="text-sm text-[#6E7B85] mt-1">Navratri, Diwali, wedding season — control the featured event.</p>
        </div>
        <button
          onClick={() => nav("/admin/campaigns/new")}
          data-testid="admin-new-campaign"
          className="inline-flex items-center gap-2 bg-[#A0684E] text-[#E8E3D7] px-5 py-3 rounded-sm text-xs uppercase tracking-[0.2em] hover:bg-[#8C4A3B]"
        >
          <Plus size={15} /> New event
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="mt-10 border border-dashed border-[#8B9A9F]/40 rounded-sm p-12 text-center">
          <CalendarClock size={28} className="mx-auto text-[#8B9A9F]" />
          <p className="font-display text-2xl mt-3">No events yet</p>
          <p className="text-sm text-[#6E7B85] mt-1">Create one to feature it across the storefront.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              data-testid={`campaign-row-${c.id}`}
              className="flex items-center justify-between gap-4 flex-wrap border border-[#8B9A9F]/25 rounded-sm p-4 bg-[#DDD5C4]/30"
            >
              <div className="flex items-center gap-3 min-w-0">
                {c.is_active ? (
                  <CheckCircle2 size={20} className="text-[#185D64] shrink-0" />
                ) : (
                  <Circle size={20} className="text-[#8B9A9F] shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-display text-xl truncate">{c.name}</div>
                  <div className="text-xs text-[#6E7B85]">
                    {c.is_active ? "Live now" : "Paused"} · theme: {c.theme}
                    {c.countdown_target && ` · counts down to ${new Date(c.countdown_target).toLocaleDateString("en-IN")}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.is_active ? (
                  <button onClick={() => deactivate(c)} className="px-3 py-2 text-xs border border-[#8B9A9F]/40 rounded-sm hover:bg-[#DDD5C4]">
                    Pause
                  </button>
                ) : (
                  <button onClick={() => activate(c)} data-testid={`activate-${c.id}`} className="px-3 py-2 text-xs bg-[#185D64] text-[#E8E3D7] rounded-sm hover:opacity-90">
                    Make live
                  </button>
                )}
                <Link to={`/admin/campaigns/${c.id}/edit`} className="p-2 border border-[#8B9A9F]/40 rounded-sm hover:bg-[#DDD5C4]" title="Edit">
                  <Pencil size={15} />
                </Link>
                <button onClick={() => remove(c)} className="p-2 border border-[#8B9A9F]/40 rounded-sm text-[#7E1F35] hover:bg-[#7E1F35]/10" title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCampaigns;
