import { Field } from "@/pages/admin/AdminSettings";

export const ProductGridSectionEditor = ({ config, onChange }) => {
  const set = (k, v) => onChange({ ...config, [k]: v });
  const filter = config.filter || {};
  const setFilter = (k, v) => set("filter", { ...filter, [k]: v });

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Heading" value={config.heading} onChange={(v) => set("heading", v)} />
        <Field label="Subheading (small label above heading)" value={config.subheading} onChange={(v) => set("subheading", v)} />
      </div>

      <div>
        <label className="label-caps">Which products show here</label>
        <div className="flex flex-wrap gap-4 mt-2">
          {[
            ["is_bestseller", "Bestsellers"],
            ["is_new", "New arrivals"],
            ["is_navratri", "Navratri-tagged"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={!!filter[key]}
                onChange={(e) => setFilter(key, e.target.checked || undefined)}
                className="accent-[#A0684E] w-4 h-4"
              />
              {label}
            </label>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-5 mt-4">
          <Field
            label="Merchandising tag (matches a product's 'Edit tag', e.g. Garba Ready)"
            value={filter.edit_tag}
            onChange={(v) => setFilter("edit_tag", v || undefined)}
          />
          <Field label="Category key (e.g. kurtis)" value={filter.category} onChange={(v) => setFilter("category", v || undefined)} />
        </div>
        <p className="text-xs text-[#6E7B85] mt-2">Combine filters to narrow the grid; leave all blank to show every active product.</p>
      </div>

      <Field
        label="Message to show when no products match (leave blank to hide the whole section instead)"
        value={config.empty_state_message}
        onChange={(v) => set("empty_state_message", v)}
      />
    </div>
  );
};

export default ProductGridSectionEditor;
