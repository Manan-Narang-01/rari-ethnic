import { Field } from "@/pages/admin/AdminSettings";

export const UrgencyBannerSectionEditor = ({ config, onChange }) => {
  const set = (k, v) => onChange({ ...config, [k]: v });
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Heading" value={config.heading} onChange={(v) => set("heading", v)} />
        <Field label="Small label above heading" value={config.subtext} onChange={(v) => set("subtext", v)} />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Button label" value={config.cta_label} onChange={(v) => set("cta_label", v)} />
        <Field label="Button link (e.g. /shop/lehengas)" value={config.cta_link} onChange={(v) => set("cta_link", v)} />
      </div>
    </div>
  );
};

export default UrgencyBannerSectionEditor;
