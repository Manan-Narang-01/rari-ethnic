import { Link } from "react-router-dom";
import { images } from "@/assets/images";
import { Sparkles, Scissors, MapPin, Users } from "lucide-react";

export const About = () => {
  return (
    <div className="bg-[#E8E3D7]">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mandala-overlay" style={{ opacity: 0.05 }} />
        <div className="container-x py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div className="fade-up">
            <span className="label-caps text-[#A0684E]">Our story</span>
            <h1 className="font-display text-5xl sm:text-6xl leading-[1.05] mt-3">
              From a Surat mill
              <br />
              to your Sunday best.
            </h1>
            <p className="mt-6 text-[#2A2E30]/85 leading-relaxed">
              Three generations of our family have worked with fabric — first as
              mill hands, then as kidswear tailors on Ring Road. Rari Ethnic is
              what happens when the same eye for cloth turns toward women's ethnic wear.
            </p>
            <p className="mt-4 text-[#2A2E30]/85 leading-relaxed">
              We keep things simple. Good fabric, honest fit, fair price. No filler,
              no drama, no D2C tricks — just clothes that hold up to real festivals,
              real weddings, real lives.
            </p>
          </div>
          <div className="relative aspect-[4/5] fade-up">
            <img
              src={images.about.story}
              alt="Rari Ethnic"
              className="w-full h-full object-cover"
            />
            <div className="absolute -bottom-5 -left-5 bg-[#B58D3E] text-[#2A2E30] px-5 py-3 rounded-sm shadow-lg">
              <div className="font-display text-3xl leading-none">1962</div>
              <div className="text-[11px] uppercase tracking-widest mt-1">Family in fabric since</div>
            </div>
          </div>
        </div>
      </section>

      {/* PROMISE */}
      <section className="bg-[#DDD5C4]">
        <div className="container-x py-16">
          <div className="text-center mb-12">
            <span className="label-caps text-[#A0684E]">The promise</span>
            <h2 className="font-display text-3xl sm:text-4xl mt-2">What we won't compromise on</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { i: Scissors, t: "Cut for real bodies", d: "Fit tested on women of every size in our own family before it goes on site." },
              { i: Sparkles, t: "Fabric we can name", d: "We source from mills we've known for decades. If we won't wear it, we won't sell it." },
              { i: MapPin, t: "Made in Surat", d: "Cut, stitched and finished here. Nothing outsourced overseas." },
              { i: Users, t: "1,200+ happy homes", d: "From Surat to Guwahati, families keep coming back." },
            ].map((v, i) => (
              <div key={i} className="text-center fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="inline-flex w-14 h-14 rounded-full bg-[#E8E3D7] items-center justify-center text-[#A0684E] border border-[#A0684E]/15">
                  <v.i size={22} strokeWidth={1.6} />
                </div>
                <h4 className="font-display text-xl mt-4">{v.t}</h4>
                <p className="text-sm text-[#6E7B85] mt-2 leading-relaxed">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOURCING */}
      <section className="container-x py-20 grid md:grid-cols-2 gap-10 items-center">
        <div className="order-2 md:order-1">
          <span className="label-caps text-[#A0684E]">How we source</span>
          <h2 className="font-display text-4xl mt-2">Fabric first. Always.</h2>
          <div className="mt-6 space-y-5 text-[#2A2E30]/85 leading-relaxed">
            <p>
              <strong className="text-[#2A2E30]">Cotton</strong> from Kutch and Sanganer — hand block prints where the
              indigo deepens with every wash.
            </p>
            <p>
              <strong className="text-[#2A2E30]">Silks</strong> from local Surat mills we've bought from since our father's
              time. We know the weft count, not just the price.
            </p>
            <p>
              <strong className="text-[#2A2E30]">Chikankari</strong> stitched by karigars in Lucknow. Fair wage, direct
              purchase — no middlemen taking a slice.
            </p>
            <p>
              <strong className="text-[#2A2E30]">Bandhani</strong> hand-knotted by Kutch artisans. Every dot is a
              woman's afternoon.
            </p>
          </div>
        </div>
        <div className="order-1 md:order-2 aspect-square relative">
          <img
            src={images.about.fabric}
            alt="Fabric"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#A0684E] text-[#E8E3D7]">
        <div className="container-x py-16 text-center">
          <h2 className="font-display text-3xl sm:text-4xl max-w-2xl mx-auto">
            Ready to find your piece?
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/shop/kurtis" className="bg-[#B58D3E] text-[#2A2E30] px-7 py-3.5 rounded-sm text-sm uppercase tracking-widest hover:bg-[#E8E3D7] transition-colors">
              Shop Kurtis
            </Link>
            <Link to="/navratri" className="border border-[#E8E3D7]/60 text-[#E8E3D7] px-7 py-3.5 rounded-sm text-sm uppercase tracking-widest hover:bg-[#E8E3D7] hover:text-[#2A2E30] transition-colors">
              Navratri Edit
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
