import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSite } from "@/context/SiteContext";
import { SectionRenderer } from "@/components/events/SectionRenderer";
import { eventTheme } from "@/components/events/theme";
import { Seo } from "@/components/Seo";

// This page is the "Event" module's single fixed landing page (route stays
// /navratri regardless of the active event's name -- only one campaign is
// ever `is_active` at a time). Its content is entirely admin-built: the
// active campaign's `sections` list is rendered in order via SectionRenderer,
// so adding/removing/reordering/configuring sections in the admin Event
// builder (AdminCampaignForm.jsx) changes this page with no code changes.
export const NavratriLanding = () => {
  const { campaign, loading } = useSite();

  useEffect(() => {
    if (campaign?.theme === "festive") {
      document.body.classList.add("festive-mode");
      return () => document.body.classList.remove("festive-mode");
    }
  }, [campaign?.theme]);

  if (loading) return null;
  if (!campaign) return <Navigate to="/" replace />;

  const t = eventTheme(campaign.theme);
  const heroConfig = campaign.sections?.find((s) => s.type === "hero")?.config || {};

  return (
    <div className={`${t.bg} ${t.text} relative overflow-hidden`}>
      <Seo
        title={campaign.name}
        description={heroConfig.subtitle || `${campaign.name} — shop the edit at Rari Ethnic.`}
        image={heroConfig.image}
      />
      {(campaign.sections || []).map((section) => (
        <SectionRenderer key={section.id} section={section} campaign={campaign} />
      ))}
    </div>
  );
};

export default NavratriLanding;
