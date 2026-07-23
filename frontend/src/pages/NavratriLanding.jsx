import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useSite } from "@/context/SiteContext";
import { ProductCard } from "@/components/ProductCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { images } from "@/assets/images";
import { ArrowRight, Flame, Sparkles } from "lucide-react";

const FALLBACK_DAYS = [
  { day: 1, name: "Orange", hex: "#E27D2C", meaning: "Energy & vitality" },
  { day: 2, name: "White", hex: "#F3EDE4", meaning: "Peace & purity" },
  { day: 3, name: "Red", hex: "#7E1F35", meaning: "Passion & power" },
  { day: 4, name: "Royal Blue", hex: "#1E3A5F", meaning: "Wisdom & calm" },
  { day: 5, name: "Yellow", hex: "#DCA537", meaning: "Joy & brightness" },
  { day: 6, name: "Green", hex: "#185D64", meaning: "Growth & fertility" },
  { day: 7, name: "Grey", hex: "#8A8078", meaning: "Balance & strength" },
  { day: 8, name: "Purple", hex: "#98285D", meaning: "Ambition & pride" },
  { day: 9, name: "Peacock Green", hex: "#0F6E5E", meaning: "Uniqueness" },
];

const FALLBACK_HERO = images.navratri.hero;
const FALLBACK_SECONDARY = images.navratri.heroSecondary;

export const NavratriLanding = () => {
  const { campaign } = useSite();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get("/products", { params: { is_navratri: true } }).then((r) => setProducts(r.data));
    // Apply festive body class for global theming
    document.body.classList.add("festive-mode");
    return () => document.body.classList.remove("festive-mode");
  }, []);

  const NAVRATRI_DAYS = campaign?.day_colors?.length ? campaign.day_colors : FALLBACK_DAYS;
  const MATA_HERO = campaign?.hero_image || FALLBACK_HERO;
  const MATA_SECONDARY = campaign?.hero_secondary_image || FALLBACK_SECONDARY;
  const heroEyebrow = campaign?.hero_eyebrow || "Navratri Edit · 2026";
  const heroTitle = campaign?.hero_title || "Jai Mata Di. Nine nights. One goddess in you.";
  const heroTitleLines = heroTitle.split(/(?<=\.)\s+/).filter(Boolean);
  const heroSubtitle = campaign?.hero_subtitle ||
    "Lehengas, kurtis and suits handpicked for Garba nights, aarti mornings and every colour Maa asks you to wear. Handcrafted in Surat.";
  const ctaLabel = campaign?.cta_label || "Shop the drop";
  const orderByNote = campaign?.order_by_note || "";
  const shloka = campaign?.shloka || "या देवी सर्वभूतेषु शक्तिरूपेण संस्थिता";
  const shlokaTranslation = campaign?.shloka_translation || "To the goddess who dwells in every being as strength";

  const garbaReady = products.filter((p) => p.edit_tag === "Garba Ready");
  const familyFunction = products.filter((p) => p.edit_tag === "Family Function");

  return (
    <div className="bg-[#3E0714] text-[#F5E9C9] relative overflow-hidden">
      {/* HERO - Mata Rani with festive theme */}
      <section className="relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0">
          <img
            src={MATA_HERO}
            alt="Maa Durga"
            className="w-full h-full object-cover object-center opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#3E0714]/85 via-[#5A1424]/75 to-[#3E0714]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#3E0714] via-transparent to-[#3E0714]/70" />
        </div>

        {/* Radial gold glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 60% 40%, rgba(244,200,66,0.22) 0%, transparent 55%)",
          }}
        />

        {/* Mandala pattern overlay */}
        <div className="absolute inset-0 mandala-overlay" style={{ opacity: 0.12 }} />

        <div className="relative container-x py-24 md:py-32 lg:py-40 grid md:grid-cols-2 gap-10 items-center">
          {/* Left: text */}
          <div className="fade-up text-center md:text-left">
            <div className="inline-flex items-center gap-2 border border-[#F4C842]/50 bg-[#3E0714]/60 backdrop-blur-sm px-4 py-1.5 rounded-full">
              <Flame size={14} className="text-[#F4C842]" />
              <span className="label-caps text-[#F4C842] tracking-[0.28em]">
                {heroEyebrow}
              </span>
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] mt-6 font-normal">
              {heroTitleLines.map((line, i) => (
                <span key={i}>
                  {i === heroTitleLines.length - 1 ? (
                    <em className="not-italic text-[#F4C842]">{line}</em>
                  ) : (
                    <span className={i === 0 ? "text-[#F4C842]" : "text-[#F5E9C9]/95"}>{line}</span>
                  )}
                  {i < heroTitleLines.length - 1 && <br />}
                </span>
              ))}
            </h1>

            <p className="mt-7 text-base sm:text-lg text-[#F5E9C9]/85 max-w-lg leading-relaxed font-body font-light md:mx-0 mx-auto">
              {heroSubtitle}
            </p>

            {campaign?.countdown_target && (
              <div className="mt-10 flex justify-center md:justify-start">
                <CountdownTimer
                  variant="dark"
                  target={campaign.countdown_target}
                  label={campaign.countdown_label || "Navratri arrives in"}
                />
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <a
                href="#navratri-drop"
                data-testid="navratri-shop-cta"
                className="inline-flex items-center gap-2 bg-[#F4C842] text-[#3E0714] px-7 py-4 rounded-sm font-medium text-xs uppercase tracking-[0.24em] hover:bg-[#F5E9C9] transition-colors"
              >
                {ctaLabel} <ArrowRight size={14} />
              </a>
              {orderByNote && (
                <div className="inline-flex items-center gap-2 text-xs bg-[#7E1F35] border border-[#F4C842]/40 px-4 py-3 rounded-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F4C842] pulse-dot" />
                  {orderByNote}
                </div>
              )}
            </div>
          </div>

          {/* Right: Mata Rani portrait */}
          <div className="relative hidden md:block fade-up" style={{ animationDelay: "200ms" }}>
            <div className="relative aspect-[3/4] max-w-md mx-auto">
              {/* Gold frame effect */}
              <div className="absolute -inset-2 border border-[#F4C842]/40 rounded-sm" />
              <div className="absolute -inset-4 border border-[#F4C842]/20 rounded-sm" />
              <img
                src={MATA_SECONDARY}
                alt="Maa Durga"
                className="w-full h-full object-cover relative"
              />
              {/* Diya-style glow */}
              <div
                className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(244,200,66,0.7) 0%, rgba(244,200,66,0) 70%)",
                }}
              />
              <div
                className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(244,200,66,0.7) 0%, rgba(244,200,66,0) 70%)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom divider — decorative gold border */}
        <div className="relative h-px bg-gradient-to-r from-transparent via-[#F4C842]/60 to-transparent" />
      </section>

      {/* SHLOKA / MANTRA STRIP */}
      <section className="relative py-8 border-b border-[#F4C842]/15">
        <div className="container-x text-center">
          <div className="font-display italic text-[#F4C842]/90 text-lg sm:text-xl">
            "{shloka}"
          </div>
          <div className="text-xs text-[#F5E9C9]/60 mt-2 tracking-widest uppercase">
            {shlokaTranslation}
          </div>
        </div>
      </section>

      {/* NAVRATRI DROP */}
      <section id="navratri-drop" className="container-x py-20">
        <div className="text-center mb-12">
          <span className="label-caps text-[#F4C842] tracking-[0.3em]">The full drop</span>
          <h2 className="font-display text-4xl sm:text-5xl mt-3">Navratri Collection</h2>
          {products.length === 0 && (
            <p className="text-[#F5E9C9]/70 mt-4 max-w-md mx-auto">
              New Navratri pieces coming soon. Follow us on WhatsApp to know first.
            </p>
          )}
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p, i) => (
              <NavratriProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto text-center border border-[#F4C842]/25 rounded-sm p-10">
            <Sparkles size={32} className="mx-auto text-[#F4C842]" />
            <p className="mt-4 font-display text-2xl">Drop coming soon</p>
            <p className="text-sm text-[#F5E9C9]/70 mt-2">
              We're finishing the pieces. WhatsApp us to be first in line.
            </p>
          </div>
        )}
      </section>

      {/* GARBA READY EDIT */}
      {garbaReady.length > 0 && (
        <section className="container-x py-16 border-t border-[#F4C842]/15">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="label-caps text-[#F4C842] tracking-[0.3em]">Curated edit</span>
              <h2 className="font-display text-4xl sm:text-5xl mt-3">Garba Ready</h2>
              <p className="text-[#F5E9C9]/70 mt-2 max-w-lg">
                Full-flare lehengas cut for twirls. Light fabric that breathes.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {garbaReady.map((p, i) => (
              <NavratriProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* DAY COLOR GUIDE */}
      <section className="relative py-20 border-t border-[#F4C842]/15">
        <div className="mandala-overlay" style={{ opacity: 0.06 }} />
        <div className="container-x relative">
          <div className="text-center mb-14">
            <span className="label-caps text-[#F4C842] tracking-[0.3em]">The nine-day guide</span>
            <h2 className="font-display text-4xl sm:text-5xl mt-3">Day 1–9 Colours</h2>
            <p className="text-[#F5E9C9]/70 mt-3 max-w-lg mx-auto">
              Every day carries its colour. Wear yours with intention.
            </p>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
            {NAVRATRI_DAYS.map((d, i) => (
              <div
                key={d.day}
                data-testid={`nav-day-${d.day}`}
                className="text-center group cursor-default fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  className="aspect-square rounded-full mx-auto transition-transform duration-500 group-hover:scale-105 shadow-[0_10px_30px_-8px_rgba(244,200,66,0.4)] border-2 border-[#F4C842]/30"
                  style={{ backgroundColor: d.hex }}
                />
                <div className="font-display text-lg mt-3 text-[#F4C842]">Day {d.day}</div>
                <div className="text-[11px] text-[#F5E9C9]/80 mt-0.5">{d.name}</div>
                <div className="text-[10px] text-[#F5E9C9]/50 italic hidden md:block mt-1">
                  {d.meaning}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAMILY FUNCTION EDIT */}
      {familyFunction.length > 0 && (
        <section className="container-x py-16 border-t border-[#F4C842]/15">
          <div className="mb-8">
            <span className="label-caps text-[#F4C842] tracking-[0.3em]">Curated edit</span>
            <h2 className="font-display text-4xl sm:text-5xl mt-3">Family Function</h2>
            <p className="text-[#F5E9C9]/70 mt-2 max-w-lg">
              Anarkalis and lehengas that carry you from morning aarti to late dinner.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {familyFunction.map((p, i) => (
              <NavratriProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* URGENCY STRIP */}
      <section className="relative overflow-hidden mt-8">
        <div className="absolute inset-0 bg-[#F4C842]" />
        <div className="mandala-overlay" style={{ opacity: 0.12 }} />
        <div className="relative container-x py-14 text-[#3E0714] text-center">
          <span className="label-caps tracking-[0.3em] text-[#7E1F35]">
            Limited stock · Made-to-measure closing soon
          </span>
          <h2 className="font-display text-3xl sm:text-4xl mt-3 max-w-2xl mx-auto">
            Pre-order now for guaranteed pre-Navratri delivery.
          </h2>
          <Link
            to="/shop/lehengas"
            className="mt-6 inline-flex items-center gap-2 bg-[#3E0714] text-[#F4C842] px-8 py-4 rounded-sm text-xs uppercase tracking-[0.24em] hover:bg-[#7E1F35] transition-colors"
          >
            Reserve your piece <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
};

// Festive-mode product card (dark theme variant)
const NavratriProductCard = ({ product, index = 0 }) => {
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
            <span className="text-[11px] font-medium text-[#F4C842]">
              Only {product.stock} left
            </span>
          </div>
        )}
      </div>
      <div className="mt-3">
        <h4 className="font-display text-lg text-[#F5E9C9] group-hover:text-[#F4C842] transition-colors">
          {product.name}
        </h4>
        <p className="text-sm text-[#F4C842] mt-0.5">
          ₹{product.price.toLocaleString("en-IN")}
          {product.compare_at_price && (
            <span className="text-xs text-[#F5E9C9]/50 line-through ml-2">
              ₹{product.compare_at_price.toLocaleString("en-IN")}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
};

export default NavratriLanding;
