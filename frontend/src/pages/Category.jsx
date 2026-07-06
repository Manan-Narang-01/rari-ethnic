import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { SlidersHorizontal, X } from "lucide-react";

const CATEGORY_META = {
  kurtis: { title: "Kurtis", sub: "Everyday to festive · ₹1,299 to ₹2,499" },
  suits: { title: "Suits", sub: "Palazzo, sharara, straight cuts · ₹2,199 to ₹3,899" },
  lehengas: { title: "Lehengas", sub: "For the big days · ₹2,899 to ₹4,499" },
};

const PRICE_BUCKETS = [
  { key: "1000-2500", label: "₹1,000 – ₹2,500", min: 1000, max: 2500 },
  { key: "2500-4000", label: "₹2,500 – ₹4,000", min: 2500, max: 4000 },
  { key: "4000-5000", label: "₹4,000 – ₹5,000", min: 4000, max: 5000 },
];

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export const Category = () => {
  const { category } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceBucket, setPriceBucket] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedFabric, setSelectedFabric] = useState(null);
  const [selectedOccasion, setSelectedOccasion] = useState(null);
  const [sortBy, setSortBy] = useState("featured");
  const [filterOpen, setFilterOpen] = useState(false);

  const meta = CATEGORY_META[category] || { title: category, sub: "" };

  useEffect(() => {
    setLoading(true);
    api
      .get("/products", { params: { category } })
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false));
  }, [category]);

  const fabrics = useMemo(() => {
    const s = new Set();
    items.forEach((i) => {
      const f = i.fabric.split(".")[0].split(",")[0].trim();
      s.add(f);
    });
    return Array.from(s);
  }, [items]);

  const occasions = useMemo(() => {
    const s = new Set();
    items.forEach((i) => (i.occasion || []).forEach((o) => s.add(o)));
    return Array.from(s);
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (priceBucket) {
      const b = PRICE_BUCKETS.find((p) => p.key === priceBucket);
      list = list.filter((i) => i.price >= b.min && i.price <= b.max);
    }
    if (selectedSize) list = list.filter((i) => i.sizes?.includes(selectedSize));
    if (selectedFabric)
      list = list.filter((i) => i.fabric.toLowerCase().includes(selectedFabric.toLowerCase()));
    if (selectedOccasion)
      list = list.filter((i) => i.occasion?.includes(selectedOccasion));
    if (sortBy === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sortBy === "new") list.sort((a, b) => Number(b.is_new) - Number(a.is_new));
    return list;
  }, [items, priceBucket, selectedSize, selectedFabric, selectedOccasion, sortBy]);

  const clearAll = () => {
    setPriceBucket(null);
    setSelectedSize(null);
    setSelectedFabric(null);
    setSelectedOccasion(null);
  };

  const activeCount = [priceBucket, selectedSize, selectedFabric, selectedOccasion].filter(Boolean).length;

  return (
    <div className="bg-[#FAF6F0]">
      {/* Header */}
      <div className="border-b border-[#2B211E]/8 bg-[#F3EDE4]/40">
        <div className="container-x py-10 md:py-14 fade-up">
          <div className="text-sm text-[#6B5B55]">
            <Link to="/" className="hover:text-[#7E1F35]">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-[#2B211E]">{meta.title}</span>
          </div>
          <h1 data-testid="category-title" className="font-display text-4xl sm:text-5xl lg:text-6xl mt-3">
            {meta.title}
          </h1>
          <p className="text-[#6B5B55] mt-2 max-w-xl">{meta.sub}</p>
        </div>
      </div>

      <div className="container-x py-8 grid lg:grid-cols-[240px_1fr] gap-8">
        {/* Filter (desktop sidebar) */}
        <aside className="hidden lg:block sticky top-24 self-start">
          <FiltersContent
            priceBucket={priceBucket}
            setPriceBucket={setPriceBucket}
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
            selectedFabric={selectedFabric}
            setSelectedFabric={setSelectedFabric}
            selectedOccasion={selectedOccasion}
            setSelectedOccasion={setSelectedOccasion}
            fabrics={fabrics}
            occasions={occasions}
            clearAll={clearAll}
            activeCount={activeCount}
          />
        </aside>

        <div>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <button
              data-testid="filter-toggle-mobile"
              onClick={() => setFilterOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 text-sm border border-[#2B211E]/15 px-4 py-2 rounded-sm"
            >
              <SlidersHorizontal size={14} /> Filters {activeCount > 0 && `(${activeCount})`}
            </button>
            <div className="hidden lg:block text-sm text-[#6B5B55]">
              {filtered.length} piece{filtered.length !== 1 ? "s" : ""}
            </div>
            <select
              data-testid="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm bg-transparent border border-[#2B211E]/15 rounded-sm px-3 py-2 focus:outline-none focus:border-[#7E1F35]"
            >
              <option value="featured">Featured</option>
              <option value="new">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-[#F3EDE4] animate-pulse rounded-sm" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display text-2xl">No pieces match these filters</p>
              <button
                onClick={clearAll}
                className="mt-4 text-sm underline underline-offset-4 text-[#7E1F35]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" data-testid="products-grid">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#2B211E]/50" onClick={() => setFilterOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-[#FAF6F0] p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-2xl">Filters</h3>
              <button onClick={() => setFilterOpen(false)}><X size={20} /></button>
            </div>
            <FiltersContent
              priceBucket={priceBucket}
              setPriceBucket={setPriceBucket}
              selectedSize={selectedSize}
              setSelectedSize={setSelectedSize}
              selectedFabric={selectedFabric}
              setSelectedFabric={setSelectedFabric}
              selectedOccasion={selectedOccasion}
              setSelectedOccasion={setSelectedOccasion}
              fabrics={fabrics}
              occasions={occasions}
              clearAll={clearAll}
              activeCount={activeCount}
            />
            <button
              onClick={() => setFilterOpen(false)}
              className="mt-6 w-full bg-[#7E1F35] text-[#FAF6F0] py-3 rounded-sm uppercase tracking-widest text-sm"
            >
              Show {filtered.length} pieces
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};

const FiltersContent = ({
  priceBucket,
  setPriceBucket,
  selectedSize,
  setSelectedSize,
  selectedFabric,
  setSelectedFabric,
  selectedOccasion,
  setSelectedOccasion,
  fabrics,
  occasions,
  clearAll,
  activeCount,
}) => (
  <div className="space-y-7 text-sm">
    <div className="flex items-center justify-between">
      <span className="label-caps text-[#7E1F35]">Refine</span>
      {activeCount > 0 && (
        <button onClick={clearAll} className="text-xs underline text-[#6B5B55]" data-testid="clear-filters">
          Clear all
        </button>
      )}
    </div>

    <Section title="Price">
      <div className="space-y-2">
        {PRICE_BUCKETS.map((b) => (
          <label key={b.key} className="flex items-center gap-2 cursor-pointer" data-testid={`price-${b.key}`}>
            <input
              type="radio"
              name="price"
              checked={priceBucket === b.key}
              onChange={() => setPriceBucket(priceBucket === b.key ? null : b.key)}
              className="accent-[#7E1F35]"
            />
            <span>{b.label}</span>
          </label>
        ))}
      </div>
    </Section>

    <Section title="Size">
      <div className="flex flex-wrap gap-2">
        {ALL_SIZES.map((s) => (
          <button
            key={s}
            data-testid={`size-${s}`}
            onClick={() => setSelectedSize(selectedSize === s ? null : s)}
            className={`w-9 h-9 border text-xs rounded-sm ${
              selectedSize === s
                ? "bg-[#7E1F35] text-[#FAF6F0] border-[#7E1F35]"
                : "border-[#2B211E]/20 hover:border-[#7E1F35]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </Section>

    {fabrics.length > 0 && (
      <Section title="Fabric">
        <div className="space-y-2">
          {fabrics.slice(0, 6).map((f) => (
            <label key={f} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fabric"
                checked={selectedFabric === f}
                onChange={() => setSelectedFabric(selectedFabric === f ? null : f)}
                className="accent-[#7E1F35]"
              />
              <span>{f}</span>
            </label>
          ))}
        </div>
      </Section>
    )}

    {occasions.length > 0 && (
      <Section title="Occasion">
        <div className="flex flex-wrap gap-2">
          {occasions.map((o) => (
            <button
              key={o}
              onClick={() => setSelectedOccasion(selectedOccasion === o ? null : o)}
              className={`px-3 py-1.5 border text-xs rounded-sm ${
                selectedOccasion === o
                  ? "bg-[#185D64] text-[#FAF6F0] border-[#185D64]"
                  : "border-[#2B211E]/20 hover:border-[#185D64]"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </Section>
    )}
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <div className="font-display text-lg mb-3 text-[#2B211E]">{title}</div>
    {children}
  </div>
);

export default Category;
