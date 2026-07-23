import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const SiteContext = createContext(null);

// Fallbacks so the storefront never breaks if the API is briefly unavailable.
const DEFAULT_SETTINGS = {
  announcements: [
    "Handcrafted in Surat",
    "Free shipping over ₹2,000",
    "Pan-India delivery in 4-7 days",
    "Cash on Delivery available",
  ],
  free_shipping_threshold: 2000,
  shipping_fee: 99,
  whatsapp_number: "919316565117",
  instagram_url: "https://www.instagram.com/rari.ethnic",
  home_hero: null,
  home_categories: [],
  home_why: [],
  instagram_tiles: [],
};

export const SiteProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get("/settings").catch(() => ({ data: DEFAULT_SETTINGS })),
      api.get("/campaigns/active").catch(() => ({ data: null })),
    ]).then(([s, c]) => {
      if (!mounted) return;
      setSettings({ ...DEFAULT_SETTINGS, ...(s.data || {}) });
      setCampaign(c.data || null);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SiteContext.Provider value={{ settings, campaign, loading }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const ctx = useContext(SiteContext);
  // Safe fallback if used outside the provider (keeps components resilient).
  return ctx || { settings: DEFAULT_SETTINGS, campaign: null, loading: false };
};
