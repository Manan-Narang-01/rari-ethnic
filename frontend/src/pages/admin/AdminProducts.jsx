import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatINR } from "@/lib/api";
import { Edit, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/products");
      setProducts(r.data);
    } catch (e) {
      toast.error("Could not load products");
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
      await api.delete(`/admin/products/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error("Could not delete");
    }
  };

  const toggleActive = async (p) => {
    try {
      await api.put(`/admin/products/${p.id}`, { is_active: !p.is_active });
      toast.success(p.is_active ? "Hidden from site" : "Now live");
      load();
    } catch (e) {
      toast.error("Could not update");
    }
  };

  const filtered = products.filter((p) => {
    if (filter === "all") return true;
    if (filter === "hidden") return !p.is_active;
    return p.category === filter;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="label-caps">Catalog</p>
          <h1 className="font-display text-4xl mt-1">Products</h1>
          <p className="text-sm text-[#6E7B85] mt-1">
            {products.length} total · {products.filter((p) => p.is_active).length} live
          </p>
        </div>
        <Link
          to="/admin/products/new"
          data-testid="admin-add-product-btn"
          className="inline-flex items-center gap-2 bg-[#A0684E] text-[#E8E3D7] px-5 py-3 rounded-sm text-xs uppercase tracking-[0.2em] hover:bg-[#8C4A3B] transition-colors"
        >
          <Plus size={14} /> Add new product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { k: "all", l: "All" },
          { k: "kurtis", l: "Kurtis" },
          { k: "suits", l: "Suits" },
          { k: "lehengas", l: "Lehengas" },
          { k: "hidden", l: "Hidden" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setFilter(t.k)}
            data-testid={`admin-filter-${t.k}`}
            className={`px-3 py-1.5 text-xs uppercase tracking-widest border rounded-sm transition-colors ${
              filter === t.k
                ? "bg-[#2A2E30] text-[#E8E3D7] border-[#2A2E30]"
                : "border-[#8B9A9F]/40 text-[#2A2E30] hover:border-[#2A2E30]"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[#6E7B85]">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#6E7B85]">No products in this view.</div>
      ) : (
        <div className="bg-[#DDD5C4]/40 border border-[#8B9A9F]/20 rounded-sm overflow-hidden">
          <div className="grid grid-cols-[80px_1fr_100px_110px_100px_120px] gap-3 px-4 py-3 border-b border-[#8B9A9F]/20 text-[10px] tracking-[0.2em] uppercase text-[#6E7B85] font-medium hidden md:grid">
            <div>Image</div>
            <div>Name</div>
            <div>Category</div>
            <div>Price</div>
            <div>Stock</div>
            <div className="text-right">Actions</div>
          </div>
          {filtered.map((p) => (
            <div
              key={p.id}
              data-testid={`admin-product-row-${p.slug}`}
              className={`grid grid-cols-[80px_1fr_auto] md:grid-cols-[80px_1fr_100px_110px_100px_120px] gap-3 px-4 py-3 border-b border-[#8B9A9F]/15 items-center ${
                !p.is_active ? "opacity-50" : ""
              }`}
            >
              <img
                src={p.images?.[0] || "/brand/logo-transparent.png"}
                alt=""
                className="w-16 h-20 object-cover bg-[#DDD5C4]"
                onError={(e) => { e.currentTarget.src = "/brand/logo-transparent.png"; }}
              />
              <div className="min-w-0">
                <div className="font-body text-sm text-[#2A2E30]">{p.name}</div>
                <div className="text-xs text-[#6E7B85] mt-0.5 flex flex-wrap gap-2 md:hidden">
                  <span>{p.category}</span> · <span>{formatINR(p.price)}</span> · <span>Stock {p.stock}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.is_bestseller && <span className="text-[9px] bg-[#A0684E] text-[#E8E3D7] px-1.5 py-0.5 rounded-sm">BS</span>}
                  {p.is_new && <span className="text-[9px] bg-[#7B6E5A] text-[#E8E3D7] px-1.5 py-0.5 rounded-sm">NEW</span>}
                  {p.is_navratri && <span className="text-[9px] bg-[#B58D3E] text-[#2A2E30] px-1.5 py-0.5 rounded-sm">NAV</span>}
                  {!p.is_active && <span className="text-[9px] bg-[#6E7B85] text-[#E8E3D7] px-1.5 py-0.5 rounded-sm">HIDDEN</span>}
                </div>
              </div>
              <div className="hidden md:block text-sm text-[#6E7B85] capitalize">{p.category}</div>
              <div className="hidden md:block text-sm font-medium">{formatINR(p.price)}</div>
              <div className={`hidden md:block text-sm ${p.stock <= 3 ? "text-[#A0684E]" : "text-[#6E7B85]"}`}>
                {p.stock}
              </div>
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => toggleActive(p)}
                  title={p.is_active ? "Hide from site" : "Show on site"}
                  data-testid={`admin-toggle-${p.slug}`}
                  className="p-2 text-[#6E7B85] hover:text-[#2A2E30] hover:bg-[#DDD5C4] rounded-sm"
                >
                  {p.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <Link
                  to={`/admin/products/${p.id}/edit`}
                  title="Edit"
                  data-testid={`admin-edit-${p.slug}`}
                  className="p-2 text-[#6E7B85] hover:text-[#A0684E] hover:bg-[#DDD5C4] rounded-sm"
                >
                  <Edit size={15} />
                </Link>
                <button
                  onClick={() => remove(p.id, p.name)}
                  title="Delete"
                  data-testid={`admin-delete-${p.slug}`}
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

export default AdminProducts;
