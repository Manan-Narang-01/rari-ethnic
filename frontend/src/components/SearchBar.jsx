import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Loader2 } from "lucide-react";
import { api, formatINR } from "@/lib/api";

const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 8;

// Header search: a live dropdown of matching products as you type, no
// dedicated search-results page -- click a result (or the first one via
// Enter) to go straight to its product page.
export const SearchBar = ({ mobile = false, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const onEscape = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      api
        .get("/products", { params: { q: query.trim(), limit: RESULT_LIMIT } })
        .then((r) => setResults(r.data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const goTo = (slug) => {
    setOpen(false);
    setQuery("");
    onNavigate?.();
    nav(`/product/${slug}`);
  };

  const openSearch = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && results[0]) goTo(results[0].slug);
  };

  return (
    <div ref={containerRef} className={mobile ? "w-full" : "relative"}>
      {!mobile && !open && (
        <button
          type="button"
          onClick={openSearch}
          aria-label="Search products"
          data-testid="header-search-toggle"
          className="p-2 text-[#2A2E30] hover:text-[#A0684E] transition-colors"
        >
          <Search size={18} strokeWidth={1.6} />
        </button>
      )}

      {(mobile || open) && (
        <div className={mobile ? "w-full" : "absolute right-0 top-1/2 -translate-y-1/2 z-50"}>
          <div className={`flex items-center gap-2 bg-[#E8E3D7] border border-[#8B9A9F]/40 rounded-sm px-3 py-2 ${mobile ? "w-full" : "w-64 sm:w-80"}`}>
            <Search size={16} className="text-[#6E7B85] shrink-0" />
            <input
              ref={inputRef}
              autoFocus={!mobile}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search products…"
              data-testid="header-search-input"
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-[#6E7B85]"
            />
            {loading && <Loader2 size={14} className="animate-spin text-[#A0684E] shrink-0" />}
            {!mobile && (
              <button type="button" onClick={() => setOpen(false)} aria-label="Close search" className="text-[#6E7B85] hover:text-[#2A2E30] shrink-0">
                <X size={16} />
              </button>
            )}
          </div>

          {query.trim() && (
            <div
              data-testid="header-search-results"
              className="mt-1 bg-[#E8E3D7] border border-[#8B9A9F]/30 rounded-sm shadow-lg max-h-96 overflow-y-auto"
            >
              {results.length === 0 && !loading ? (
                <p className="px-4 py-4 text-sm text-[#6E7B85]">No products found for "{query.trim()}"</p>
              ) : (
                results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => goTo(p.slug)}
                    data-testid={`search-result-${p.slug}`}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#DDD5C4] transition-colors"
                  >
                    <img src={p.images?.[0]} alt="" className="w-10 h-12 object-cover bg-[#DDD5C4] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[#2A2E30] truncate">{p.name}</div>
                      <div className="text-xs text-[#A0684E]">{formatINR(p.price)}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
