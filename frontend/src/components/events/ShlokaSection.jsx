import { eventTheme } from "./theme";

export const ShlokaSection = ({ config, theme }) => {
  const t = eventTheme(theme);
  if (!config.quote) return null;

  return (
    <section className={`relative py-8 border-b ${t.divider}`}>
      <div className="container-x text-center">
        <div className={`font-display italic ${t.accent}/90 text-lg sm:text-xl`}>"{config.quote}"</div>
        {config.translation && (
          <div className={`text-xs ${t.textMuted} mt-2 tracking-widest uppercase`}>{config.translation}</div>
        )}
      </div>
    </section>
  );
};

export default ShlokaSection;
