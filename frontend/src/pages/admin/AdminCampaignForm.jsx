import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Field } from "@/pages/admin/AdminSettings";
import { SectionBuilder } from "@/components/admin/events/SectionBuilder";
import { LogEntry } from "@/components/admin/events/LogEntry";

const empty = {
  name: "",
  slug: "navratri",
  is_active: false,
  theme: "festive",
  countdown_target: "",
  countdown_label: "Navratri arrives in",
  sections: [],
};

// Converts an ISO string to the value a <input type="datetime-local"> expects.
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const AdminCampaignForm = ({ mode = "create" }) => {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(mode === "edit");

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    api
      .get("/admin/campaigns")
      .then((r) => {
        const c = r.data.find((x) => x.id === id);
        if (!c) {
          toast.error("Campaign not found");
          nav("/admin/campaigns");
          return;
        }
        setForm({ ...empty, ...c, countdown_target: toLocalInput(c.countdown_target) });
      })
      .catch(() => toast.error("Load failed"))
      .finally(() => setLoading(false));
    api
      .get(`/admin/campaigns/${id}/logs`)
      .then((r) => setLogs(r.data))
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, [id, mode, nav]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Event name is required");
    setSaving(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      countdown_target: form.countdown_target ? new Date(form.countdown_target).toISOString() : null,
    };
    try {
      if (mode === "edit") {
        await api.put(`/admin/campaigns/${id}`, payload);
        toast.success("Event updated");
      } else {
        await api.post("/admin/campaigns", payload);
        toast.success("Event created");
      }
      nav("/admin/campaigns");
    } catch (err) {
      const msg = typeof err?.response?.data?.detail === "string" ? err.response.data.detail : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-[#6E7B85]">Loading…</div>;

  return (
    <div className="max-w-4xl">
      <Link to="/admin/campaigns" className="text-sm text-[#6E7B85] hover:text-[#A0684E] inline-flex items-center gap-1">
        <ChevronLeft size={14} /> Back to events
      </Link>
      <h1 className="font-display text-4xl mt-3">{mode === "edit" ? "Edit event" : "New event"}</h1>

      <form onSubmit={submit} className="mt-8 space-y-8">
        <Card title="Basics">
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Event name (e.g. Navratri 2026)" value={form.name} onChange={(v) => set("name", v)} />
            <Field label="Landing slug (page: /navratri)" value={form.slug} onChange={(v) => set("slug", v)} />
            <div>
              <label className="label-caps">Theme</label>
              <select value={form.theme} onChange={(e) => set("theme", e.target.value)} className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]">
                <option value="festive">Festive (dark maroon/gold)</option>
                <option value="default">Default</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-6">
              <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="accent-[#A0684E] w-4 h-4" />
              <span className="text-sm">Make this the live event (deactivates others)</span>
            </label>
          </div>
        </Card>

        <Card title="Countdown">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="label-caps">Countdown target date & time</label>
              <input
                type="datetime-local"
                value={form.countdown_target}
                onChange={(e) => set("countdown_target", e.target.value)}
                className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]"
              />
              <p className="text-xs text-[#6E7B85] mt-1">Leave empty to hide the countdown everywhere it's shown, including on the homepage.</p>
            </div>
            <Field label="Countdown label" value={form.countdown_label} onChange={(v) => set("countdown_label", v)} />
          </div>
        </Card>

        <Card title="Page sections">
          <SectionBuilder sections={form.sections} onChange={(sections) => set("sections", sections)} />
        </Card>

        {mode === "edit" && (
          <Card title="History">
            {logsLoading ? (
              <p className="text-sm text-[#6E7B85]">Loading…</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-[#6E7B85]">No changes logged yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </div>
            )}
          </Card>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-[#8B9A9F]/20">
          <Link to="/admin/campaigns" className="px-6 py-3 border border-[#8B9A9F]/40 rounded-sm text-xs uppercase tracking-[0.2em] hover:bg-[#DDD5C4]">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="px-8 py-3 bg-[#A0684E] text-[#E8E3D7] rounded-sm text-xs uppercase tracking-[0.2em] hover:bg-[#8C4A3B] disabled:opacity-60">
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Create event"}
          </button>
        </div>
      </form>
    </div>
  );
};

const Card = ({ title, children }) => (
  <div className="bg-[#DDD5C4]/40 border border-[#8B9A9F]/20 rounded-sm p-5 md:p-6">
    <h3 className="font-display text-xl mb-4">{title}</h3>
    {children}
  </div>
);

export default AdminCampaignForm;
