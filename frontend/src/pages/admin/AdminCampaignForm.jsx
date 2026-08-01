import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { Field } from "@/pages/admin/AdminSettings";
import { ImageCropField } from "@/components/admin/ImageCropField";

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
  hero_image_crop: null,
  hero_secondary_image: "",
  hero_secondary_image_crop: null,
  cta_label: "Shop the drop",
  order_by_note: "",
  shloka: "",
  shloka_translation: "",
  attribute_groups: [],
};

const emptyItem = () => ({ order: 0, title: "", subtitle: "", description: "", color: "" });
const emptyGroup = () => ({ key: "", title: "", items: [] });

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

  const addGroup = () => setForm((f) => ({ ...f, attribute_groups: [...f.attribute_groups, emptyGroup()] }));
  const removeGroup = (gi) => setForm((f) => ({ ...f, attribute_groups: f.attribute_groups.filter((_, idx) => idx !== gi) }));
  const updateGroup = (gi, patch) =>
    setForm((f) => ({ ...f, attribute_groups: f.attribute_groups.map((g, idx) => (idx === gi ? { ...g, ...patch } : g)) }));

  const addItem = (gi) =>
    setForm((f) => ({
      ...f,
      attribute_groups: f.attribute_groups.map((g, idx) => (idx === gi ? { ...g, items: [...g.items, emptyItem()] } : g)),
    }));
  const removeItem = (gi, ii) =>
    setForm((f) => ({
      ...f,
      attribute_groups: f.attribute_groups.map((g, idx) =>
        idx === gi ? { ...g, items: g.items.filter((_, iidx) => iidx !== ii) } : g
      ),
    }));
  const updateItem = (gi, ii, patch) =>
    setForm((f) => ({
      ...f,
      attribute_groups: f.attribute_groups.map((g, idx) =>
        idx === gi ? { ...g, items: g.items.map((it, iidx) => (iidx === ii ? { ...it, ...patch } : it)) } : g
      ),
    }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Event name is required");
    setSaving(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      countdown_target: form.countdown_target ? new Date(form.countdown_target).toISOString() : null,
      attribute_groups: form.attribute_groups
        .filter((g) => g.title.trim())
        .map((g) => ({
          key: g.key,
          title: g.title.trim(),
          items: g.items
            .filter((it) => it.title.trim())
            .map((it) => ({
              order: parseInt(it.order) || 0,
              title: it.title.trim(),
              subtitle: it.subtitle || "",
              description: it.description || "",
              color: it.color || null,
            })),
        })),
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
              <ImageCropField
                label="Hero image (background)"
                value={form.hero_image}
                onChange={(v) => set("hero_image", v)}
                crop={form.hero_image_crop}
                onCropChange={(c) => set("hero_image_crop", c)}
                aspect={16 / 9}
              />
              <ImageCropField
                label="Secondary image (portrait)"
                value={form.hero_secondary_image}
                onChange={(v) => set("hero_secondary_image", v)}
                crop={form.hero_secondary_image_crop}
                onCropChange={(c) => set("hero_secondary_image_crop", c)}
                aspect={3 / 4}
              />
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

        <Card title="Event attributes">
          <p className="text-xs text-[#6E7B85] mb-4">
            Add any sections this event needs — e.g. "Day Colours" for Navratri, or "Schedule",
            "Special Offers", "Activities", "Highlights" for other kinds of events. Each section
            is a group of items shown on the event page in the order listed.
          </p>

          <div className="space-y-5">
            {form.attribute_groups.map((g, gi) => (
              <div key={gi} className="border border-[#8B9A9F]/25 rounded-sm p-4">
                <div className="flex items-end gap-3 mb-4">
                  <div className="flex-1">
                    <label className="label-caps">Section title (e.g. Day Colours, Schedule, Special Offers)</label>
                    <input
                      value={g.title}
                      onChange={(e) => updateGroup(gi, { title: e.target.value })}
                      className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]"
                    />
                  </div>
                  <button type="button" onClick={() => removeGroup(gi)} className="p-2 border border-[#8B9A9F]/40 rounded-sm text-[#7E1F35] hover:bg-[#7E1F35]/10">
                    <Trash2 size={15} />
                  </button>
                </div>

                {g.items.map((it, ii) => (
                  <div key={ii} className="flex items-end gap-3 mb-3 flex-wrap bg-[#E8E3D7]/40 p-3 rounded-sm">
                    <div className="w-16">
                      <label className="label-caps">Order</label>
                      <input type="number" value={it.order} onChange={(e) => updateItem(gi, ii, { order: e.target.value })} className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
                    </div>
                    <div className="flex-1 min-w-[130px]">
                      <label className="label-caps">Title</label>
                      <input value={it.title} onChange={(e) => updateItem(gi, ii, { title: e.target.value })} className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
                    </div>
                    <div className="flex-1 min-w-[130px]">
                      <label className="label-caps">Subtitle</label>
                      <input value={it.subtitle} onChange={(e) => updateItem(gi, ii, { subtitle: e.target.value })} className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <label className="label-caps">Description</label>
                      <input value={it.description} onChange={(e) => updateItem(gi, ii, { description: e.target.value })} className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
                    </div>
                    <div>
                      <label className="label-caps">Colour (optional)</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(it.color) ? it.color : "#A0684E"} onChange={(e) => updateItem(gi, ii, { color: e.target.value })} className="w-9 h-9 border border-[#8B9A9F]/40 rounded-sm bg-transparent" />
                        <input value={it.color || ""} onChange={(e) => updateItem(gi, ii, { color: e.target.value })} className="w-24 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeItem(gi, ii)} className="p-2 border border-[#8B9A9F]/40 rounded-sm text-[#7E1F35] hover:bg-[#7E1F35]/10">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addItem(gi)} className="inline-flex items-center gap-1.5 text-sm text-[#A0684E] hover:text-[#8C4A3B]">
                  <Plus size={15} /> Add item
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addGroup} className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#A0684E] hover:text-[#8C4A3B]">
            <Plus size={15} /> Add section
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
