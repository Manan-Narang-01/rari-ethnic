import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { ShoppingBag, Menu, X, Instagram } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { INSTAGRAM_URL } from "@/lib/api";

const nav = [
  { to: "/shop/kurtis", label: "Kurtis" },
  { to: "/shop/suits", label: "Suits" },
  { to: "/shop/lehengas", label: "Lehengas" },
  { to: "/navratri", label: "Navratri", accent: true },
  { to: "/about", label: "About" },
];

export const Header = () => {
  const { count, setIsOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#FAF6F0]/90 backdrop-blur-md border-b border-[#2B211E]/8">
      {/* Announcement strip */}
      <div className="bg-[#2B211E] text-[#FAF6F0]">
        <div className="container-x py-1.5 overflow-hidden">
          <div className="flex whitespace-nowrap animate-marquee gap-16 text-[11px] tracking-widest uppercase">
            <span>Free shipping over ₹2,000</span>
            <span>Pan-India delivery • 4-7 days</span>
            <span>Cash on Delivery available</span>
            <span>Navratri drop live · limited stock</span>
            <span>Free shipping over ₹2,000</span>
            <span>Pan-India delivery • 4-7 days</span>
            <span>Cash on Delivery available</span>
            <span>Navratri drop live · limited stock</span>
          </div>
        </div>
      </div>

      <div className="container-x flex items-center justify-between py-4">
        {/* Mobile menu */}
        <button
          data-testid="mobile-menu-toggle"
          className="md:hidden p-2 -ml-2 text-[#2B211E]"
          onClick={() => setMobileOpen((s) => !s)}
          aria-label="Menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Logo */}
        <Link
          to="/"
          data-testid="header-logo"
          className="font-display text-2xl sm:text-3xl leading-none text-[#2B211E] hover:text-[#7E1F35] transition-colors"
        >
          Rari <span className="text-[#7E1F35]">Ethnic</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`nav-${n.label.toLowerCase()}`}
              className={({ isActive }) =>
                `font-body text-sm tracking-wide uppercase transition-colors relative pb-1 ${
                  isActive ? "text-[#7E1F35]" : "text-[#2B211E] hover:text-[#7E1F35]"
                } ${n.accent ? "font-medium" : ""}`
              }
            >
              {n.label}
              {n.accent && (
                <span className="absolute -top-2 -right-3 w-1.5 h-1.5 rounded-full bg-[#DCA537]" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            data-testid="header-instagram"
            className="hidden sm:inline-flex p-2 text-[#2B211E] hover:text-[#7E1F35] transition-colors"
          >
            <Instagram size={19} />
          </a>
          <button
            data-testid="header-cart-button"
            onClick={() => setIsOpen(true)}
            className="relative p-2 text-[#2B211E] hover:text-[#7E1F35] transition-colors"
            aria-label="Cart"
          >
            <ShoppingBag size={20} />
            {count > 0 && (
              <span
                data-testid="header-cart-count"
                className="absolute -top-0.5 -right-0.5 bg-[#7E1F35] text-[#FAF6F0] rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-medium"
              >
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#2B211E]/10 bg-[#FAF6F0]">
          <nav className="container-x py-4 flex flex-col gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setMobileOpen(false)}
                data-testid={`mobile-nav-${n.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `font-display text-xl py-2 px-2 border-b border-[#2B211E]/5 ${
                    isActive ? "text-[#7E1F35]" : "text-[#2B211E]"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <Link
              to="/contact"
              onClick={() => setMobileOpen(false)}
              className="font-display text-xl py-2 px-2 text-[#2B211E]"
            >
              Contact
            </Link>
            <Link
              to="/size-guide"
              onClick={() => setMobileOpen(false)}
              className="font-display text-xl py-2 px-2 text-[#2B211E]"
            >
              Size Guide
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};
