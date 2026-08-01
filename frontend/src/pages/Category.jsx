import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { SlidersHorizontal, ChevronDown, X } from "lucide-react";

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

// Fixed vocabulary the raw `product.fabric` copy is matched against, so a long
// description like "Pure Rayon Fabric Adorned with Heritage Prints & Elegant
// Lace Accents" becomes the single filterable option "Rayon" instead of the
// whole sentence (the old naive comma/period split produced full sentences
// whenever the fabric text had no early comma).
const FABRIC_TYPES = ["Cotton", "Rayon", "Silk", "Georgette", "Chiffon", "Crepe", "Chanderi", "Linen", "Velvet", "Net", "Organza", "Satin"];
const deriveFabricType = (fabricText = "") => {
  const match = FABRIC_TYPES.find((t) => fabricText.toLowerCase().includes(t.toLowerCase()));
  return match || "Other";
};

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
    const counts = {};
    items.forEach((i) => {
      const type = deriveFabricType(i.fabric);
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [items]);

  const occasions = useMemo(() => {
    const counts = {};
    items.forEach((i) => (i.occasion || []).forEach((o) => { counts[o] = (counts[o] || 0) + 1; }));
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (priceBucket) {
      const b = PRICE_BUCKETS.find((p) => p.key === priceBucket);
      list = list.filter((i) => i.price >= b.min && i.price <= b.max);
    }
    if (selectedSize) list = list.filter((i) => i.sizes?.includes(selectedSize));
    if (selectedFabric) list = list.filter((i) => deriveFabricType(i.fabric) === selectedFabric);
    if (selectedOccasion) list = list.filter((i) => i.occasion?.includes(selectedOccasion));
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
    <div className="bg-[#E8E3D7]">
      {/* Header */}
      <div className="border-b border-[#2A2E30]/8 bg-[#DDD5C4]/40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-14 fade-up">
          <div className="text-sm text-[#6E7B85]">
            <Link to="/" className="hover:text-[#A0684E]">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-[#2A2E30]">{meta.title}</span>
          </div>
          <h1 data-testid="category-title" className="font-display text-4xl sm:text-5xl lg:text-6xl mt-3">
            {meta.title}
          </h1>
          <p className="text-[#6E7B85] mt-2 max-w-xl">{meta.sub}</p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
        <div className="lg:grid lg:grid-cols-[200px_1fr]">
          {/* Filter (desktop sidebar) */}
          <aside className="hidden lg:block lg:pr-8 lg:border-r lg:border-[#2A2E30]/8 sticky top-24 self-start">
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

          <div className="lg:pl-12">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <button
                data-testid="filter-toggle-mobile"
                onClick={() => setFilterOpen(true)}
                className="lg:hidden inline-flex items-center gap-2 text-sm border border-[#2A2E30]/15 px-4 py-2 rounded-sm"
              >
                <SlidersHorizontal size={14} /> Filters {activeCount > 0 && `(${activeCount})`}
              </button>
              <div className="hidden lg:block text-sm text-[#6E7B85]">
                {filtered.length} piece{filtered.length !== 1 ? "s" : ""}
              </div>
              <select
                data-testid="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm bg-transparent border border-[#2A2E30]/15 rounded-sm px-3 py-2 focus:outline-none focus:border-[#A0684E]"
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
                  <div key={i} className="aspect-[3/4] bg-[#DDD5C4] animate-pulse rounded-sm" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-display text-2xl">No pieces match these filters</p>
                <button
                  onClick={clearAll}
                  className="mt-4 text-sm underline underline-offset-4 text-[#A0684E]"
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
      </div>

      {/* Mobile filter drawer */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#2A2E30]/50" onClick={() => setFilterOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-[#E8E3D7] p-6 overflow-y-auto">
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
              className="mt-6 w-full bg-[#A0684E] text-[#E8E3D7] py-3 rounded-sm uppercase tracking-widest text-sm"
            >
              Show {filtered.length} pieces
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};

const pillCls = (active) =>
  `px-3.5 py-2 border text-xs rounded-sm transition-colors ${
    active
      ? "bg-[#2A2E30] text-[#E8E3D7] border-[#2A2E30]"
      : "border-[#2A2E30]/15 text-[#2A2E30] hover:border-[#A0684E]"
  }`;

const sizePillCls = (active) =>
  `w-10 h-10 flex items-center justify-center border text-xs rounded-sm transition-colors ${
    active
      ? "bg-[#2A2E30] text-[#E8E3D7] border-[#2A2E30]"
      : "border-[#2A2E30]/15 hover:border-[#A0684E]"
  }`;

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
}) => {
  const [openFabric, setOpenFabric] = useState(false);
  const [openOccasion, setOpenOccasion] = useState(false);

  const chips = [
    priceBucket && { key: "price", label: PRICE_BUCKETS.find((b) => b.key === priceBucket)?.label, clear: () => setPriceBucket(null) },
    selectedSize && { key: "size", label: `Size ${selectedSize}`, clear: () => setSelectedSize(null) },
    selectedFabric && { key: "fabric", label: selectedFabric, clear: () => setSelectedFabric(null) },
    selectedOccasion && { key: "occasion", label: selectedOccasion, clear: () => setSelectedOccasion(null) },
  ].filter(Boolean);

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-6">
        <span className="label-caps text-[#A0684E]">Refine</span>
        {activeCount > 0 && (
          <button onClick={clearAll} className="text-xs underline underline-offset-2 text-[#6E7B85] hover:text-[#2A2E30]" data-testid="clear-filters">
            Clear all
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-7">
          {chips.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1.5 bg-[#2A2E30] text-[#E8E3D7] text-[11px] pl-3 pr-2 py-1.5 rounded-full">
              {c.label}
              <button onClick={c.clear} className="opacity-70 hover:opacity-100 leading-none" aria-label={`Remove ${c.label}`}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="space-y-7">
        <Section title="Price">
          <div className="flex flex-wrap gap-2">
            {PRICE_BUCKETS.map((b) => (
              <button
                key={b.key}
                type="button"
                data-testid={`price-${b.key}`}
                onClick={() => setPriceBucket(priceBucket === b.key ? null : b.key)}
                className={pillCls(priceBucket === b.key)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Size">
          <div className="flex flex-wrap gap-2">
            {ALL_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                data-testid={`size-${s}`}
                onClick={() => setSelectedSize(selectedSize === s ? null : s)}
                className={sizePillCls(selectedSize === s)}
              >
                {s}
              </button>
            ))}
          </div>
        </Section>

        {fabrics.length > 0 && (
          <Accordion
            title="Fabric"
            activeLabel={selectedFabric}
            open={openFabric || !!selectedFabric}
            onToggle={() => setOpenFabric((v) => !v)}
          >
            <div className="flex flex-wrap gap-2">
              {fabrics.map(({ type, count }) => (
                <button
                  key={type}
                  type="button"
                  data-testid={`fabric-${type}`}
                  onClick={() => setSelectedFabric(selectedFabric === type ? null : type)}
                  className={pillCls(selectedFabric === type)}
                >
                  {type} <span className="opacity-60">({count})</span>
                </button>
              ))}
            </div>
          </Accordion>
        )}

        {occasions.length > 0 && (
          <Accordion
            title="Occasion"
            activeLabel={selectedOccasion}
            open={openOccasion || !!selectedOccasion}
            onToggle={() => setOpenOccasion((v) => !v)}
          >
            <div className="flex flex-wrap gap-2">
              {occasions.map(({ name, count }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedOccasion(selectedOccasion === name ? null : name)}
                  className={pillCls(selectedOccasion === name)}
                >
                  {name} <span className="opacity-60">({count})</span>
                </button>
              ))}
            </div>
          </Accordion>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div>
    <div className="font-display text-lg mb-3.5 text-[#2A2E30]">{title}</div>
    {children}
  </div>
);

const Accordion = ({ title, activeLabel, open, onToggle, children }) => (
  <div className="border-t border-[#2A2E30]/8 pt-7">
    <button type="button" onClick={onToggle} className="w-full flex items-center justify-between text-left">
      <span className="flex items-baseline gap-2">
        <span className="font-display text-lg text-[#2A2E30]">{title}</span>
        {activeLabel && <span className="text-xs text-[#A0684E]">· {activeLabel}</span>}
      </span>
      <ChevronDown size={14} className={`text-[#6E7B85] transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="mt-4">{children}</div>}
  </div>
);

export default Category;
