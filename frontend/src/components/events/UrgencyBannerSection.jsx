import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { eventTheme } from "./theme";

export const UrgencyBannerSection = ({ config, theme }) => {
  const t = eventTheme(theme);
  if (!config.heading) return null;

  return (
    <section className="relative overflow-hidden mt-8">
      <div className={`absolute inset-0 ${t.accentBg}`} />
      <div className="mandala-overlay" style={{ opacity: 0.12 }} />
      <div className={`relative container-x py-14 ${t.accentText} text-center`}>
        {config.subtext && (
          <span className={`label-caps tracking-[0.3em] ${t.festive ? "text-[#7E1F35]" : "text-[#8C4A3B]"}`}>{config.subtext}</span>
        )}
        <h2 className="font-display text-3xl sm:text-4xl mt-3 max-w-2xl mx-auto">{config.heading}</h2>
        {config.cta_label && config.cta_link && (
          <Link
            to={config.cta_link}
            className={`mt-6 inline-flex items-center gap-2 ${t.festive ? "bg-[#3E0714] text-[#F4C842] hover:bg-[#7E1F35]" : "bg-[#2A2E30] text-[#E8E3D7] hover:bg-[#1A1D1E]"} px-8 py-4 rounded-sm text-xs uppercase tracking-[0.24em] transition-colors`}
          >
            {config.cta_label} <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </section>
  );
};

export default UrgencyBannerSection;
