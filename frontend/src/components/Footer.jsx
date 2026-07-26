import { Link } from "react-router-dom";
import { Instagram, MessageCircle, Mail } from "lucide-react";
import { useState } from "react";
import { api, buildWaLink, INSTAGRAM_URL } from "@/lib/api";
import { toast } from "sonner";

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email && !phone) {
      toast.error("Enter your email or WhatsApp number");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/subscribe", { email: email || null, phone: phone || null, source: "footer" });
      toast.success("You're on the Navratri drop list!");
      setEmail("");
      setPhone("");
    } catch (err) {
      toast.error("Could not save. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#2A2E30] text-[#E8E3D7] mt-24 relative overflow-hidden">
      <div className="mandala-overlay" style={{ opacity: 0.06 }} />
      <div className="container-x py-16 relative">
        <div className="grid md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <img
              src="/brand/logo-transparent.png"
              alt="Rari — Handcrafted Ethnic"
              className="h-16 w-auto opacity-95"
            />
            <p className="mt-4 text-sm text-[#E8E3D7]/70 leading-relaxed">
              From a family of fabric people in Surat. Handcrafted ethnic wear —
              good fabric, honest fit, fair price. The way our mothers wanted it.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                data-testid="footer-instagram"
                className="w-9 h-9 rounded-full border border-[#E8E3D7]/25 flex items-center justify-center hover:bg-[#B58D3E] hover:text-[#2A2E30] hover:border-[#B58D3E] transition-colors"
              >
                <Instagram size={16} />
              </a>
              <a
                href={buildWaLink("Hi Rari Ethnic!")}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                data-testid="footer-whatsapp"
                className="w-9 h-9 rounded-full border border-[#E8E3D7]/25 flex items-center justify-center hover:bg-[#25D366] hover:border-[#25D366] transition-colors"
              >
                <MessageCircle size={16} />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <div className="label-caps text-[#B58D3E]">Shop</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/shop/kurtis" className="hover:text-[#B58D3E]">Kurtis</Link></li>
              <li><Link to="/shop/suits" className="hover:text-[#B58D3E]">Suits</Link></li>
              <li><Link to="/shop/lehengas" className="hover:text-[#B58D3E]">Lehengas</Link></li>
              <li><Link to="/navratri" className="hover:text-[#B58D3E]">Navratri Collection</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <div className="label-caps text-[#B58D3E]">Help</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/size-guide" className="hover:text-[#B58D3E]">Size Guide</Link></li>
              <li><Link to="/about" className="hover:text-[#B58D3E]">Our Story</Link></li>
              <li><Link to="/contact" className="hover:text-[#B58D3E]">Contact / WhatsApp</Link></li>
              <li><a href={buildWaLink("Hi Rari Ethnic! I have a question about shipping.")} target="_blank" rel="noopener noreferrer" className="hover:text-[#B58D3E]">Shipping & Exchanges</a></li>
            </ul>
          </div>

          {/* Signup */}
          <div>
            <div className="label-caps text-[#B58D3E]">Navratri Drop List</div>
            <p className="mt-3 text-sm text-[#E8E3D7]/70 leading-relaxed">
              First access to new pieces. WhatsApp broadcast — no spam.
            </p>
            <form onSubmit={submit} className="mt-4 space-y-2" data-testid="footer-signup-form">
              <div className="flex items-center border-b border-[#E8E3D7]/25 focus-within:border-[#B58D3E]">
                <Mail size={14} className="text-[#E8E3D7]/50 mr-2" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="footer-signup-email"
                  className="bg-transparent flex-1 py-2 text-sm outline-none placeholder:text-[#E8E3D7]/40"
                />
              </div>
              <div className="flex items-center border-b border-[#E8E3D7]/25 focus-within:border-[#B58D3E]">
                <MessageCircle size={14} className="text-[#E8E3D7]/50 mr-2" />
                <input
                  type="tel"
                  placeholder="WhatsApp number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  data-testid="footer-signup-phone"
                  className="bg-transparent flex-1 py-2 text-sm outline-none placeholder:text-[#E8E3D7]/40"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                data-testid="footer-signup-submit"
                className="mt-3 w-full bg-[#B58D3E] text-[#2A2E30] py-2.5 rounded-sm font-medium text-sm uppercase tracking-widest hover:bg-[#E8E3D7] transition-colors disabled:opacity-60"
              >
                {submitting ? "Adding..." : "Notify Me"}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-[#E8E3D7]/12 flex flex-col md:flex-row justify-between gap-3 text-xs text-[#E8E3D7]/50">
          <div>© {new Date().getFullYear()} Rari Ethnic · Surat, Gujarat</div>
          <div className="flex gap-4">
            <span>Cash on Delivery</span>
            <span>·</span>
            <span>Pan-India Shipping</span>
            <span>·</span>
            <span>Made in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
