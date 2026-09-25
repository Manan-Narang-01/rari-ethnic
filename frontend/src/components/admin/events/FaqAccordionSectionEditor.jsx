import { Field } from "@/pages/admin/AdminSettings";
import { Plus, Trash2 } from "lucide-react";

const emptyItem = () => ({ question: "", answer: "" });

export const FaqAccordionSectionEditor = ({ config, onChange }) => {
  const set = (k, v) => onChange({ ...config, [k]: v });
  const items = config.items || [];

  const addItem = () => set("items", [...items, emptyItem()]);
  const removeItem = (i) => set("items", items.filter((_, idx) => idx !== i));
  const updateItem = (i, patch) => set("items", items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  return (
    <div className="space-y-5">
      <Field label="Heading (optional)" value={config.heading} onChange={(v) => set("heading", v)} />
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="border border-[#8B9A9F]/25 rounded-sm p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <Field label="Question" value={it.question} onChange={(v) => updateItem(i, { question: v })} />
              </div>
              <button type="button" onClick={() => removeItem(i)} className="mt-6 p-2 border border-[#8B9A9F]/40 rounded-sm text-[#7E1F35] hover:bg-[#7E1F35]/10">
                <Trash2 size={15} />
              </button>
            </div>
            <Field label="Answer" textarea value={it.answer} onChange={(v) => updateItem(i, { answer: v })} />
          </div>
        ))}
      </div>
      <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 text-sm text-[#A0684E] hover:text-[#8C4A3B]">
        <Plus size={15} /> Add question
      </button>
    </div>
  );
};

export default FaqAccordionSectionEditor;
