import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { eventTheme } from "./theme";

export const FaqAccordionSection = ({ config, theme }) => {
  const t = eventTheme(theme);
  const items = config.items || [];
  const [open, setOpen] = useState(null);
  if (items.length === 0) return null;

  return (
    <section className={`container-x py-16 border-t ${t.divider}`}>
      <div className="max-w-2xl mx-auto">
        {config.heading && <h2 className="font-display text-3xl sm:text-4xl text-center mb-10">{config.heading}</h2>}
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className={`border ${t.accentBorder} rounded-sm overflow-hidden`}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                data-testid={`faq-toggle-${i}`}
                className="w-full flex items-center justify-between gap-3 text-left px-5 py-4"
              >
                <span className="font-display text-lg">{it.question}</span>
                <ChevronDown size={16} className={`shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className={`px-5 pb-4 text-sm ${t.textMuted} leading-relaxed`}>{it.answer}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqAccordionSection;
