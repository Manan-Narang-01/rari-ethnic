import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { ShoppingBag, Menu, X, Instagram, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useSite } from "@/context/SiteContext";
import { useAuth, isStaffRole } from "@/context/AuthContext";
import { api, INSTAGRAM_URL } from "@/lib/api";

// Non-category nav entries, always shown after the dynamic category links.
const STATIC_NAV_TAIL = [
  { to: "/navratri", label: "Navratri", accent: true },
  { to: "/about", label: "About" },
];

// Used only if the categories fetch fails or returns nothing — keeps the
// navbar from ever rendering empty.
const FALLBACK_NAV = [
  { to: "/shop/kurtis", label: "Kurtis" },
  { to: "/shop/suits", label: "Suits" },
  { to: "/shop/lehengas", label: "Lehengas" },
  ...STATIC_NAV_TAIL,
];

export const Header = () => {
  const { count, setIsOpen } = useCart();
  const { settings } = useSite();
  const { isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [nav, setNav] = useState(FALLBACK_NAV);
  const accountHref = isAuthenticated ? (isStaffRole(user?.role) ? "/admin" : "/account") : "/login";

  useEffect(() => {
    api
      .get("/categories")
      .then((r) => {
        const categoryLinks = r.data
          .filter((c) => c.show_in_navbar)
          .map((c) => ({ to: `/shop/${c.key}`, label: c.name }));
        setNav(categoryLinks.length ? [...categoryLinks, ...STATIC_NAV_TAIL] : FALLBACK_NAV);
      })
      .catch(() => setNav(FALLBACK_NAV));
  }, []);

  const announcements =
    settings?.announcements?.length > 0
      ? settings.announcements
      : ["Handcrafted in Surat", "Free shipping over ₹2,000", "Pan-India delivery in 4-7 days"];
  const instagramUrl = settings?.instagram_url || INSTAGRAM_URL;
  // Duplicate the list so the marquee scrolls seamlessly.
  const marquee = [...announcements, ...announcements];

  return (
    <header className="sticky top-0 z-40 bg-[#E8E3D7]/92 backdrop-blur-md border-b border-[#8B9A9F]/20">
      {/* Announcement strip */}
      <div className="bg-[#2A2E30] text-[#E8E3D7]">
        <div className="container-x py-1.5 overflow-hidden">
          <div className="flex whitespace-nowrap animate-marquee gap-20 text-[10px] tracking-[0.28em] uppercase font-body">
            {marquee.map((msg, i) => (
              <span key={i} className="flex items-center gap-20">
                {msg}
                <span aria-hidden>·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="container-x flex items-center justify-between py-5">
        {/* Mobile menu */}
        <button
          data-testid="mobile-menu-toggle"
          className="md:hidden p-2 -ml-2 text-[#2A2E30]"
          onClick={() => setMobileOpen((s) => !s)}
          aria-label="Menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Logo */}
        <Link
          to="/"
          data-testid="header-logo"
          className="flex items-center gap-2 group"
          aria-label="Rari — Handcrafted Ethnic"
        >
          <img
            src="/brand/logo-transparent.png"
            alt="Rari"
            className="h-14 md:h-20 w-auto transition-opacity group-hover:opacity-80"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-9">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`nav-${n.label.toLowerCase()}`}
              className={({ isActive }) =>
                `font-body text-[13px] tracking-[0.15em] uppercase transition-colors relative pb-1 ${
                  isActive
                    ? "text-[#A0684E]"
                    : "text-[#2A2E30] hover:text-[#A0684E]"
                }`
              }
            >
              {n.label}
              {n.accent && (
                <span className="absolute -top-1 -right-3 w-1.5 h-1.5 rounded-full bg-[#B58D3E]" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            data-testid="header-instagram"
            className="hidden sm:inline-flex p-2 text-[#2A2E30] hover:text-[#A0684E] transition-colors"
          >
            <Instagram size={18} strokeWidth={1.6} />
          </a>
          <Link
            to={accountHref}
            aria-label={isAuthenticated ? "My account" : "Sign in"}
            data-testid="header-account"
            className="relative p-2 text-[#2A2E30] hover:text-[#A0684E] transition-colors"
          >
            {isAuthenticated && user?.picture ? (
              <img src={user.picture} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <User size={20} strokeWidth={1.6} />
            )}
          </Link>
          <button
            data-testid="header-cart-button"
            onClick={() => setIsOpen(true)}
            className="relative p-2 text-[#2A2E30] hover:text-[#A0684E] transition-colors"
            aria-label="Cart"
          >
            <ShoppingBag size={20} strokeWidth={1.6} />
            {count > 0 && (
              <span
                data-testid="header-cart-count"
                className="absolute -top-0.5 -right-0.5 bg-[#A0684E] text-[#E8E3D7] rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-medium"
              >
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#8B9A9F]/25 bg-[#E8E3D7]">
          <nav className="container-x py-4 flex flex-col gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setMobileOpen(false)}
                data-testid={`mobile-nav-${n.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `font-display text-2xl py-2 px-2 border-b border-[#8B9A9F]/15 ${
                    isActive ? "text-[#A0684E]" : "text-[#2A2E30]"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <Link
              to="/contact"
              onClick={() => setMobileOpen(false)}
              className="font-display text-2xl py-2 px-2 text-[#2A2E30]"
            >
              Contact
            </Link>
            <Link
              to="/size-guide"
              onClick={() => setMobileOpen(false)}
              className="font-display text-2xl py-2 px-2 text-[#2A2E30]"
            >
              Size Guide
            </Link>
            <Link
              to={accountHref}
              onClick={() => setMobileOpen(false)}
              className="font-display text-2xl py-2 px-2 text-[#A0684E]"
            >
              {isAuthenticated ? "My Account" : "Sign In"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};
