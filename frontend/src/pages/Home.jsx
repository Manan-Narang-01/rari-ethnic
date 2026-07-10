import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, buildWaLink, INSTAGRAM_URL } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ArrowRight, Sparkles, Truck, ShieldCheck, HandHeart, Instagram } from "lucide-react";

const CATEGORIES = [
  {
    key: "kurtis",
    name: "Kurtis",
    tag: "Everyday to festive",
    image: "https://images.unsplash.com/photo-1708534246055-d7b149acb731?w=1200",
    color: "#A0684E",
  },
  {
    key: "suits",
    name: "Suits",
    tag: "Palazzo, Sharara & more",
    image: "https://images.unsplash.com/photo-1764740146693-4955d02c98f9?w=1200",
    color: "#7B6E5A",
  },
  {
    key: "lehengas",
    name: "Lehengas",
    tag: "For the big days",
    image: "https://images.unsplash.com/photo-1503160865267-af4660ce7bf2?w=1200",
    color: "#A05B6A",
  },
];

const WHYS = [
  { icon: HandHeart, title: "Fabric-first", copy: "Sourced from Surat mills we've known for years." },
  { icon: ShieldCheck, title: "Fit Promise", copy: "Honest sizing. Fit notes on every piece." },
  { icon: Truck, title: "Pan-India Shipping", copy: "COD available. 4-7 day delivery." },
  { icon: Sparkles, title: "1,200+ Happy Homes", copy: "From Surat to Bengaluru to Guwahati." },
];

export const Home = () => {
  const [bestsellers, setBestsellers] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);

  useEffect(() => {
    api.get("/products", { params: { is_bestseller: true } }).then((r) => setBestsellers(r.data));
    api.get("/products", { params: { is_new: true } }).then((r) => setNewArrivals(r.data));
  }, []);

  return (
    <div className="bg-[#E8E3D7]">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1654764746225-e63f5e90facd?w=2000"
            alt="Navratri collection"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#2A2E30]/70 via-[#2A2E30]/40 to-[#2A2E30]/85" />
        </div>
        <div className="mandala-overlay" style={{ opacity: 0.08 }} />

        <div className="relative container-x py-24 md:py-32 lg:py-40 text-[#E8E3D7] fade-up">
          <div className="max-w-2xl">
            <span className="label-caps text-[#B58D3E]">Navratri Collection · 2026</span>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] mt-5 font-normal">
              Handcrafted
              <br />
              for the days
              <br />
              <em className="text-[#B58D3E] not-italic font-normal">that matter.</em>
            </h1>
            <p className="mt-7 text-base sm:text-lg text-[#E8E3D7]/85 max-w-lg leading-relaxed font-body font-light">
              Lehengas, kurtis and suits stitched with intention — for Garba nights,
              family functions and the quiet mornings before them. From our Surat
              studio to your doorstep.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/navratri"
                data-testid="hero-cta-navratri"
                className="inline-flex items-center gap-2 bg-[#B58D3E] text-[#2A2E30] px-7 py-4 rounded-sm font-medium text-sm uppercase tracking-widest hover:bg-[#E8E3D7] transition-colors"
              >
                Shop Navratri Edit <ArrowRight size={16} />
              </Link>
              <Link
                to="/shop/kurtis"
                data-testid="hero-cta-kurtis"
                className="inline-flex items-center gap-2 border border-[#E8E3D7]/60 text-[#E8E3D7] px-7 py-4 rounded-sm font-medium text-sm uppercase tracking-widest hover:bg-[#E8E3D7] hover:text-[#2A2E30] transition-colors"
              >
                Browse Kurtis
              </Link>
            </div>
          </div>

          <div className="mt-14 max-w-md">
            <CountdownTimer variant="dark" label="Navratri arrives in" />
          </div>
        </div>
      </section>

      {/* CATEGORY TILES */}
      <section className="container-x py-16 md:py-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="label-caps text-[#A0684E]">Explore</span>
            <h2 className="font-display text-3xl sm:text-4xl mt-2">Shop by piece</h2>
          </div>
          <Link
            to="/shop/kurtis"
            className="hidden sm:inline-flex items-center gap-2 text-sm text-[#2A2E30] hover:text-[#A0684E]"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.key}
              to={`/shop/${c.key}`}
              data-testid={`category-tile-${c.key}`}
              className="group relative aspect-[4/5] overflow-hidden fade-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <img
                src={c.image}
                alt={c.name}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div
                className="absolute inset-0 transition-opacity"
                style={{
                  background: `linear-gradient(to bottom, rgba(43,33,30,0.15) 0%, ${c.color}CC 100%)`,
                }}
              />
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-[#E8E3D7]">
                <span className="label-caps text-[#E8E3D7]/80">{c.tag}</span>
                <h3 className="font-display text-4xl mt-1">{c.name}</h3>
                <div className="mt-3 inline-flex items-center gap-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  Shop {c.name} <ArrowRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="bg-[#DDD5C4] relative overflow-hidden">
        <div className="mandala-overlay" />
        <div className="container-x py-14 relative">
          <div className="text-center mb-10">
            <span className="label-caps text-[#A0684E]">Why Rari Ethnic</span>
            <h2 className="font-display text-3xl sm:text-4xl mt-2">Fabric people. First.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {WHYS.map((w, i) => (
              <div key={i} className="text-center fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="inline-flex w-14 h-14 rounded-full bg-[#E8E3D7] items-center justify-center text-[#A0684E] border border-[#A0684E]/15">
                  <w.icon size={22} strokeWidth={1.6} />
                </div>
                <h4 className="font-display text-xl mt-3">{w.title}</h4>
                <p className="text-xs sm:text-sm text-[#6E7B85] mt-1 leading-relaxed">{w.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BESTSELLERS */}
      <section className="container-x py-16 md:py-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="label-caps text-[#A0684E]">Bestsellers</span>
            <h2 className="font-display text-3xl sm:text-4xl mt-2">
              What Rari homes love
            </h2>
          </div>
          <Link
            to="/shop/kurtis"
            className="hidden sm:inline-flex items-center gap-2 text-sm text-[#2A2E30] hover:text-[#A0684E]"
          >
            All bestsellers <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
          {bestsellers.slice(0, 8).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* NEW ARRIVALS STRIP */}
      {newArrivals.length > 0 && (
        <section className="bg-[#2A2E30] text-[#E8E3D7]">
          <div className="container-x py-14">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="label-caps text-[#B58D3E]">Freshly stitched</span>
                <h2 className="font-display text-3xl sm:text-4xl mt-2">New Arrivals</h2>
              </div>
              <Link
                to="/shop/kurtis"
                className="hidden sm:inline-flex items-center gap-2 text-sm text-[#E8E3D7]/80 hover:text-[#B58D3E]"
              >
                See all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {newArrivals.slice(0, 4).map((p, i) => (
                <Link
                  key={p.id}
                  to={`/product/${p.slug}`}
                  data-testid={`new-arrival-${p.slug}`}
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
          </div>
        </section>
      )}

      {/* INSTAGRAM FEED */}
      <section className="container-x py-16 md:py-24">
        <div className="text-center mb-10">
          <span className="label-caps text-[#A0684E]">Follow along</span>
          <h2 className="font-display text-3xl sm:text-4xl mt-2">@rari.ethnic</h2>
          <p className="text-sm text-[#6E7B85] mt-2">Real customers · styling tips · new drops first</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          {[
            "https://images.unsplash.com/photo-1503160865267-af4660ce7bf2?w=600",
            "https://images.unsplash.com/photo-1708534246055-d7b149acb731?w=600",
            "https://images.pexels.com/photos/13178920/pexels-photo-13178920.jpeg?w=600",
            "https://images.unsplash.com/photo-1764740146693-4955d02c98f9?w=600",
          ].map((src, i) => (
            <a
              key={i}
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`instagram-tile-${i}`}
              className="relative aspect-square overflow-hidden group"
            >
              <img
                src={src}
                alt="Instagram feed"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-[#2A2E30]/0 group-hover:bg-[#2A2E30]/60 transition-colors flex items-center justify-center">
                <Instagram size={26} className="text-[#E8E3D7] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>
        <div className="text-center mt-8">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm border border-[#2A2E30]/20 px-6 py-3 rounded-sm hover:bg-[#2A2E30] hover:text-[#E8E3D7] transition-colors"
          >
            <Instagram size={16} /> Follow on Instagram
          </a>
        </div>
      </section>

      {/* WHATSAPP CTA STRIP */}
      <section className="bg-[#A0684E] text-[#E8E3D7]">
        <div className="container-x py-14 text-center">
          <span className="label-caps text-[#B58D3E]">Personal styling</span>
          <h2 className="font-display text-3xl sm:text-4xl mt-2 max-w-2xl mx-auto">
            Not sure what to pick? Message us on WhatsApp.
          </h2>
          <p className="text-sm text-[#E8E3D7]/80 mt-3 max-w-xl mx-auto">
            Tell us the occasion and your size. We'll send hand-picked options with real fabric photos.
          </p>
          <a
            href={buildWaLink("Hi Rari Ethnic! Please help me pick a piece.")}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="home-whatsapp-cta"
            className="mt-6 inline-flex items-center gap-2 bg-[#25D366] text-[#E8E3D7] px-8 py-4 rounded-sm text-sm uppercase tracking-widest hover:bg-[#20b055] transition-colors"
          >
            Chat with us <ArrowRight size={16} />
          </a>
        </div>
      </section>
    </div>
  );
};

export default Home;
