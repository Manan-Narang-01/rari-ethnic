import { Field } from "@/pages/admin/AdminSettings";
import { ImageCropField } from "@/components/admin/ImageCropField";
import { Plus, Trash2 } from "lucide-react";

const emptyImage = () => ({ image: "", image_crop: null, caption: "" });

export const ImageGallerySectionEditor = ({ config, onChange }) => {
  const set = (k, v) => onChange({ ...config, [k]: v });
  const images = config.images || [];

  const addImage = () => set("images", [...images, emptyImage()]);
  const removeImage = (i) => set("images", images.filter((_, idx) => idx !== i));
  const updateImage = (i, patch) => set("images", images.map((img, idx) => (idx === i ? { ...img, ...patch } : img)));

  return (
    <div className="space-y-5">
      <Field label="Heading (optional)" value={config.heading} onChange={(v) => set("heading", v)} />
      <div className="space-y-4">
        {images.map((img, i) => (
          <div key={i} className="border border-[#8B9A9F]/25 rounded-sm p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <ImageCropField
                  label={`Image ${i + 1}`}
                  value={img.image}
                  onChange={(v) => updateImage(i, { image: v })}
                  crop={img.image_crop}
                  onCropChange={(c) => updateImage(i, { image_crop: c })}
                  aspect={1}
                />
                <div className="mt-3">
                  <Field label="Caption (optional)" value={img.caption} onChange={(v) => updateImage(i, { caption: v })} />
                </div>
              </div>
              <button type="button" onClick={() => removeImage(i)} className="p-2 border border-[#8B9A9F]/40 rounded-sm text-[#7E1F35] hover:bg-[#7E1F35]/10">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addImage} className="inline-flex items-center gap-1.5 text-sm text-[#A0684E] hover:text-[#8C4A3B]">
        <Plus size={15} /> Add image
      </button>
    </div>
  );
};

export default ImageGallerySectionEditor;
