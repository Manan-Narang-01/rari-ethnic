import { CroppedImage } from "@/components/CroppedImage";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ArrowRight, Flame } from "lucide-react";
import { images } from "@/assets/images";
import { eventTheme } from "./theme";

// Preserves the original NavratriLanding hero exactly for theme="festive"
// (Mata Rani portrait framing, gold glow, mandala overlay); a simpler clean
// treatment for theme="default".
export const HeroSection = ({ config, theme, campaign }) => {
  const t = eventTheme(theme);
  const title = config.title || "";
  const titleLines = title.split(/(?<=\.)\s+/).filter(Boolean);
  const heroImage = config.image || images.navratri.hero;
  const secondaryImage = config.secondary_image || images.navratri.heroSecondary;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <CroppedImage src={heroImage} crop={config.image_crop} alt={config.title || config.eyebrow || ""} className={t.festive ? "opacity-55" : "opacity-30"} />
        {t.festive ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#3E0714]/85 via-[#5A1424]/75 to-[#3E0714]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#3E0714] via-transparent to-[#3E0714]/70" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#E8E3D7]/90 via-[#E8E3D7]/80 to-[#E8E3D7]" />
        )}
      </div>

      {t.festive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(circle at 60% 40%, rgba(244,200,66,0.22) 0%, transparent 55%)" }}
        />
      )}
      <div className={`absolute inset-0 mandala-overlay`} style={{ opacity: t.festive ? 0.12 : 0.06 }} />

      <div className="relative container-x py-24 md:py-32 lg:py-40 grid md:grid-cols-2 gap-10 items-center">
        <div className="fade-up text-center md:text-left">
          {config.eyebrow && (
            <div className={`inline-flex items-center gap-2 border ${t.accentBorder} ${t.bg}/60 backdrop-blur-sm px-4 py-1.5 rounded-full`}>
              {t.festive && <Flame size={14} className={t.accent} />}
              <span className={`label-caps ${t.accent} tracking-[0.28em]`}>{config.eyebrow}</span>
            </div>
          )}

          {titleLines.length > 0 && (
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] mt-6 font-normal">
              {titleLines.map((line, i) => (
                <span key={i}>
                  {i === titleLines.length - 1 ? (
                    <em className={`not-italic ${t.accent}`}>{line}</em>
                  ) : (
                    <span className={i === 0 ? t.accent : t.text}>{line}</span>
                  )}
                  {i < titleLines.length - 1 && <br />}
                </span>
              ))}
            </h1>
          )}

          {config.subtitle && (
            <p className={`mt-7 text-base sm:text-lg ${t.textMuted} max-w-lg leading-relaxed font-body font-light md:mx-0 mx-auto`}>
              {config.subtitle}
            </p>
          )}

          {campaign?.countdown_target && (
            <div className="mt-10 flex justify-center md:justify-start">
              <CountdownTimer
                variant={t.festive ? "dark" : "light"}
                target={campaign.countdown_target}
                label={campaign.countdown_label || "Arrives in"}
              />
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            {config.cta_label && (
              <a
                href={config.cta_anchor ? `#${config.cta_anchor}` : "#"}
                data-testid="event-hero-cta"
                className={`inline-flex items-center gap-2 ${t.accentBg} ${t.accentText} px-7 py-4 rounded-sm font-medium text-xs uppercase tracking-[0.24em] hover:opacity-90 transition-opacity`}
              >
                {config.cta_label} <ArrowRight size={14} />
              </a>
            )}
            {config.order_by_note && (
              <div className={`inline-flex items-center gap-2 text-xs ${t.festive ? "bg-[#7E1F35]" : "bg-[#DDD5C4]"} border ${t.accentBorder} px-4 py-3 rounded-sm`}>
                <span className={`w-1.5 h-1.5 rounded-full ${t.accentBg} pulse-dot`} />
                {config.order_by_note}
              </div>
            )}
          </div>
        </div>

        {secondaryImage && (
          <div className="relative hidden md:block fade-up" style={{ animationDelay: "200ms" }}>
            <div className="relative aspect-[3/4] max-w-md mx-auto">
              <div className={`absolute -inset-2 border ${t.accentBorder} rounded-sm`} />
              <div className={`absolute -inset-4 border ${t.accentBorder.replace("/30", "/15").replace("/25", "/12")} rounded-sm`} />
              <CroppedImage src={secondaryImage} crop={config.secondary_image_crop} alt={config.title || config.eyebrow || ""} />
              {t.festive && (
                <>
                  <div
                    className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(244,200,66,0.7) 0%, rgba(244,200,66,0) 70%)" }}
                  />
                  <div
                    className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(244,200,66,0.7) 0%, rgba(244,200,66,0) 70%)" }}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={`relative h-px bg-gradient-to-r from-transparent ${t.festive ? "via-[#F4C842]/60" : "via-[#A0684E]/40"} to-transparent`} />
    </section>
  );
};

export default HeroSection;
