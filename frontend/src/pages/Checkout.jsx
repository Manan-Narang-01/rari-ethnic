import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { api, formatINR } from "@/lib/api";
import { Check, ChevronLeft, Truck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const STEPS = ["Contact", "Address", "Payment"];

export const Checkout = () => {
  const { items, subtotal, shipping, total, clear } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    email: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    notes: "",
    payment_method: "COD",
  });

  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validateStep = () => {
    if (step === 0) {
      if (!form.customer_name || !form.email || !form.phone) {
        toast.error("Please fill contact details");
        return false;
      }
    } else if (step === 1) {
      if (!form.address_line1 || !form.city || !form.state || !form.pincode) {
        toast.error("Please fill address");
        return false;
      }
      if (form.pincode.length !== 6) {
        toast.error("Enter a valid 6-digit PIN code");
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 2));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const placeOrder = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        items: items.map((i) => ({
          product_id: i.product_id,
          slug: i.slug,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          size: i.size,
          image: i.image,
        })),
        subtotal,
        shipping,
        total,
      };
      const res = await api.post("/orders", payload);
      clear();
      navigate(`/order/${res.data.order_number}`);
    } catch (e) {
      toast.error("Could not place order. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-4xl">Your cart is empty</h1>
        <p className="text-[#6B5B55] mt-2">Add some pieces before checkout.</p>
        <Link
          to="/shop/kurtis"
          className="mt-6 inline-flex bg-[#7E1F35] text-[#FAF6F0] px-6 py-3 rounded-sm uppercase tracking-widest text-sm"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF6F0]">
      <div className="container-x py-10">
        <Link to="/" className="text-sm text-[#6B5B55] hover:text-[#7E1F35] inline-flex items-center gap-1">
          <ChevronLeft size={14} /> Continue shopping
        </Link>
        <h1 className="font-display text-4xl mt-4">Checkout</h1>
        <p className="text-sm text-[#6B5B55]">Guest checkout · No account needed</p>

        {/* Stepper */}
        <div className="flex items-center gap-2 mt-8 max-w-md" data-testid="checkout-stepper">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border ${
                  i < step
                    ? "bg-[#7E1F35] text-[#FAF6F0] border-[#7E1F35]"
                    : i === step
                    ? "bg-[#DCA537] text-[#2B211E] border-[#DCA537]"
                    : "bg-[#FAF6F0] text-[#6B5B55] border-[#2B211E]/20"
                }`}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-xs uppercase tracking-widest ${i === step ? "text-[#2B211E]" : "text-[#6B5B55]"}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-[#2B211E]/15" />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-10 mt-10">
          {/* Form */}
          <div className="bg-[#FAF6F0] border border-[#2B211E]/10 rounded-sm p-6 md:p-8">
            {step === 0 && (
              <div className="space-y-5" data-testid="step-contact">
                <h3 className="font-display text-2xl">Your contact details</h3>
                <Field label="Full name" value={form.customer_name} onChange={setField("customer_name")} testid="checkout-name" />
                <Field label="Email" type="email" value={form.email} onChange={setField("email")} testid="checkout-email" />
                <Field label="Phone (WhatsApp preferred)" type="tel" value={form.phone} onChange={setField("phone")} testid="checkout-phone" />
              </div>
            )}
            {step === 1 && (
              <div className="space-y-5" data-testid="step-address">
                <h3 className="font-display text-2xl">Delivery address</h3>
                <Field label="Address line 1" value={form.address_line1} onChange={setField("address_line1")} testid="checkout-address1" />
                <Field label="Address line 2 (optional)" value={form.address_line2} onChange={setField("address_line2")} testid="checkout-address2" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="City" value={form.city} onChange={setField("city")} testid="checkout-city" />
                  <Field label="State" value={form.state} onChange={setField("state")} testid="checkout-state" />
                </div>
                <Field label="PIN code" value={form.pincode} onChange={setField("pincode")} testid="checkout-pincode" />
                <div>
                  <label className="label-caps text-[#2B211E]">Order notes (optional)</label>
                  <textarea
                    data-testid="checkout-notes"
                    rows={2}
                    value={form.notes}
                    onChange={setField("notes")}
                    placeholder="Any delivery instructions or custom requests..."
                    className="w-full mt-1 border border-[#2B211E]/20 bg-transparent p-3 outline-none focus:border-[#7E1F35] rounded-sm text-sm"
                  />
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5" data-testid="step-payment">
                <h3 className="font-display text-2xl">Payment method</h3>
                <label
                  className="flex items-start gap-4 p-5 border-2 border-[#7E1F35] rounded-sm bg-[#7E1F35]/5 cursor-pointer"
                  data-testid="payment-cod"
                >
                  <input type="radio" checked readOnly className="mt-1 accent-[#7E1F35]" />
                  <div>
                    <div className="font-display text-xl">Cash on Delivery</div>
                    <p className="text-sm text-[#6B5B55] mt-1">
                      Pay when the piece arrives at your door. Available across India.
                    </p>
                  </div>
                </label>
                <div className="flex items-start gap-4 p-5 border border-[#2B211E]/15 rounded-sm opacity-60">
                  <input type="radio" disabled className="mt-1" />
                  <div>
                    <div className="font-display text-xl">UPI / Cards / Wallets</div>
                    <p className="text-sm text-[#6B5B55] mt-1">Coming soon — for now, please use COD.</p>
                  </div>
                </div>
                <div className="bg-[#F3EDE4] p-4 rounded-sm text-sm text-[#2B211E]/80 leading-relaxed">
                  By placing this order you agree to Rari Ethnic's shipping and
                  exchange policy. Delivery in 4–7 days. You will receive a
                  WhatsApp update once dispatched.
                </div>
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-[#2B211E]/10">
              {step > 0 ? (
                <button
                  onClick={back}
                  data-testid="checkout-back"
                  className="px-5 py-3 border border-[#2B211E]/20 rounded-sm text-sm uppercase tracking-widest hover:bg-[#F3EDE4]"
                >
                  Back
                </button>
              ) : <span />}
              {step < 2 ? (
                <button
                  onClick={next}
                  data-testid="checkout-next"
                  className="px-6 py-3 bg-[#2B211E] text-[#FAF6F0] rounded-sm text-sm uppercase tracking-widest hover:bg-[#7E1F35] transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={placeOrder}
                  disabled={submitting}
                  data-testid="checkout-place-order"
                  className="px-6 py-3 bg-[#7E1F35] text-[#FAF6F0] rounded-sm text-sm uppercase tracking-widest hover:bg-[#631728] disabled:opacity-60"
                >
                  {submitting ? "Placing..." : `Place order · ${formatINR(total)}`}
                </button>
              )}
            </div>
          </div>

          {/* Summary */}
          <aside className="bg-[#F3EDE4]/50 border border-[#2B211E]/10 rounded-sm p-6 h-fit sticky top-24">
            <h3 className="font-display text-2xl">Order summary</h3>
            <div className="mt-4 space-y-4 max-h-72 overflow-y-auto pr-2">
              {items.map((it) => (
                <div key={it.key} className="flex gap-3">
                  <img src={it.image} alt="" className="w-14 h-16 object-cover bg-[#F3EDE4]" />
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-sm text-[#2B211E]">{it.name}</div>
                    <div className="text-xs text-[#6B5B55] mt-0.5">
                      {it.size && `${it.size} · `}Qty {it.quantity}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {formatINR(it.price * it.quantity)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-5 border-t border-[#2B211E]/10 space-y-2 text-sm">
              <Row label="Subtotal" value={formatINR(subtotal)} />
              <Row label="Shipping" value={shipping === 0 ? "Free" : formatINR(shipping)} />
              <div className="pt-3 mt-2 border-t border-[#2B211E]/10 flex justify-between">
                <span className="font-display text-lg">Total</span>
                <span data-testid="checkout-total" className="font-display text-lg text-[#7E1F35]">
                  {formatINR(total)}
                </span>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-[#2B211E]/10 space-y-2 text-xs text-[#6B5B55]">
              <div className="flex items-center gap-2"><Truck size={14} className="text-[#7E1F35]" /> Pan-India delivery in 4-7 days</div>
              <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-[#7E1F35]" /> COD available · No hidden charges</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text", testid }) => (
  <div>
    <label className="label-caps text-[#2B211E]">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      data-testid={testid}
      className="w-full mt-1 border-b border-[#2B211E]/25 bg-transparent py-2 outline-none focus:border-[#7E1F35]"
    />
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-[#6B5B55]">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default Checkout;
