import { useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, ChevronDown, Trash2, Plus, Eye, EyeOff, Image, Clock, Quote,
  LayoutGrid, CircleDot, AlertTriangle, Type, Images, HelpCircle, X,
} from "lucide-react";
import { SECTION_TYPES, SECTION_TYPE_MAP } from "@/constants/eventSections";
import { SectionEditor } from "./SectionEditor";

const TYPE_ICONS = {
  hero: Image, countdown: Clock, shloka: Quote, product_grid: LayoutGrid,
  attribute_grid: CircleDot, urgency_banner: AlertTriangle, rich_text: Type,
  image_gallery: Images, faq_accordion: HelpCircle,
};

let _seq = 0;
const newSectionId = () => `sec-${Date.now()}-${_seq++}`;

const SortableSectionCard = ({ section, open, onToggleOpen, onToggleEnabled, onRemove, onChange }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const meta = SECTION_TYPE_MAP[section.type];
  const Icon = TYPE_ICONS[section.type] || LayoutGrid;

  return (
    <div ref={setNodeRef} style={style} className={`border rounded-sm bg-[#DDD5C4]/40 ${section.enabled === false ? "border-[#8B9A9F]/20 opacity-60" : "border-[#8B9A9F]/25"}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-[#8B9A9F] hover:text-[#2A2E30] touch-none" aria-label="Drag to reorder">
          <GripVertical size={16} />
        </button>
        <Icon size={16} className="text-[#A0684E] shrink-0" />
        <button type="button" onClick={onToggleOpen} className="flex-1 min-w-0 flex items-center gap-2 text-left">
          <span className="font-body text-sm text-[#2A2E30]">{meta?.label || section.type}</span>
          {section.config?.heading && <span className="text-xs text-[#6E7B85] truncate">— {section.config.heading}</span>}
        </button>
        <button type="button" onClick={onToggleEnabled} title={section.enabled === false ? "Hidden — click to show" : "Visible — click to hide"} className="p-1.5 text-[#6E7B85] hover:text-[#2A2E30]">
          {section.enabled === false ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
        <button type="button" onClick={onRemove} className="p-1.5 text-[#7E1F35] hover:bg-[#7E1F35]/10 rounded-sm" aria-label="Delete section">
          <Trash2 size={15} />
        </button>
        <button type="button" onClick={onToggleOpen} className="p-1.5 text-[#6E7B85]" aria-label="Expand">
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="px-4 pb-5 pt-1 border-t border-[#8B9A9F]/20">
          <SectionEditor section={section} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

export const SectionBuilder = ({ sections, onChange }) => {
  const [openId, setOpenId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    onChange(arrayMove(sections, oldIndex, newIndex));
  };

  const addSection = (type) => {
    const meta = SECTION_TYPE_MAP[type];
    const section = { id: newSectionId(), type, enabled: true, config: meta.defaultConfig() };
    onChange([...sections, section]);
    setOpenId(section.id);
    setPickerOpen(false);
  };

  const updateSection = (id, updated) => onChange(sections.map((s) => (s.id === id ? updated : s)));
  const removeSection = (id) => {
    if (!window.confirm("Remove this section? This can't be undone until you save, but you can undo by reloading before saving.")) return;
    onChange(sections.filter((s) => s.id !== id));
  };
  const toggleEnabled = (id) => onChange(sections.map((s) => (s.id === id ? { ...s, enabled: s.enabled === false } : s)));

  return (
    <div>
      <p className="text-xs text-[#6E7B85] mb-4">
        This is the page builder for the event's public page. Add sections, drag the handle to reorder them, and use the
        eye icon to hide a section without deleting it.
      </p>

      {sections.length === 0 ? (
        <div className="border border-dashed border-[#8B9A9F]/40 rounded-sm p-8 text-center text-sm text-[#6E7B85]">
          No sections yet — add one below to start building the page.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sections.map((section) => (
                <SortableSectionCard
                  key={section.id}
                  section={section}
                  open={openId === section.id}
                  onToggleOpen={() => setOpenId(openId === section.id ? null : section.id)}
                  onToggleEnabled={() => toggleEnabled(section.id)}
                  onRemove={() => removeSection(section.id)}
                  onChange={(updated) => updateSection(section.id, updated)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="relative mt-5">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          data-testid="add-section-btn"
          className="inline-flex items-center gap-1.5 text-sm text-[#A0684E] hover:text-[#8C4A3B]"
        >
          <Plus size={15} /> Add section
        </button>
        {pickerOpen && (
          <div className="absolute z-10 mt-2 w-80 max-w-[90vw] bg-[#E8E3D7] border border-[#8B9A9F]/30 rounded-sm shadow-lg p-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="label-caps">Choose a section type</span>
              <button type="button" onClick={() => setPickerOpen(false)} className="text-[#6E7B85] hover:text-[#2A2E30]">
                <X size={14} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {SECTION_TYPES.map((s) => {
                const Icon = TYPE_ICONS[s.type] || LayoutGrid;
                return (
                  <button
                    key={s.type}
                    type="button"
                    onClick={() => addSection(s.type)}
                    data-testid={`add-section-${s.type}`}
                    className="w-full flex items-start gap-3 text-left px-2 py-2.5 rounded-sm hover:bg-[#DDD5C4]"
                  >
                    <Icon size={16} className="text-[#A0684E] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm text-[#2A2E30]">{s.label}</div>
                      <div className="text-xs text-[#6E7B85] mt-0.5">{s.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionBuilder;
