import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, uploadImage } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, ImageUp, Loader2 } from "lucide-react";

const emptyForm = {
  key: "",
  name: "",
  description: "",
  image: "",
  sort_order: 0,
  is_active: true,
  show_in_navbar: true,
  show_in_catalog: true,
};

export const AdminCategoryForm = ({ mode = "create" }) => {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    api
      .get(`/admin/categories/${id}`)
      .then((r) => setForm({ ...emptyForm, ...r.data }))
      .catch((err) => {
        if (err?.response?.status === 404) {
          toast.error("Category not found");
          nav("/admin/categories");
          return;
        }
        toast.error("Load failed");
      })
      .finally(() => setLoading(false));
  }, [id, mode, nav]);

  const setField = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Category name is required");
    setSaving(true);
    const payload = {
      key: form.key.trim() || null,
      name: form.name.trim(),
      description: form.description.trim(),
      image: form.image.trim() || null,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active,
      show_in_navbar: form.show_in_navbar,
      show_in_catalog: form.show_in_catalog,
    };
    try {
      if (mode === "edit") {
        await api.put(`/admin/categories/${id}`, payload);
        toast.success("Category updated");
      } else {
        await api.post("/admin/categories", payload);
        toast.success("Category added");
      }
      nav("/admin/categories");
    } catch (err) {
      const msg = typeof err?.response?.data?.detail === "string" ? err.response.data.detail : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-[#6E7B85]">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <Link to="/admin/categories" className="text-sm text-[#6E7B85] hover:text-[#A0684E] inline-flex items-center gap-1">
        <ChevronLeft size={14} /> Back to categories
      </Link>
      <h1 className="font-display text-4xl mt-3">
        {mode === "edit" ? "Edit category" : "Add category"}
      </h1>

      <form onSubmit={submit} data-testid="admin-category-form" className="mt-8 space-y-8">
        <div className="bg-[#DDD5C4]/40 border border-[#8B9A9F]/20 rounded-sm p-5 md:p-6 space-y-5">
          <Field label="Category name" value={form.name} onChange={setField("name")} testid="admin-category-name" required />
          <Field
            label="Key (URL slug — leave blank to auto-generate)"
            value={form.key}
            onChange={setField("key")}
            placeholder="e.g. kurtis"
            testid="admin-category-key"
          />
          <Field label="Description" value={form.description} onChange={setField("description")} textarea rows={3} testid="admin-category-description" />
          <ImageField label="Catalog cover photo" value={form.image} onChange={(url) => setForm((f) => ({ ...f, image: url }))} />
          <Field label="Sort order" type="number" value={form.sort_order} onChange={setField("sort_order")} testid="admin-category-sort-order" />
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={setField("is_active")}
                data-testid="admin-category-active"
                className="accent-[#A0684E] w-4 h-4"
              />
              <span className="text-sm">Show on site</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.show_in_navbar}
                onChange={setField("show_in_navbar")}
                data-testid="admin-category-show-navbar"
                className="accent-[#A0684E] w-4 h-4"
              />
              <span className="text-sm">Show in Navbar</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.show_in_catalog}
                onChange={setField("show_in_catalog")}
                data-testid="admin-category-show-catalog"
                className="accent-[#A0684E] w-4 h-4"
              />
              <span className="text-sm">Show in Catalog</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-[#8B9A9F]/20">
          <Link
            to="/admin/categories"
            className="px-6 py-3 border border-[#8B9A9F]/40 rounded-sm text-xs uppercase tracking-[0.2em] text-center hover:bg-[#DDD5C4]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            data-testid="admin-save-category"
            className="px-8 py-3 bg-[#A0684E] text-[#E8E3D7] rounded-sm text-xs uppercase tracking-[0.2em] hover:bg-[#8C4A3B] disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Publish category"}
          </button>
        </div>
      </form>
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text", textarea, rows = 2, placeholder, testid, required }) => (
  <div>
    <label className="label-caps">{label}{required && <span className="text-[#A0684E]"> *</span>}</label>
    {textarea ? (
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        data-testid={testid}
        className="w-full mt-1 border border-[#8B9A9F]/30 bg-[#E8E3D7]/50 p-3 rounded-sm outline-none focus:border-[#A0684E] text-sm"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        data-testid={testid}
        className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]"
      />
    )}
  </div>
);

// Upload button that reports the resulting URL — click opens the browser's
// native file/folder picker to choose an image from your computer.
const UploadInline = ({ onUploaded }) => {
  const [busy, setBusy] = useState(false);
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadImage(file);
      onUploaded(url);
      toast.success("Image uploaded");
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
      {busy ? "Uploading…" : "Choose file…"}
      <input type="file" accept="image/*" onChange={onFile} className="hidden" />
    </label>
  );
};

// Image field: live preview + paste-a-URL fallback + upload-from-computer.
const ImageField = ({ label, value, onChange }) => (
  <div>
    <label className="label-caps">{label}</label>
    <div className="flex gap-3 items-start mt-1">
      {value && <img src={value} alt="" className="w-16 h-16 object-cover rounded-sm bg-[#DDD5C4]" />}
      <div className="flex-1">
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste an image URL, or upload one below"
          data-testid="admin-category-image"
          className="w-full border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]"
        />
        <div className="mt-1.5">
          <UploadInline onUploaded={onChange} />
        </div>
      </div>
    </div>
  </div>
);

export default AdminCategoryForm;
