import { Field } from "@/pages/admin/AdminSettings";
import { ImageCropField } from "@/components/admin/ImageCropField";

export const HeroSectionEditor = ({ config, onChange }) => {
  const set = (k, v) => onChange({ ...config, [k]: v });
  return (
    <div className="space-y-5">
      <Field label="Eyebrow" value={config.eyebrow} onChange={(v) => set("eyebrow", v)} />
      <Field label="Title (sentences split into lines automatically)" textarea value={config.title} onChange={(v) => set("title", v)} />
      <Field label="Subtitle" textarea value={config.subtitle} onChange={(v) => set("subtitle", v)} />
      <div className="grid md:grid-cols-2 gap-5">
        <ImageCropField
          label="Background image"
          value={config.image}
          onChange={(v) => set("image", v)}
          crop={config.image_crop}
          onCropChange={(c) => set("image_crop", c)}
          aspect={16 / 9}
        />
        <ImageCropField
          label="Secondary image (portrait, optional)"
          value={config.secondary_image}
          onChange={(v) => set("secondary_image", v)}
          crop={config.secondary_image_crop}
          onCropChange={(c) => set("secondary_image_crop", c)}
          aspect={3 / 4}
        />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="CTA button label" value={config.cta_label} onChange={(v) => set("cta_label", v)} />
        <div>
          <label className="label-caps">CTA target</label>
          <p className="text-xs text-[#6E7B85] mt-1">
            Scrolls down to this page's first Product Grid section (leave the default "navratri-drop" unless you know what you're changing).
          </p>
          <input
            value={config.cta_anchor ?? ""}
            onChange={(e) => set("cta_anchor", e.target.value)}
            className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]"
          />
        </div>
      </div>
      <Field label="Urgency note (e.g. Order by Sep 20…)" value={config.order_by_note} onChange={(v) => set("order_by_note", v)} />
    </div>
  );
};

export default HeroSectionEditor;
