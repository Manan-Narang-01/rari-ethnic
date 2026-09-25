import { Field } from "@/pages/admin/AdminSettings";

export const ShlokaSectionEditor = ({ config, onChange }) => {
  const set = (k, v) => onChange({ ...config, [k]: v });
  return (
    <div className="space-y-5">
      <Field label="Quote" value={config.quote} onChange={(v) => set("quote", v)} />
      <Field label="Translation / subtitle" value={config.translation} onChange={(v) => set("translation", v)} />
    </div>
  );
};

export default ShlokaSectionEditor;
