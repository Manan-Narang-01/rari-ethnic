import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { Field, ImageField } from "@/pages/admin/AdminSettings";

const empty = {
  name: "",
  slug: "navratri",
  is_active: false,
  theme: "festive",
  countdown_target: "",
  countdown_label: "Navratri arrives in",
  hero_eyebrow: "",
  hero_title: "",
  hero_subtitle: "",
  hero_image: "",
  hero_secondary_image: "",
  cta_label: "Shop the drop",
  order_by_note: "",
  shloka: "",
  shloka_translation: "",
  day_colors: [],
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
  }, [id, mode, nav]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const updateDay = (i, patch) =>
    setForm((f) => ({ ...f, day_colors: f.day_colors.map((d, idx) => (idx === i ? { ...d, ...patch } : d)) }));
  const removeDay = (i) => setForm((f) => ({ ...f, day_colors: f.day_colors.filter((_, idx) => idx !== i) }));
  const addDay = () =>
    setForm((f) => ({ ...f, day_colors: [...f.day_colors, { day: f.day_colors.length + 1, name: "", hex: "#A0684E", meaning: "" }] }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Event name is required");
    setSaving(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      countdown_target: form.countdown_target ? new Date(form.countdown_target).toISOString() : null,
      day_colors: form.day_colors
        .filter((d) => d.name.trim())
        .map((d) => ({ ...d, day: parseInt(d.day) || 0 })),
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
              <p className="text-xs text-[#6E7B85] mt-1">Leave empty to hide the countdown.</p>
            </div>
            <Field label="Countdown label" value={form.countdown_label} onChange={(v) => set("countdown_label", v)} />
          </div>
        </Card>

        <Card title="Hero">
          <div className="space-y-5">
            <Field label="Eyebrow" value={form.hero_eyebrow} onChange={(v) => set("hero_eyebrow", v)} />
            <Field label="Title (sentences split into lines automatically)" textarea value={form.hero_title} onChange={(v) => set("hero_title", v)} />
            <Field label="Subtitle" textarea value={form.hero_subtitle} onChange={(v) => set("hero_subtitle", v)} />
            <div className="grid md:grid-cols-2 gap-5">
              <ImageField label="Hero image (background)" value={form.hero_image} onChange={(v) => set("hero_image", v)} />
              <ImageField label="Secondary image (portrait)" value={form.hero_secondary_image} onChange={(v) => set("hero_secondary_image", v)} />
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="CTA button label" value={form.cta_label} onChange={(v) => set("cta_label", v)} />
              <Field label="Urgency note (e.g. Order by Sep 20…)" value={form.order_by_note} onChange={(v) => set("order_by_note", v)} />
            </div>
          </div>
        </Card>

        <Card title="Shloka / tagline strip">
          <div className="space-y-5">
            <Field label="Shloka / quote" value={form.shloka} onChange={(v) => set("shloka", v)} />
            <Field label="Translation" value={form.shloka_translation} onChange={(v) => set("shloka_translation", v)} />
          </div>
        </Card>

        <Card title="Day colours (nine-day guide)">
          <p className="text-xs text-[#6E7B85] mb-3">Shown as the colour guide on the event page. Leave empty to hide.</p>
          {form.day_colors.map((d, i) => (
            <div key={i} className="flex items-end gap-3 mb-3 flex-wrap">
              <div className="w-16">
                <label className="label-caps">Day</label>
                <input type="number" value={d.day} onChange={(e) => updateDay(i, { day: e.target.value })} className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="label-caps">Colour name</label>
                <input value={d.name} onChange={(e) => updateDay(i, { name: e.target.value })} className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
              </div>
              <div>
                <label className="label-caps">Hex</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(d.hex) ? d.hex : "#A0684E"} onChange={(e) => updateDay(i, { hex: e.target.value })} className="w-9 h-9 border border-[#8B9A9F]/40 rounded-sm bg-transparent" />
                  <input value={d.hex} onChange={(e) => updateDay(i, { hex: e.target.value })} className="w-24 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
                </div>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="label-caps">Meaning</label>
                <input value={d.meaning} onChange={(e) => updateDay(i, { meaning: e.target.value })} className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
              </div>
              <button type="button" onClick={() => removeDay(i)} className="p-2 border border-[#8B9A9F]/40 rounded-sm text-[#7E1F35] hover:bg-[#7E1F35]/10">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addDay} className="inline-flex items-center gap-1.5 text-sm text-[#A0684E] hover:text-[#8C4A3B]">
            <Plus size={15} /> Add day
          </button>
        </Card>

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
