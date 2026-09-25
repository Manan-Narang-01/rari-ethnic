import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, buildWaLink, INSTAGRAM_URL } from "@/lib/api";
import { useSite } from "@/context/SiteContext";
import { ProductCard } from "@/components/ProductCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { images } from "@/assets/images";
import { CroppedImage } from "@/components/CroppedImage";
import { Seo } from "@/components/Seo";
import { ArrowRight, Sparkles, Truck, ShieldCheck, HandHeart, Instagram } from "lucide-react";

// Maps admin-configured icon names to lucide components.
const ICONS = { HandHeart, ShieldCheck, Truck, Sparkles };

const CategoryTile = ({ c, i }) => (
  <Link
    to={`/shop/${c.key}`}
    data-testid={`category-tile-${c.key}`}
    className="group relative aspect-square overflow-hidden block fade-up"
    style={{ animationDelay: `${i * 100}ms` }}
  >
    <CroppedImage
      src={c.image}
      crop={c.image_crop}
      alt={c.name}
      className="transition-transform duration-700 group-hover:scale-110"
    />
    <div
      className="absolute inset-0 opacity-70 group-hover:opacity-85 transition-opacity"
      style={{ background: `linear-gradient(to bottom, rgba(43,33,30,0) 40%, ${c.color}E6 100%)` }}
    />
    <div className="absolute inset-0 flex flex-col justify-end p-4 text-[#E8E3D7]">
      <span className="label-caps text-[#E8E3D7]/80 text-[10px]">{c.tag}</span>
      <h3 className="font-display text-xl sm:text-2xl mt-0.5">{c.name}</h3>
      <div className="mt-1 inline-flex items-center gap-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        Shop {c.name} <ArrowRight size={12} />
      </div>
    </div>
  </Link>
);

const InstaTile = ({ tile, i, instagramUrl }) => (
  <a
    href={tile.post_url || instagramUrl}
    target="_blank"
    rel="noopener noreferrer"
    data-testid={`instagram-tile-${i}`}
    className="relative aspect-square overflow-hidden group block"
  >
    <CroppedImage
      src={tile.image}
      crop={tile.image_crop}
      alt="Instagram feed"
      className="transition-transform duration-700 group-hover:scale-110"
    />
    <div className="absolute inset-0 bg-[#2A2E30]/0 group-hover:bg-[#2A2E30]/60 transition-colors flex items-center justify-center">
      <Instagram size={26} className="text-[#E8E3D7] opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </a>
);

const FALLBACK_CATEGORIES = [
  { key: "kurtis", name: "Kurtis", tag: "Everyday to festive", image: images.home.categories.kurtis, color: "#A0684E" },
  { key: "suits", name: "Suits", tag: "Palazzo, Sharara & more", image: images.home.categories.suits, color: "#7B6E5A" },
  { key: "lehengas", name: "Lehengas", tag: "For the big days", image: images.home.categories.lehengas, color: "#A05B6A" },
];

// Category documents have no color field of their own -- cycled for tile variety.
const CATEGORY_TILE_COLORS = ["#A0684E", "#7B6E5A", "#A05B6A", "#B58D3E"];

const FALLBACK_WHYS = [
  { icon: "HandHeart", title: "Fabric-first", copy: "Sourced from Surat mills we've known for years." },
  { icon: "ShieldCheck", title: "Fit Promise", copy: "Honest sizing. Fit notes on every piece." },
  { icon: "Truck", title: "Pan-India Shipping", copy: "COD available. 4-7 day delivery." },
  { icon: "Sparkles", title: "1,200+ Happy Homes", copy: "From Surat to Bengaluru to Guwahati." },
];

export const Home = () => {
  const { settings, campaign } = useSite();
  const [bestsellers, setBestsellers] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [categoryTiles, setCategoryTiles] = useState(FALLBACK_CATEGORIES);

  useEffect(() => {
    api.get("/products", { params: { is_bestseller: true } }).then((r) => setBestsellers(r.data));
    api.get("/products", { params: { is_new: true } }).then((r) => setNewArrivals(r.data));
    api
      .get("/categories")
      .then((r) => {
        const catalogCategories = r.data.filter((c) => c.show_in_catalog);
        setCategoryTiles(
          catalogCategories.length
            ? catalogCategories.map((c, i) => ({
                key: c.key,
                name: c.name,
                tag: c.description || "",
                image: c.image || images.home.categories[c.key] || images.home.hero,
                image_crop: c.image_crop,
                color: CATEGORY_TILE_COLORS[i % CATEGORY_TILE_COLORS.length],
              }))
            : FALLBACK_CATEGORIES
        );
      })
      .catch(() => setCategoryTiles(FALLBACK_CATEGORIES));
  }, []);

  const hero = settings?.home_hero;
  const CATEGORIES = categoryTiles;
  const WHYS = settings?.home_why?.length ? settings.home_why : FALLBACK_WHYS;
  const instaTilesRaw = settings?.instagram_tiles?.length ? settings.instagram_tiles : images.home.instagram;
  // Older settings docs (or the hardcoded fallback) store tiles as plain image
  // URL strings; newer ones are {image, post_url} so each tile can link to its
  // real Instagram post instead of just the profile.
  const instaTiles = instaTilesRaw.map((t) => (typeof t === "string" ? { image: t, post_url: null } : t));
  const instagramUrl = settings?.instagram_url || INSTAGRAM_URL;
  const heroEyebrow = hero?.eyebrow || "Navratri Collection · 2026";
  const heroTitleLines = hero?.title_lines?.length ? hero.title_lines : ["Handcrafted", "for the days", "that matter."];
  const heroSubtitle = hero?.subtitle ||
    "Lehengas, kurtis and suits stitched with intention — for Garba nights, family functions and the quiet mornings before them. From our Surat studio to your doorstep.";
  const heroImage = hero?.image || images.home.hero;

  return (
    <div className="bg-[#E8E3D7]">
      <Seo
        title="Indian Ethnic Wear — Kurtis, Suits & Lehengas"
        description="Handcrafted Indian ethnic wear from Surat — kurtis, suits and lehengas for festive days and quiet ones. Cash on Delivery, Pan-India shipping."
        image={heroImage}
      />
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <CroppedImage src={heroImage} crop={hero?.image_crop} alt="Collection" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#2A2E30]/70 via-[#2A2E30]/40 to-[#2A2E30]/85" />
        </div>
        <div className="mandala-overlay" style={{ opacity: 0.08 }} />

        <div className="relative container-x py-24 md:py-32 lg:py-40 text-[#E8E3D7] fade-up">
          <div className="max-w-2xl">
            <span className="label-caps text-[#B58D3E]">{heroEyebrow}</span>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] mt-5 font-normal">
              {heroTitleLines.map((line, i) => (
                <span key={i}>
                  {i === heroTitleLines.length - 1 ? (
                    <em className="text-[#B58D3E] not-italic font-normal">{line}</em>
                  ) : (
                    line
                  )}
                  {i < heroTitleLines.length - 1 && <br />}
                </span>
              ))}
            </h1>
            <p className="mt-7 text-base sm:text-lg text-[#E8E3D7]/85 max-w-lg leading-relaxed font-body font-light">
              {heroSubtitle}
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

          {campaign?.countdown_target && (
            <div className="mt-14 max-w-md">
              <CountdownTimer
                variant="dark"
                target={campaign.countdown_target}
                label={campaign.countdown_label || "Navratri arrives in"}
              />
            </div>
          )}
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

        {CATEGORIES.length > 4 ? (
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {CATEGORIES.map((c, i) => (
                <CarouselItem key={c.key} className="pl-2 md:pl-4 basis-1/2 md:basis-1/4">
                  <CategoryTile c={c} i={i} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 border-none bg-[#E8E3D7]/90 hover:bg-[#E8E3D7] text-[#2A2E30]" />
            <CarouselNext className="right-2 border-none bg-[#E8E3D7]/90 hover:bg-[#E8E3D7] text-[#2A2E30]" />
          </Carousel>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {CATEGORIES.map((c, i) => (
              <CategoryTile key={c.key} c={c} i={i} />
            ))}
          </div>
        )}
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
            {WHYS.map((w, i) => {
              const Icon = ICONS[w.icon] || Sparkles;
              return (
                <div key={i} className="text-center fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="inline-flex w-14 h-14 rounded-full bg-[#E8E3D7] items-center justify-center text-[#A0684E] border border-[#A0684E]/15">
                    <Icon size={22} strokeWidth={1.6} />
                  </div>
                  <h4 className="font-display text-xl mt-3">{w.title}</h4>
                  <p className="text-xs sm:text-sm text-[#6E7B85] mt-1 leading-relaxed">{w.copy}</p>
                </div>
              );
            })}
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
        {instaTiles.length > 4 ? (
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {instaTiles.map((tile, i) => (
                <CarouselItem key={i} className="pl-2 md:pl-4 basis-1/2 md:basis-1/4">
                  <InstaTile tile={tile} i={i} instagramUrl={instagramUrl} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 border-none bg-[#E8E3D7]/90 hover:bg-[#E8E3D7] text-[#2A2E30]" />
            <CarouselNext className="right-2 border-none bg-[#E8E3D7]/90 hover:bg-[#E8E3D7] text-[#2A2E30]" />
          </Carousel>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {instaTiles.map((tile, i) => (
              <InstaTile key={i} tile={tile} i={i} instagramUrl={instagramUrl} />
            ))}
          </div>
        )}
        <div className="text-center mt-8">
          <a
            href={instagramUrl}
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
