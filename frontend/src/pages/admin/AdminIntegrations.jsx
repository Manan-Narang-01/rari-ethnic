import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { CreditCard, Truck, Mail, Lock, Plus, Trash2, Eye, EyeOff } from "lucide-react";

const CATEGORY_META = {
  payment: { title: "Payment gateways", icon: CreditCard, sub: "Accepted checkout methods and their credentials." },
  shipping: { title: "Shipping & delivery", icon: Truck, sub: "Courier integrations for order fulfilment." },
  email: { title: "Email (SMTP)", icon: Mail, sub: "Used to send OTP codes and order/exchange notification emails." },
};

export const AdminIntegrations = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState(null); // category currently showing the add-provider form

  const load = () => {
    api
      .get("/admin/integrations")
      .then((r) => setIntegrations(r.data))
      .catch(() => toast.error("Failed to load integrations"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggle = async (item) => {
    try {
      await api.put(`/admin/integrations/${item.id}`, { is_enabled: !item.is_enabled });
      toast.success(`${item.label} ${item.is_enabled ? "disabled" : "enabled"}`);
      load();
    } catch {
      toast.error("Could not update");
    }
  };

  const saveCredentials = async (item, values) => {
    try {
      await api.put(`/admin/integrations/${item.id}`, { credentials: values });
      toast.success(`${item.label} credentials updated`);
      load();
    } catch (err) {
      const msg = typeof err?.response?.data?.detail === "string" ? err.response.data.detail : "Save failed";
      toast.error(msg);
    }
  };

  const createProvider = async (category, { label, fields }) => {
    try {
      await api.post("/admin/integrations", { category, label, fields });
      toast.success(`${label} added`);
      setAddingTo(null);
      load();
    } catch (err) {
      const msg = typeof err?.response?.data?.detail === "string" ? err.response.data.detail : "Could not add provider";
      toast.error(msg);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Remove "${item.label}"? This deletes its stored credentials too.`)) return;
    try {
      await api.delete(`/admin/integrations/${item.id}`);
      toast.success(`${item.label} removed`);
      load();
    } catch {
      toast.error("Could not remove");
    }
  };

  if (loading) return <div className="text-[#6E7B85]">Loading…</div>;

  const byCategory = (cat) => integrations.filter((i) => i.category === cat);

  return (
    <div className="max-w-4xl">
      <p className="label-caps">Admin</p>
      <h1 className="font-display text-4xl mt-1">Integrations</h1>
      <p className="text-sm text-[#6E7B85] mt-2 max-w-xl">
        {isSuperAdmin
          ? "Add providers, enable them, and configure credentials below. Changes apply immediately."
          : "View-only — ask a Super Admin to add, change, or remove providers."}
      </p>
      <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#6E7B85]">
        <Lock size={12} /> Credentials are encrypted at rest and never shown in full once saved.
      </div>

      {["payment", "shipping", "email"].map((cat) => {
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;
        return (
          <div key={cat} className="mt-10">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-[#A0684E]" />
                <h2 className="font-display text-2xl">{meta.title}</h2>
              </div>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setAddingTo(addingTo === cat ? null : cat)}
                  data-testid={`add-provider-${cat}`}
                  className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#A0684E] hover:text-[#8C4A3B]"
                >
                  <Plus size={13} /> Add provider
                </button>
              )}
            </div>
            <p className="text-xs text-[#6E7B85] mb-4">{meta.sub}</p>

            {addingTo === cat && (
              <AddProviderForm
                onCancel={() => setAddingTo(null)}
                onCreate={(values) => createProvider(cat, values)}
              />
            )}

            <div className="space-y-3">
              {byCategory(cat).map((item) => (
                <ProviderCard
                  key={item.id}
                  item={item}
                  isSuperAdmin={isSuperAdmin}
                  onToggle={() => toggle(item)}
                  onSave={(values) => saveCredentials(item, values)}
                  onRemove={() => remove(item)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AddProviderForm = ({ onCancel, onCreate }) => {
  const [label, setLabel] = useState("");
  const [fields, setFields] = useState([{ label: "" }]);
  const [saving, setSaving] = useState(false);

  const updateField = (i, value) =>
    setFields((f) => f.map((row, idx) => (idx === i ? { label: value } : row)));
  const addField = () => setFields((f) => [...f, { label: "" }]);
  const removeField = (i) => setFields((f) => f.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    if (!label.trim()) return toast.error("Provider name is required");
    setSaving(true);
    await onCreate({
      label: label.trim(),
      fields: fields.filter((f) => f.label.trim()).map((f) => ({ label: f.label.trim() })),
    });
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="bg-[#DDD5C4]/40 border border-[#A0684E]/30 rounded-sm p-5 mb-3">
      <div>
        <label className="label-caps">Provider name</label>
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. PayU, Ekart, Xpressbees"
          data-testid="new-provider-label"
          className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 text-sm outline-none focus:border-[#A0684E]"
        />
      </div>

      <div className="mt-4">
        <label className="label-caps">Credential fields this provider needs</label>
        <p className="text-xs text-[#6E7B85] mt-1 mb-2">e.g. "API key", "Merchant ID" — leave empty if none (like Cash on Delivery).</p>
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={f.label}
                onChange={(e) => updateField(i, e.target.value)}
                placeholder="Field name"
                className="flex-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 text-sm outline-none focus:border-[#A0684E]"
              />
              <button
                type="button"
                onClick={() => removeField(i)}
                className="p-2 text-[#6E7B85] hover:text-[#7E1F35]"
                aria-label="Remove field"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addField}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#A0684E] hover:text-[#8C4A3B]"
        >
          <Plus size={13} /> Add field
        </button>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          data-testid="create-provider-submit"
          className="px-4 py-2 bg-[#A0684E] text-[#E8E3D7] rounded-sm text-xs uppercase tracking-widest hover:bg-[#8C4A3B] disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add provider"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-[#8B9A9F]/40 rounded-sm text-xs uppercase tracking-widest hover:bg-[#DDD5C4]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const ProviderCard = ({ item, isSuperAdmin, onToggle, onSave, onRemove }) => {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [visibleFields, setVisibleFields] = useState({});

  const toggleVisible = (key) => setVisibleFields((v) => ({ ...v, [key]: !v[key] }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(values);
    setSaving(false);
    setValues({});
    setVisibleFields({});
    setEditing(false);
  };

  return (
    <div className="bg-[#DDD5C4]/40 border border-[#8B9A9F]/20 rounded-sm p-5" data-testid={`integration-${item.provider}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg">{item.label}</span>
          <span
            className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm ${
              item.configured ? "bg-[#185D64]/15 text-[#185D64]" : "bg-[#6E7B85]/15 text-[#6E7B85]"
            }`}
          >
            {item.configured ? "Configured" : "Not configured"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {item.fields.length > 0 && isSuperAdmin && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              data-testid={`integration-edit-${item.provider}`}
              className="text-xs text-[#A0684E] hover:underline underline-offset-2"
            >
              {editing ? "Cancel" : "Edit credentials"}
            </button>
          )}
          <label className={`inline-flex items-center gap-2 ${isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
            <span className="text-xs text-[#6E7B85]">{item.is_enabled ? "Enabled" : "Disabled"}</span>
            <input
              type="checkbox"
              checked={item.is_enabled}
              onChange={isSuperAdmin ? onToggle : undefined}
              disabled={!isSuperAdmin}
              data-testid={`integration-toggle-${item.provider}`}
              className="accent-[#A0684E] w-4 h-4 disabled:cursor-not-allowed"
            />
          </label>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={onRemove}
              data-testid={`integration-remove-${item.provider}`}
              className="p-1.5 text-[#6E7B85] hover:text-[#7E1F35] hover:bg-[#DDD5C4] rounded-sm"
              aria-label={`Remove ${item.label}`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {item.fields.length > 0 && (
        <form onSubmit={submit}>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {item.fields.map((f) => (
              <div key={f.key}>
                <label className="label-caps">{f.label}</label>
                {editing ? (
                  <div className="relative">
                    <input
                      type={visibleFields[f.key] ? "text" : "password"}
                      autoComplete="off"
                      value={values[f.key] || ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      placeholder={item.masked_credentials[f.key] || "Not set"}
                      data-testid={`integration-field-${item.provider}-${f.key}`}
                      className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 pr-8 text-sm outline-none focus:border-[#A0684E]"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisible(f.key)}
                      data-testid={`integration-field-toggle-${item.provider}-${f.key}`}
                      aria-label={visibleFields[f.key] ? "Hide value" : "Show value"}
                      className="absolute right-0 top-1/2 -translate-y-1/2 mt-0.5 p-1 text-[#6E7B85] hover:text-[#A0684E]"
                    >
                      {visibleFields[f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 py-2 text-sm text-[#2A2E30]/70 border-b border-transparent">
                    {item.masked_credentials[f.key] || <span className="text-[#6E7B85]">Not set</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {editing && (
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                data-testid={`integration-save-${item.provider}`}
                className="px-4 py-2 bg-[#A0684E] text-[#E8E3D7] rounded-sm text-xs uppercase tracking-widest hover:bg-[#8C4A3B] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save credentials"}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setValues({}); }}
                className="px-4 py-2 border border-[#8B9A9F]/40 rounded-sm text-xs uppercase tracking-widest hover:bg-[#DDD5C4]"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default AdminIntegrations;
