import { CountdownTimer } from "@/components/CountdownTimer";
import { eventTheme } from "./theme";

export const CountdownSection = ({ config, theme, campaign }) => {
  const t = eventTheme(theme);
  if (!campaign?.countdown_target) return null;
  const variant = config.variant || (t.festive ? "dark" : "light");

  return (
    <section className={`relative py-14 border-b ${t.divider} ${variant === "dark" ? "bg-[#2A2E30]" : ""}`}>
      <div className="container-x flex justify-center">
        <CountdownTimer
          variant={variant}
          target={campaign.countdown_target}
          label={campaign.countdown_label || "Arrives in"}
        />
      </div>
    </section>
  );
};

export default CountdownSection;
