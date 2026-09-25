import { Field } from "@/pages/admin/AdminSettings";
import { Plus, Trash2 } from "lucide-react";

const emptyItem = () => ({ order: 0, title: "", subtitle: "", description: "", color: "" });

export const AttributeGridSectionEditor = ({ config, onChange }) => {
  const set = (k, v) => onChange({ ...config, [k]: v });
  const items = config.items || [];

  const addItem = () => set("items", [...items, emptyItem()]);
  const removeItem = (i) => set("items", items.filter((_, idx) => idx !== i));
  const updateItem = (i, patch) => set("items", items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Heading" value={config.heading} onChange={(v) => set("heading", v)} />
        <Field label="Subheading" value={config.subheading} onChange={(v) => set("subheading", v)} />
      </div>
      <div>
        <label className="label-caps">Layout</label>
        <select
          value={config.layout || "badges"}
          onChange={(e) => set("layout", e.target.value)}
          className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]"
        >
          <option value="badges">Circular badges (e.g. day colours)</option>
          <option value="list">List (e.g. schedule, offers)</option>
        </select>
      </div>

      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex items-end gap-3 mb-3 flex-wrap bg-[#E8E3D7]/40 p-3 rounded-sm">
            <div className="w-16">
              <label className="label-caps">Order</label>
              <input type="number" value={it.order} onChange={(e) => updateItem(i, { order: parseInt(e.target.value) || 0 })} className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="label-caps">Title</label>
              <input value={it.title} onChange={(e) => updateItem(i, { title: e.target.value })} className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="label-caps">Subtitle</label>
              <input value={it.subtitle} onChange={(e) => updateItem(i, { subtitle: e.target.value })} className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="label-caps">Description</label>
              <input value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
            </div>
            <div>
              <label className="label-caps">Colour</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(it.color) ? it.color : "#A0684E"} onChange={(e) => updateItem(i, { color: e.target.value })} className="w-9 h-9 border border-[#8B9A9F]/40 rounded-sm bg-transparent" />
                <input value={it.color || ""} onChange={(e) => updateItem(i, { color: e.target.value })} className="w-24 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]" />
              </div>
            </div>
            <button type="button" onClick={() => removeItem(i)} className="p-2 border border-[#8B9A9F]/40 rounded-sm text-[#7E1F35] hover:bg-[#7E1F35]/10">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 text-sm text-[#A0684E] hover:text-[#8C4A3B]">
        <Plus size={15} /> Add item
      </button>
    </div>
  );
};

export default AttributeGridSectionEditor;
