import { eventTheme } from "./theme";

const BadgeLayout = ({ items, t }) => (
  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
    {items.map((d, i) => (
      <div key={i} data-testid={`nav-day-${d.order}`} className="text-center group cursor-default fade-up" style={{ animationDelay: `${i * 40}ms` }}>
        <div
          className={`aspect-square rounded-full mx-auto transition-transform duration-500 group-hover:scale-105 shadow-[0_10px_30px_-8px_rgba(244,200,66,0.4)] border-2 ${t.accentBorder}`}
          style={{ backgroundColor: d.color || "#A0684E" }}
        />
        {d.order ? <div className={`font-display text-lg mt-3 ${t.accent}`}>Day {d.order}</div> : null}
        {d.title && <div className={`text-[11px] ${t.text}/80 mt-0.5`}>{d.title}</div>}
        {d.description && <div className={`text-[10px] ${t.textMuted} italic hidden md:block mt-1`}>{d.description}</div>}
      </div>
    ))}
  </div>
);

const ListLayout = ({ items, t }) => (
  <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
    {items.map((it, i) => (
      <div key={i} className={`flex items-start gap-4 border ${t.accentBorder} rounded-sm p-4 fade-up`} style={{ animationDelay: `${i * 40}ms` }}>
        {it.color && <span className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: it.color }} />}
        <div>
          <div className={`font-display text-lg ${t.text}`}>{it.title}</div>
          {it.subtitle && <div className={`text-xs ${t.accent} mt-0.5`}>{it.subtitle}</div>}
          {it.description && <div className={`text-sm ${t.textMuted} mt-1`}>{it.description}</div>}
        </div>
      </div>
    ))}
  </div>
);

export const AttributeGridSection = ({ config, theme }) => {
  const t = eventTheme(theme);
  const items = config.items || [];
  if (items.length === 0) return null;

  return (
    <section className={`relative py-20 border-t ${t.divider}`}>
      <div className="mandala-overlay" style={{ opacity: t.festive ? 0.06 : 0.03 }} />
      <div className="container-x relative">
        {(config.heading || config.subheading) && (
          <div className="text-center mb-14">
            {config.heading && <h2 className="font-display text-4xl sm:text-5xl mt-3">{config.heading}</h2>}
            {config.subheading && <p className={`${t.textMuted} mt-3 max-w-lg mx-auto`}>{config.subheading}</p>}
          </div>
        )}
        {config.layout === "list" ? <ListLayout items={items} t={t} /> : <BadgeLayout items={items} t={t} />}
      </div>
    </section>
  );
};

export default AttributeGridSection;
