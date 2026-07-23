import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Edit, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/categories");
      setCategories(r.data);
    } catch (e) {
      toast.error("Could not load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      const msg = typeof e?.response?.data?.detail === "string" ? e.response.data.detail : "Could not delete";
      toast.error(msg);
    }
  };

  const toggleActive = async (c) => {
    try {
      await api.put(`/admin/categories/${c.id}`, { is_active: !c.is_active });
      toast.success(c.is_active ? "Hidden from site" : "Now live");
      load();
    } catch (e) {
      toast.error("Could not update");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="label-caps">Catalog</p>
          <h1 className="font-display text-4xl mt-1">Categories</h1>
          <p className="text-sm text-[#6E7B85] mt-1">
            {categories.length} total · {categories.filter((c) => c.is_active).length} live
          </p>
        </div>
        <Link
          to="/admin/categories/new"
          data-testid="admin-add-category-btn"
          className="inline-flex items-center gap-2 bg-[#A0684E] text-[#E8E3D7] px-5 py-3 rounded-sm text-xs uppercase tracking-[0.2em] hover:bg-[#8C4A3B] transition-colors"
        >
          <Plus size={14} /> Add category
        </Link>
      </div>

      {loading ? (
        <div className="text-[#6E7B85]">Loading…</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-[#6E7B85]">No categories yet.</div>
      ) : (
        <div className="bg-[#DDD5C4]/40 border border-[#8B9A9F]/20 rounded-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_90px_120px] gap-3 px-4 py-3 border-b border-[#8B9A9F]/20 text-[10px] tracking-[0.2em] uppercase text-[#6E7B85] font-medium hidden md:grid">
            <div>Name</div>
            <div>Key</div>
            <div>Order</div>
            <div className="text-right">Actions</div>
          </div>
          {categories.map((c) => (
            <div
              key={c.id}
              data-testid={`admin-category-row-${c.key}`}
              className={`grid grid-cols-[1fr_auto] md:grid-cols-[1fr_120px_90px_120px] gap-3 px-4 py-3 border-b border-[#8B9A9F]/15 items-center ${
                !c.is_active ? "opacity-50" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="font-body text-sm text-[#2A2E30]">{c.name}</div>
                <div className="text-xs text-[#6E7B85] mt-0.5 md:hidden">
                  {c.key} · Order {c.sort_order} {!c.is_active && "· HIDDEN"}
                </div>
              </div>
              <div className="hidden md:block text-sm text-[#6E7B85]">{c.key}</div>
              <div className="hidden md:block text-sm text-[#6E7B85]">{c.sort_order}</div>
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => toggleActive(c)}
                  title={c.is_active ? "Hide from site" : "Show on site"}
                  data-testid={`admin-toggle-category-${c.key}`}
                  className="p-2 text-[#6E7B85] hover:text-[#2A2E30] hover:bg-[#DDD5C4] rounded-sm"
                >
                  {c.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <Link
                  to={`/admin/categories/${c.id}/edit`}
                  title="Edit"
                  data-testid={`admin-edit-category-${c.key}`}
                  className="p-2 text-[#6E7B85] hover:text-[#A0684E] hover:bg-[#DDD5C4] rounded-sm"
                >
                  <Edit size={15} />
                </Link>
                <button
                  onClick={() => remove(c.id, c.name)}
                  title="Delete"
                  data-testid={`admin-delete-category-${c.key}`}
                  className="p-2 text-[#6E7B85] hover:text-[#A0684E] hover:bg-[#DDD5C4] rounded-sm"
                >
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

export default AdminCategories;
