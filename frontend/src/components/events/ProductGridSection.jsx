import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { Sparkles } from "lucide-react";
import { eventTheme } from "./theme";

// Festive-mode product card (dark theme variant) -- lifted from the original
// NavratriLanding.jsx bespoke card so theme="festive" renders identically.
const FestiveProductCard = ({ product, index = 0 }) => {
  const primary = product.images?.[0];
  const secondary = product.images?.[1] || primary;
  return (
    <Link
      to={`/product/${product.slug}`}
      data-testid={`navratri-product-${product.slug}`}
      className="group block fade-up"
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#5A1424] border border-[#F4C842]/20">
        <img
          src={primary}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 group-hover:opacity-0"
        />
        <img
          src={secondary}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
        {product.navratri_day && (
          <div className="absolute top-3 left-3 bg-[#F4C842] text-[#3E0714] label-caps px-2 py-0.5 text-[10px] tracking-widest">
            {product.navratri_day}
          </div>
        )}
        {product.stock <= 3 && product.stock > 0 && (
          <div className="absolute bottom-3 left-3 bg-[#3E0714]/90 backdrop-blur-sm px-2.5 py-1 rounded-sm flex items-center gap-1.5 border border-[#F4C842]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F4C842] pulse-dot" />
            <span className="text-[11px] font-medium text-[#F4C842]">Only {product.stock} left</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        <h4 className="font-display text-lg text-[#F5E9C9] group-hover:text-[#F4C842] transition-colors">{product.name}</h4>
        <p className="text-sm text-[#F4C842] mt-0.5">
          ₹{product.price.toLocaleString("en-IN")}
          {product.compare_at_price && (
            <span className="text-xs text-[#F5E9C9]/50 line-through ml-2">₹{product.compare_at_price.toLocaleString("en-IN")}</span>
          )}
        </p>
      </div>
    </Link>
  );
};

export const ProductGridSection = ({ config, theme }) => {
  const t = eventTheme(theme);
  const [products, setProducts] = useState(null); // null = loading
  const filter = config.filter || {};

  useEffect(() => {
    const params = {};
    if (filter.category) params.category = filter.category;
    if (filter.is_bestseller) params.is_bestseller = true;
    if (filter.is_navratri) params.is_navratri = true;
    if (filter.is_new) params.is_new = true;
    api
      .get("/products", { params })
      .then((r) => {
        const list = filter.edit_tag ? r.data.filter((p) => p.edit_tag === filter.edit_tag) : r.data;
        setProducts(list);
      })
      .catch(() => setProducts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filter)]);

  if (products === null) return null; // avoid an empty-state flash while loading
  if (products.length === 0 && !config.empty_state_message) return null;

  const Card = t.festive ? FestiveProductCard : ProductCard;

  return (
    <section id="navratri-drop" className="container-x py-16 md:py-20">
      {(config.heading || config.subheading) && (
        <div className="text-center mb-12">
          {config.subheading && <span className={`label-caps ${t.accent} tracking-[0.3em]`}>{config.subheading}</span>}
          {config.heading && <h2 className="font-display text-4xl sm:text-5xl mt-3">{config.heading}</h2>}
        </div>
      )}

      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((p, i) => (
            <Card key={p.id} product={p} index={i} />
          ))}
        </div>
      ) : (
        <div className={`max-w-md mx-auto text-center border ${t.accentBorder} rounded-sm p-10`}>
          <Sparkles size={32} className={`mx-auto ${t.accent}`} />
          <p className={`mt-4 ${t.textMuted}`}>{config.empty_state_message}</p>
        </div>
      )}
    </section>
  );
};

export default ProductGridSection;
