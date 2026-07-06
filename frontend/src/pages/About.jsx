import { Link } from "react-router-dom";
import { Sparkles, Scissors, MapPin, Users } from "lucide-react";

export const About = () => {
  return (
    <div className="bg-[#FAF6F0]">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mandala-overlay" style={{ opacity: 0.05 }} />
        <div className="container-x py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div className="fade-up">
            <span className="label-caps text-[#7E1F35]">Our story</span>
            <h1 className="font-display text-5xl sm:text-6xl leading-[1.05] mt-3">
              From a Surat mill
              <br />
              to your Sunday best.
            </h1>
            <p className="mt-6 text-[#2B211E]/85 leading-relaxed">
              Three generations of our family have worked with fabric — first as
              mill hands, then as kidswear tailors on Ring Road. Rari Ethnic is
              what happens when the same eye for cloth turns toward women's ethnic wear.
            </p>
            <p className="mt-4 text-[#2B211E]/85 leading-relaxed">
              We keep things simple. Good fabric, honest fit, fair price. No filler,
              no drama, no D2C tricks — just clothes that hold up to real festivals,
              real weddings, real lives.
            </p>
          </div>
          <div className="relative aspect-[4/5] fade-up">
            <img
              src="https://images.unsplash.com/photo-1677691257363-eebd2abeafec?w=1200"
              alt="Rari Ethnic"
              className="w-full h-full object-cover"
            />
            <div className="absolute -bottom-5 -left-5 bg-[#DCA537] text-[#2B211E] px-5 py-3 rounded-sm shadow-lg">
              <div className="font-display text-3xl leading-none">1962</div>
              <div className="text-[11px] uppercase tracking-widest mt-1">Family in fabric since</div>
            </div>
          </div>
        </div>
      </section>

      {/* PROMISE */}
      <section className="bg-[#F3EDE4]">
        <div className="container-x py-16">
          <div className="text-center mb-12">
            <span className="label-caps text-[#7E1F35]">The promise</span>
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
                <div className="inline-flex w-14 h-14 rounded-full bg-[#FAF6F0] items-center justify-center text-[#7E1F35] border border-[#7E1F35]/15">
                  <v.i size={22} strokeWidth={1.6} />
                </div>
                <h4 className="font-display text-xl mt-4">{v.t}</h4>
                <p className="text-sm text-[#6B5B55] mt-2 leading-relaxed">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOURCING */}
      <section className="container-x py-20 grid md:grid-cols-2 gap-10 items-center">
        <div className="order-2 md:order-1">
          <span className="label-caps text-[#7E1F35]">How we source</span>
          <h2 className="font-display text-4xl mt-2">Fabric first. Always.</h2>
          <div className="mt-6 space-y-5 text-[#2B211E]/85 leading-relaxed">
            <p>
              <strong className="text-[#2B211E]">Cotton</strong> from Kutch and Sanganer — hand block prints where the
              indigo deepens with every wash.
            </p>
            <p>
              <strong className="text-[#2B211E]">Silks</strong> from local Surat mills we've bought from since our father's
              time. We know the weft count, not just the price.
            </p>
            <p>
              <strong className="text-[#2B211E]">Chikankari</strong> stitched by karigars in Lucknow. Fair wage, direct
              purchase — no middlemen taking a slice.
            </p>
            <p>
              <strong className="text-[#2B211E]">Bandhani</strong> hand-knotted by Kutch artisans. Every dot is a
              woman's afternoon.
            </p>
          </div>
        </div>
        <div className="order-1 md:order-2 aspect-square relative">
          <img
            src="https://images.unsplash.com/photo-1503160865267-af4660ce7bf2?w=1200"
            alt="Fabric"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#7E1F35] text-[#FAF6F0]">
        <div className="container-x py-16 text-center">
          <h2 className="font-display text-3xl sm:text-4xl max-w-2xl mx-auto">
            Ready to find your piece?
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/shop/kurtis" className="bg-[#DCA537] text-[#2B211E] px-7 py-3.5 rounded-sm text-sm uppercase tracking-widest hover:bg-[#FAF6F0] transition-colors">
              Shop Kurtis
            </Link>
            <Link to="/navratri" className="border border-[#FAF6F0]/60 text-[#FAF6F0] px-7 py-3.5 rounded-sm text-sm uppercase tracking-widest hover:bg-[#FAF6F0] hover:text-[#2B211E] transition-colors">
              Navratri Edit
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
