import { eventTheme } from "./theme";

// Plain-text paragraphs only -- deliberately never dangerouslySetInnerHTML,
// so admin-authored copy can't inject markup into a page every visitor loads.
export const RichTextSection = ({ config, theme }) => {
  const t = eventTheme(theme);
  const paragraphs = (config.body || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0 && !config.heading) return null;

  return (
    <section className={`container-x py-14 border-t ${t.divider}`}>
      <div className="max-w-2xl mx-auto text-center">
        {config.heading && <h2 className="font-display text-3xl sm:text-4xl mb-6">{config.heading}</h2>}
        <div className={`space-y-4 ${t.textMuted} leading-relaxed`}>
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RichTextSection;
