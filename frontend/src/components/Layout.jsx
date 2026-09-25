import { Helmet } from "react-helmet-async";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppFloat } from "./WhatsAppFloat";
import { CartDrawer } from "./CartDrawer";
import { Toaster } from "sonner";
import { useSite } from "@/context/SiteContext";
import { INSTAGRAM_URL } from "@/lib/api";

// Site-wide structured data every storefront page should carry (Google's
// Organization/WebSite schema) -- set once here rather than repeated on every
// page. Per-page <Seo> components (see components/Seo.jsx) add their own
// title/description/Product/BreadcrumbList JSON-LD on top of this.
const siteJsonLd = (instagramUrl) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Rari Ethnic",
      url: typeof window !== "undefined" ? window.location.origin : undefined,
      logo: typeof window !== "undefined" ? `${window.location.origin}/brand/logo.png` : undefined,
      sameAs: [instagramUrl].filter(Boolean),
    },
    {
      "@type": "WebSite",
      name: "Rari Ethnic",
      url: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  ],
});

export const Layout = () => {
  const { settings } = useSite();

  return (
    <div className="min-h-screen flex flex-col bg-[#E8E3D7]">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(siteJsonLd(settings?.instagram_url || INSTAGRAM_URL))}</script>
      </Helmet>
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFloat />
      <CartDrawer />
      <Toaster
        position="bottom-left"
        theme="light"
        toastOptions={{
          style: {
            background: "#E8E3D7",
            border: "1px solid rgba(43,33,30,0.12)",
            color: "#2A2E30",
            fontFamily: "Jost, sans-serif",
          },
        }}
      />
    </div>
  );
};
