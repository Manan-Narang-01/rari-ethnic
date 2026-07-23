import { useEffect, useState } from "react";
import { api, uploadImage } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ImageUp } from "lucide-react";

const ICON_OPTIONS = ["HandHeart", "ShieldCheck", "Truck", "Sparkles"];

export const AdminSettings = () => {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/admin/settings")
      .then((r) => setForm(r.data))
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setHero = (k, v) => setForm((f) => ({ ...f, home_hero: { ...f.home_hero, [k]: v } }));

  // Generic array-of-objects helpers
  const updateItem = (key, i, patch) =>
    setForm((f) => ({ ...f, [key]: f[key].map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));
  const removeItem = (key, i) =>
    setForm((f) => ({ ...f, [key]: f[key].filter((_, idx) => idx !== i) }));
  const addItem = (key, blank) => setForm((f) => ({ ...f, [key]: [...(f[key] || []), blank] }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        free_shipping_threshold: parseInt(form.free_shipping_threshold) || 0,
        shipping_fee: parseInt(form.shipping_fee) || 0,
        announcements: form.announcements.filter((s) => s.trim()),
        instagram_tiles: form.instagram_tiles.filter((s) => s.trim()),
      };
      const r = await api.put("/admin/settings", payload);
      setForm(r.data);
      toast.success("Settings saved");
    } catch (err) {
      const msg = typeof err?.response?.data?.detail === "string" ? err.response.data.detail : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <div className="text-[#6E7B85]">Loading…</div>;

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-4xl">Site settings</h1>
      <p className="text-sm text-[#6E7B85] mt-1">Global content and shipping rules for the storefront.</p>

      <div className="mt-8 space-y-8">
        {/* Announcement bar */}
        <Card title="Announcement bar">
          <p className="text-xs text-[#6E7B85] mb-3">Scrolling messages at the top of every page.</p>
          {form.announcements.map((msg, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                value={msg}
                onChange={(e) => set("announcements", form.announcements.map((m, idx) => (idx === i ? e.target.value : m)))}
                className={inputCls}
              />
              <IconBtn onClick={() => removeItem("announcements", i)}><Trash2 size={15} /></IconBtn>
            </div>
          ))}
          <AddBtn onClick={() => addItem("announcements", "")}>Add message</AddBtn>
        </Card>

        {/* Shipping */}
        <Card title="Shipping & pricing">
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Free shipping over ₹" type="number" value={form.free_shipping_threshold} onChange={(v) => set("free_shipping_threshold", v)} />
            <Field label="Shipping fee below threshold ₹" type="number" value={form.shipping_fee} onChange={(v) => set("shipping_fee", v)} />
          </div>
        </Card>

        {/* Socials */}
        <Card title="Contact & social">
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="WhatsApp number (no +)" value={form.whatsapp_number} onChange={(v) => set("whatsapp_number", v)} />
            <Field label="Instagram URL" value={form.instagram_url} onChange={(v) => set("instagram_url", v)} />
          </div>
        </Card>

        {/* Home hero */}
        <Card title="Homepage hero">
          <div className="space-y-5">
            <Field label="Eyebrow (small label)" value={form.home_hero?.eyebrow || ""} onChange={(v) => setHero("eyebrow", v)} />
            <div>
              <label className={labelCls}>Title lines (one per line)</label>
              <textarea
                rows={3}
                value={(form.home_hero?.title_lines || []).join("\n")}
                onChange={(e) => setHero("title_lines", e.target.value.split("\n"))}
                className={textareaCls}
              />
              <p className="text-xs text-[#6E7B85] mt-1">The last line is emphasised in gold.</p>
            </div>
            <Field label="Subtitle" textarea value={form.home_hero?.subtitle || ""} onChange={(v) => setHero("subtitle", v)} />
            <ImageField label="Hero background image" value={form.home_hero?.image || ""} onChange={(v) => setHero("image", v)} />
          </div>
        </Card>

        {/* Categories */}
        <Card title="Category tiles">
          {(form.home_categories || []).map((c, i) => (
            <div key={i} className="border border-[#8B9A9F]/25 rounded-sm p-4 mb-3">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Key (url: /shop/key)" value={c.key} onChange={(v) => updateItem("home_categories", i, { key: v })} />
                <Field label="Name" value={c.name} onChange={(v) => updateItem("home_categories", i, { name: v })} />
                <Field label="Tag line" value={c.tag} onChange={(v) => updateItem("home_categories", i, { tag: v })} />
                <Field label="Overlay colour (hex)" value={c.color} onChange={(v) => updateItem("home_categories", i, { color: v })} />
              </div>
              <div className="mt-4">
                <ImageField label="Tile image" value={c.image} onChange={(v) => updateItem("home_categories", i, { image: v })} />
              </div>
              <div className="mt-3 text-right">
                <IconBtn onClick={() => removeItem("home_categories", i)}><Trash2 size={15} /></IconBtn>
              </div>
            </div>
          ))}
          <AddBtn onClick={() => addItem("home_categories", { key: "", name: "", tag: "", image: "", color: "#A0684E" })}>Add category</AddBtn>
        </Card>

        {/* Why us */}
        <Card title="“Why us” badges">
          {(form.home_why || []).map((w, i) => (
            <div key={i} className="border border-[#8B9A9F]/25 rounded-sm p-4 mb-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Icon</label>
                  <select value={w.icon} onChange={(e) => updateItem("home_why", i, { icon: e.target.value })} className={inputCls}>
                    {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
                <Field label="Title" value={w.title} onChange={(v) => updateItem("home_why", i, { title: v })} />
              </div>
              <div className="mt-4">
                <Field label="Copy" textarea value={w.copy} onChange={(v) => updateItem("home_why", i, { copy: v })} />
              </div>
              <div className="mt-3 text-right">
                <IconBtn onClick={() => removeItem("home_why", i)}><Trash2 size={15} /></IconBtn>
              </div>
            </div>
          ))}
          <AddBtn onClick={() => addItem("home_why", { icon: "Sparkles", title: "", copy: "" })}>Add badge</AddBtn>
        </Card>

        {/* Instagram tiles */}
        <Card title="Instagram tiles">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(form.instagram_tiles || []).map((src, i) => (
              <div key={i}>
                <div className="relative aspect-square bg-[#DDD5C4] mb-2">
                  {src && <img src={src} alt="" className="w-full h-full object-cover" />}
                  <button onClick={() => removeItem("instagram_tiles", i)} className="absolute top-1 right-1 bg-[#2A2E30]/70 text-[#E8E3D7] p-1 rounded-sm">
                    <Trash2 size={13} />
                  </button>
                </div>
                <UploadInline onUploaded={(url) => set("instagram_tiles", form.instagram_tiles.map((s, idx) => (idx === i ? url : s)))} />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <AddBtn onClick={() => addItem("instagram_tiles", "")}>Add tile</AddBtn>
          </div>
        </Card>

        <div className="flex justify-end pt-4 border-t border-[#8B9A9F]/20 sticky bottom-0 bg-[#E8E3D7] py-4">
          <button
            onClick={save}
            disabled={saving}
            data-testid="admin-save-settings"
            className="px-8 py-3 bg-[#A0684E] text-[#E8E3D7] rounded-sm text-xs uppercase tracking-[0.2em] hover:bg-[#8C4A3B] disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- shared bits ---------- */
const inputCls = "w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]";
const textareaCls = "w-full mt-1 border border-[#8B9A9F]/30 bg-[#E8E3D7]/50 p-3 rounded-sm outline-none focus:border-[#A0684E] text-sm";
const labelCls = "label-caps";

const Card = ({ title, children }) => (
  <div className="bg-[#DDD5C4]/40 border border-[#8B9A9F]/20 rounded-sm p-5 md:p-6">
    <h3 className="font-display text-xl mb-4">{title}</h3>
    {children}
  </div>
);

export const Field = ({ label, value, onChange, type = "text", textarea }) => (
  <div>
    <label className={labelCls}>{label}</label>
    {textarea ? (
      <textarea rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={textareaCls} />
    ) : (
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    )}
  </div>
);

const IconBtn = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="p-2 border border-[#8B9A9F]/40 rounded-sm text-[#7E1F35] hover:bg-[#7E1F35]/10">
    {children}
  </button>
);

const AddBtn = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-sm text-[#A0684E] hover:text-[#8C4A3B]">
    <Plus size={15} /> {children}
  </button>
);

// Upload button that reports the resulting URL.
export const UploadInline = ({ onUploaded }) => {
  const [busy, setBusy] = useState(false);
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadImage(file);
      onUploaded(url);
    } catch {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-[#A0684E] cursor-pointer">
      {busy ? <Loader2 size={13} className="animate-spin" /> : <ImageUp size={13} />}
      {busy ? "Uploading…" : "Upload"}
      <input type="file" accept="image/*" onChange={onFile} className="hidden" />
    </label>
  );
};

// Image field: URL input + upload + preview.
export const ImageField = ({ label, value, onChange }) => (
  <div>
    <label className={labelCls}>{label}</label>
    <div className="flex gap-3 items-start mt-1">
      {value && <img src={value} alt="" className="w-16 h-16 object-cover rounded-sm bg-[#DDD5C4]" />}
      <div className="flex-1">
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="Paste an image URL or upload" className={inputCls} />
        <div className="mt-1"><UploadInline onUploaded={onChange} /></div>
      </div>
    </div>
  </div>
);

export default AdminSettings;
