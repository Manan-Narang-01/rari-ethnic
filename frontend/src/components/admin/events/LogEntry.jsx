import { useState } from "react";
import { ChevronDown, PlusCircle, PencilLine, Trash2 } from "lucide-react";

const ACTION_META = {
  created: { label: "Created", icon: PlusCircle, cls: "bg-[#185D64]/15 text-[#185D64]" },
  updated: { label: "Updated", icon: PencilLine, cls: "bg-[#B58D3E]/15 text-[#8A6A1E]" },
  deleted: { label: "Deleted", icon: Trash2, cls: "bg-[#7E1F35]/15 text-[#7E1F35]" },
};

// `sections` (the page-builder's block list) changes as one whole-array
// field even for a one-word edit inside a single block (see campaign_service
// `_diff`), so dumping the raw JSON here was an unreadable wall of nested
// objects for the single most common kind of edit in this admin. A one-line
// summary up front, with the full JSON still available on demand, covers
// both "what changed at a glance" and "show me exactly what changed".
const summarizeArray = (arr) => {
  if (arr.length === 0) return "(empty)";
  if (arr[0] && typeof arr[0] === "object" && "type" in arr[0]) {
    return `${arr.length} section${arr.length > 1 ? "s" : ""}: ${arr.map((s) => s.type).join(", ")}`;
  }
  return `${arr.length} item${arr.length > 1 ? "s" : ""}`;
};

const formatValue = (v) => {
  if (v === null || v === undefined) return <span className="text-[#8B9A9F] italic">empty</span>;
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) {
    return (
      <details>
        <summary className="cursor-pointer text-[#2A2E30] select-none">{summarizeArray(v)}</summary>
        <pre className="text-[11px] bg-[#2A2E30]/5 rounded-sm p-2 mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words">
          {JSON.stringify(v, null, 2)}
        </pre>
      </details>
    );
  }
  if (typeof v === "object") {
    return (
      <pre className="text-[11px] bg-[#2A2E30]/5 rounded-sm p-2 max-h-40 overflow-auto whitespace-pre-wrap break-words">
        {JSON.stringify(v, null, 2)}
      </pre>
    );
  }
  return String(v);
};

export const LogEntry = ({ log, showCampaignName = false }) => {
  const [open, setOpen] = useState(false);
  const meta = ACTION_META[log.action] || ACTION_META.updated;
  const Icon = meta.icon;
  const fields = Object.keys(log.changes || {});

  return (
    <div className="border border-[#8B9A9F]/25 rounded-sm bg-[#DDD5C4]/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={fields.length === 0}
        className="w-full flex items-center gap-3 px-4 py-3 text-left disabled:cursor-default"
      >
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-[11px] uppercase tracking-widest ${meta.cls}`}>
          <Icon size={12} /> {meta.label}
        </span>
        <div className="flex-1 min-w-0">
          {showCampaignName && <span className="font-body text-sm text-[#2A2E30]">{log.campaign_name}</span>}
          <div className="text-xs text-[#6E7B85]">
            {log.actor_name} ({log.actor_email}) ·{" "}
            {new Date(log.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            {fields.length > 0 && ` · ${fields.length} field${fields.length > 1 ? "s" : ""} changed`}
          </div>
        </div>
        {fields.length > 0 && <ChevronDown size={16} className={`text-[#6E7B85] transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && fields.length > 0 && (
        <div className="border-t border-[#8B9A9F]/20 px-4 py-3 space-y-3">
          {fields.map((field) => (
            <div key={field} className="grid md:grid-cols-[120px_1fr_1fr] gap-2 text-xs items-start">
              <div className="font-medium text-[#2A2E30]">{field}</div>
              <div>
                <div className="label-caps text-[10px] text-[#7E1F35]/70 mb-1">Before</div>
                {formatValue(log.changes[field].old)}
              </div>
              <div>
                <div className="label-caps text-[10px] text-[#185D64]/70 mb-1">After</div>
                {formatValue(log.changes[field].new)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LogEntry;
