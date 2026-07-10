import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ArrowRight, Flame } from "lucide-react";

const NAVRATRI_DAYS = [
  { day: 1, name: "Orange", hex: "#E27D2C", meaning: "Energy & vitality" },
  { day: 2, name: "White", hex: "#DDD5C4", meaning: "Peace & purity" },
  { day: 3, name: "Red", hex: "#A0684E", meaning: "Passion & power" },
  { day: 4, name: "Royal Blue", hex: "#1E3A5F", meaning: "Wisdom & calm" },
  { day: 5, name: "Yellow", hex: "#B58D3E", meaning: "Joy & brightness" },
  { day: 6, name: "Green", hex: "#7B6E5A", meaning: "Growth & fertility" },
  { day: 7, name: "Grey", hex: "#8A8078", meaning: "Balance & strength" },
  { day: 8, name: "Purple", hex: "#A05B6A", meaning: "Ambition & pride" },
  { day: 9, name: "Peacock Green", hex: "#0F6E5E", meaning: "Uniqueness" },
];

export const NavratriLanding = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get("/products", { params: { is_navratri: true } }).then((r) => setProducts(r.data));
  }, []);

  const garbaReady = products.filter((p) => p.edit_tag === "Garba Ready");
  const familyFunction = products.filter((p) => p.edit_tag === "Family Function");

  return (
    <div className="bg-[#2A2E30] text-[#E8E3D7]">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1610030006432-9daf1a8b4dcd?w=2000"
            alt="Navratri"
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1503160865267-af4660ce7bf2?w=2000"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#A0684E]/60 via-[#2A2E30]/70 to-[#2A2E30]" />
        </div>
        <div className="mandala-overlay" style={{ opacity: 0.1 }} />

        <div className="relative container-x py-24 md:py-32 text-center fade-up">
          <div className="inline-flex items-center gap-2 border border-[#B58D3E]/40 px-4 py-1.5 rounded-full">
            <Flame size={14} className="text-[#B58D3E]" />
            <span className="label-caps text-[#B58D3E]">Navratri Edit · 2026</span>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl mt-6 leading-[1.02]">
            Nine nights.
            <br />
            <span className="text-[#B58D3E]">Nine you.</span>
          </h1>
          <p className="max-w-xl mx-auto mt-6 text-[#E8E3D7]/85 leading-relaxed">
            From twirl-ready lehengas to family function suits — hand-picked for
            Garba nights, aarti mornings and everything the nine days ask of you.
          </p>
          <div className="mt-10 flex justify-center">
            <CountdownTimer variant="dark" label="Navratri arrives in" />
          </div>
          <div className="mt-8 inline-flex items-center gap-2 text-xs bg-[#A0684E] px-4 py-2 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B58D3E] pulse-dot" />
            Order by <strong className="mx-1">Sep 20</strong> for guaranteed festive delivery
          </div>
        </div>
      </section>

      {/* GARBA READY */}
      {garbaReady.length > 0 && (
        <section className="container-x py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="label-caps text-[#B58D3E]">Curated edit</span>
              <h2 className="font-display text-4xl sm:text-5xl mt-2">Garba Ready</h2>
              <p className="text-[#E8E3D7]/70 mt-2 max-w-lg">
                Full-flare lehengas cut for twirls. Light fabric that breathes through the night.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {garbaReady.map((p, i) => (
              <Link
                key={p.id}
                to={`/product/${p.slug}`}
                data-testid={`garba-${p.slug}`}
                className="group block fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#3E4245]">
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {p.navratri_day && (
                    <div className="absolute top-3 left-3 bg-[#B58D3E] text-[#2A2E30] label-caps px-2 py-0.5 text-[10px]">
                      {p.navratri_day}
                    </div>
                  )}
                </div>
                <h4 className="font-display text-lg mt-3">{p.name}</h4>
                <p className="text-sm text-[#B58D3E]">₹{p.price.toLocaleString("en-IN")}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* DAY COLOR GUIDE */}
      <section className="bg-[#E8E3D7] text-[#2A2E30] py-16 md:py-20">
        <div className="container-x">
          <div className="text-center mb-12">
            <span className="label-caps text-[#A0684E]">The nine-day guide</span>
            <h2 className="font-display text-4xl sm:text-5xl mt-2">Day 1–9 Colours</h2>
            <p className="text-[#6E7B85] mt-2 max-w-lg mx-auto">
              Every day carries its colour. Wear yours with intention.
            </p>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 sm:gap-3">
            {NAVRATRI_DAYS.map((d) => (
              <div
                key={d.day}
                data-testid={`nav-day-${d.day}`}
                className="text-center group cursor-default"
              >
                <div
                  className="aspect-square rounded-full mx-auto transition-transform duration-500 group-hover:scale-105 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.3)]"
                  style={{ backgroundColor: d.hex }}
                />
                <div className="font-display text-base mt-2">Day {d.day}</div>
                <div className="text-[11px] text-[#6E7B85] mt-0.5">{d.name}</div>
                <div className="text-[10px] text-[#6E7B85]/70 italic hidden md:block mt-1">
                  {d.meaning}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAMILY FUNCTION */}
      {familyFunction.length > 0 && (
        <section className="container-x py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="label-caps text-[#B58D3E]">Curated edit</span>
              <h2 className="font-display text-4xl sm:text-5xl mt-2">Family Function</h2>
              <p className="text-[#E8E3D7]/70 mt-2 max-w-lg">
                Anarkalis and lehengas that let you look put-together from morning aarti to late dinner.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {familyFunction.map((p, i) => (
              <Link
                key={p.id}
                to={`/product/${p.slug}`}
                data-testid={`family-${p.slug}`}
                className="group block fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#3E4245]">
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <h4 className="font-display text-lg mt-3">{p.name}</h4>
                <p className="text-sm text-[#B58D3E]">₹{p.price.toLocaleString("en-IN")}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ALL NAVRATRI */}
      <section className="bg-[#E8E3D7] text-[#2A2E30] py-16 md:py-20">
        <div className="container-x">
          <div className="text-center mb-10">
            <span className="label-caps text-[#A0684E]">The full drop</span>
            <h2 className="font-display text-4xl sm:text-5xl mt-2">Navratri Collection</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* URGENCY STRIP */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[#B58D3E]" />
        <div className="mandala-overlay" style={{ opacity: 0.08 }} />
        <div className="relative container-x py-14 text-[#2A2E30] text-center">
          <span className="label-caps">Limited stock · Made-to-measure closes soon</span>
          <h2 className="font-display text-3xl sm:text-4xl mt-2 max-w-2xl mx-auto">
            Pre-order now for guaranteed pre-Navratri delivery.
          </h2>
          <Link
            to="/shop/lehengas"
            className="mt-6 inline-flex items-center gap-2 bg-[#2A2E30] text-[#E8E3D7] px-8 py-4 rounded-sm text-sm uppercase tracking-widest hover:bg-[#A0684E] transition-colors"
          >
            Reserve your piece <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default NavratriLanding;
