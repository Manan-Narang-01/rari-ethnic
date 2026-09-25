import { Field } from "@/pages/admin/AdminSettings";

export const RichTextSectionEditor = ({ config, onChange }) => {
  const set = (k, v) => onChange({ ...config, [k]: v });
  return (
    <div className="space-y-5">
      <Field label="Heading (optional)" value={config.heading} onChange={(v) => set("heading", v)} />
      <div>
        <label className="label-caps">Body</label>
        <textarea
          rows={5}
          value={config.body ?? ""}
          onChange={(e) => set("body", e.target.value)}
          placeholder="Separate paragraphs with a blank line."
          className="w-full mt-1 border border-[#8B9A9F]/30 bg-[#E8E3D7]/50 p-2.5 rounded-sm text-sm outline-none focus:border-[#A0684E]"
        />
        <p className="text-xs text-[#6E7B85] mt-1">Plain text only -- no formatting/HTML, rendered as-is to every visitor.</p>
      </div>
    </div>
  );
};

export default RichTextSectionEditor;
