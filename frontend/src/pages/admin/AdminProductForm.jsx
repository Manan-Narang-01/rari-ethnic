import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, API } from "@/lib/api";
import { toast } from "sonner";
import { Upload, X, Loader2, ChevronLeft } from "lucide-react";

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const OCCASIONS = ["Daily", "Office", "Festive", "Sangeet", "Wedding", "Reception", "Haldi", "Mehendi", "Garba", "Navratri", "Diwali", "Family function", "Nikah", "Party"];

const emptyForm = {
  name: "",
  category: "kurtis",
  price: "",
  compare_at_price: "",
  description: "",
  fabric: "",
  care: "",
  fit_notes: "",
  occasion: [],
  sizes: [],
  colors: "",
  color_hex: "",
  images: [],
  stock: 5,
  is_bestseller: false,
  is_new: true,
  is_navratri: false,
  is_active: true,
  navratri_day: "",
  edit_tag: "",
};

export const AdminProductForm = ({ mode = "create" }) => {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    api.get("/admin/categories").then((r) => setCategories(r.data)).catch(() => toast.error("Could not load categories"));
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    api
      .get(`/admin/products/${id}`)
      .then((r) => {
        const p = r.data;
        setForm({
          ...emptyForm,
          ...p,
          price: String(p.price ?? ""),
          compare_at_price: p.compare_at_price ? String(p.compare_at_price) : "",
          colors: (p.colors || []).join(", "),
          color_hex: (p.color_hex || []).join(", "),
        });
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          toast.error("Product not found");
          nav("/admin");
          return;
        }
        toast.error("Load failed");
      })
      .finally(() => setLoading(false));
  }, [id, mode, nav]);

  const setField = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const toggleArr = (key, val) => {
    const cur = form[key] || [];
    setForm({
      ...form,
      [key]: cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val],
    });
  };

  const uploadFiles = async (files) => {
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      const fd = new FormData();
      fd.append("file", file);
      try {
        const r = await api.post("/admin/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        // Turn relative url into full backend url for browser display
        const fullUrl = r.data.url.startsWith("http") ? r.data.url : `${API}${r.data.url.replace(/^\/api/, "")}`;
        uploaded.push(fullUrl);
      } catch (e) {
        toast.error(`Upload failed: ${file.name}`);
      }
    }
    if (uploaded.length) {
      setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
      toast.success(`Uploaded ${uploaded.length} image${uploaded.length > 1 ? "s" : ""}`);
    }
    setUploading(false);
  };

  const onFileInput = (e) => {
    if (e.target.files?.length) uploadFiles(Array.from(e.target.files));
  };
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(Array.from(e.dataTransfer.files));
  };
  const removeImage = (i) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  };
  const moveImage = (i, dir) => {
    const arr = [...form.images];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setForm({ ...form, images: arr });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Product name is required");
    if (!form.price || parseInt(form.price) < 1) return toast.error("Enter a valid price");
    if (form.images.length === 0) return toast.error("Upload at least one image");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      price: parseInt(form.price),
      compare_at_price: form.compare_at_price ? parseInt(form.compare_at_price) : null,
      description: form.description.trim(),
      fabric: form.fabric.trim(),
      care: form.care.trim(),
      fit_notes: form.fit_notes.trim(),
      occasion: form.occasion,
      sizes: form.sizes,
      colors: form.colors.split(",").map((s) => s.trim()).filter(Boolean),
      color_hex: form.color_hex.split(",").map((s) => s.trim()).filter(Boolean),
      images: form.images,
      stock: parseInt(form.stock) || 0,
      is_bestseller: form.is_bestseller,
      is_new: form.is_new,
      is_navratri: form.is_navratri,
      is_active: form.is_active,
      navratri_day: form.navratri_day || null,
      edit_tag: form.edit_tag || null,
    };
    try {
      if (mode === "edit") {
        await api.put(`/admin/products/${id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/admin/products", payload);
        toast.success("Product added");
      }
      nav("/admin");
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
      <Link to="/admin" className="text-sm text-[#6E7B85] hover:text-[#A0684E] inline-flex items-center gap-1">
        <ChevronLeft size={14} /> Back to products
      </Link>
      <h1 className="font-display text-4xl mt-3">
        {mode === "edit" ? "Edit product" : "Add new product"}
      </h1>

      <form onSubmit={submit} data-testid="admin-product-form" className="mt-8 space-y-8">
        {/* Images */}
        <Card title="Photos">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            data-testid="image-dropzone"
            className={`border-2 border-dashed rounded-sm p-8 text-center transition-colors ${
              dragOver ? "border-[#A0684E] bg-[#A0684E]/5" : "border-[#8B9A9F]/40 bg-[#DDD5C4]/25"
            }`}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-[#6E7B85]">
                <Loader2 className="animate-spin" size={18} /> Uploading…
              </div>
            ) : (
              <>
                <Upload size={28} className="mx-auto text-[#8B9A9F] mb-3" />
                <p className="text-sm">
                  Drag & drop images here, or{" "}
                  <label className="text-[#A0684E] underline cursor-pointer">
                    browse
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onFileInput}
                      className="hidden"
                      data-testid="image-file-input"
                    />
                  </label>
                </p>
                <p className="text-xs text-[#6E7B85] mt-1">JPG · PNG · WEBP · max 10MB each</p>
              </>
            )}
          </div>

          {form.images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-3">
              {form.images.map((src, i) => (
                <div key={i} className="relative group aspect-[3/4] bg-[#DDD5C4]" data-testid={`uploaded-image-${i}`}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[#2A2E30]/0 group-hover:bg-[#2A2E30]/60 transition-colors flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="text-[#E8E3D7] hover:text-[#A0684E]"
                      title="Remove"
                    >
                      <X size={20} />
                    </button>
                    <div className="flex gap-1 text-[10px] text-[#E8E3D7]">
                      <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="px-1.5 py-0.5 border border-[#E8E3D7]/50 disabled:opacity-30">←</button>
                      <button type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} className="px-1.5 py-0.5 border border-[#E8E3D7]/50 disabled:opacity-30">→</button>
                    </div>
                  </div>
                  {i === 0 && (
                    <span className="absolute top-1 left-1 text-[9px] bg-[#A0684E] text-[#E8E3D7] px-1.5 py-0.5">MAIN</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Basic */}
        <Card title="Basics">
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Product name" value={form.name} onChange={setField("name")} testid="admin-name" required />
            <div>
              <label className="label-caps">Category</label>
              <select value={form.category} onChange={setField("category")} data-testid="admin-category" className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]">
                {categories.map((c) => <option key={c.id} value={c.key}>{c.name}</option>)}
              </select>
            </div>
            <Field label="Price ₹" type="number" value={form.price} onChange={setField("price")} testid="admin-price" required />
            <Field label="Compare-at (strike-through) ₹" type="number" value={form.compare_at_price} onChange={setField("compare_at_price")} testid="admin-compare-price" />
            <Field label="Stock quantity" type="number" value={form.stock} onChange={setField("stock")} testid="admin-stock" />
            <Field label="Edit tag (e.g. Garba Ready)" value={form.edit_tag} onChange={setField("edit_tag")} testid="admin-edit-tag" />
          </div>
        </Card>

        {/* Copy */}
        <Card title="Details">
          <div className="space-y-5">
            <Field label="Description" value={form.description} onChange={setField("description")} textarea rows={3} testid="admin-description" />
            <Field label="Fabric" value={form.fabric} onChange={setField("fabric")} textarea rows={2} testid="admin-fabric" />
            <Field label="Care instructions" value={form.care} onChange={setField("care")} testid="admin-care" />
            <Field label="Fit notes" value={form.fit_notes} onChange={setField("fit_notes")} testid="admin-fit-notes" />
            <Field label="Colours (comma-separated)" value={form.colors} onChange={setField("colors")} placeholder="Maroon, Ivory" testid="admin-colors" />
            <Field label="Colour hex codes (comma-separated)" value={form.color_hex} onChange={setField("color_hex")} placeholder="#7E1F35, #F3EDE4" testid="admin-color-hex" />
          </div>
        </Card>

        {/* Sizes */}
        <Card title="Sizes">
          <div className="flex flex-wrap gap-2">
            {ALL_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleArr("sizes", s)}
                data-testid={`admin-size-${s}`}
                className={`w-11 h-11 border text-sm rounded-sm ${
                  form.sizes.includes(s)
                    ? "bg-[#2A2E30] text-[#E8E3D7] border-[#2A2E30]"
                    : "border-[#8B9A9F]/40 hover:border-[#2A2E30]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Card>

        {/* Occasions */}
        <Card title="Occasions">
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => toggleArr("occasion", o)}
                className={`px-3 py-1.5 border text-xs rounded-sm ${
                  form.occasion.includes(o)
                    ? "bg-[#7B6E5A] text-[#E8E3D7] border-[#7B6E5A]"
                    : "border-[#8B9A9F]/40 hover:border-[#7B6E5A]"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </Card>

        {/* Flags */}
        <Card title="Flags">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["is_active", "Show on site"],
              ["is_new", "New arrival"],
              ["is_bestseller", "Bestseller"],
              ["is_navratri", "Navratri collection"],
            ].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[k]}
                  onChange={setField(k)}
                  data-testid={`admin-flag-${k}`}
                  className="accent-[#A0684E] w-4 h-4"
                />
                <span className="text-sm">{l}</span>
              </label>
            ))}
          </div>
          {form.is_navratri && (
            <div className="mt-4">
              <Field label="Navratri day (e.g. Day 3 - Red)" value={form.navratri_day} onChange={setField("navratri_day")} testid="admin-navratri-day" />
            </div>
          )}
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-[#8B9A9F]/20">
          <Link
            to="/admin"
            className="px-6 py-3 border border-[#8B9A9F]/40 rounded-sm text-xs uppercase tracking-[0.2em] text-center hover:bg-[#DDD5C4]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || uploading}
            data-testid="admin-save-product"
            className="px-8 py-3 bg-[#A0684E] text-[#E8E3D7] rounded-sm text-xs uppercase tracking-[0.2em] hover:bg-[#8C4A3B] disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Publish product"}
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

export default AdminProductForm;
