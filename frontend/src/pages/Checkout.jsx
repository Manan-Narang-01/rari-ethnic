import { useEffect, useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { api, formatINR } from "@/lib/api";
import { Check, ChevronLeft, Truck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const STEPS = ["Contact", "Address", "Payment"];

// Loads Razorpay's checkout widget script once and reuses it on subsequent
// checkouts in the same session, instead of re-injecting the <script> tag.
let razorpayScriptPromise = null;
const loadRazorpayScript = () => {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = resolve;
      script.onerror = () => { razorpayScriptPromise = null; reject(new Error("Could not load Razorpay")); };
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
};

export const Checkout = () => {
  const { items, subtotal, shipping, total, clear } = useCart();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [razorpay, setRazorpay] = useState(null); // { public_key } once loaded, or null if disabled
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

  // Prefill name/email from the signed-in Google account.
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        customer_name: f.customer_name || user.name || "",
        email: f.email || user.email || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    api
      .get("/payment-methods")
      .then((r) => {
        const rzp = r.data.find((m) => m.provider === "razorpay");
        if (rzp?.public_key) setRazorpay(rzp);
      })
      .catch(() => {});
  }, []);

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

  const buildPayload = () => ({
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
  });

  const payWithRazorpay = async (orderNumber) => {
    await loadRazorpayScript();
    const { data: session } = await api.post(`/orders/${orderNumber}/razorpay/create-order`);

    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: session.key_id,
        amount: session.amount,
        currency: session.currency,
        order_id: session.razorpay_order_id,
        name: "Rari Ethnic",
        description: `Order ${orderNumber}`,
        prefill: { name: form.customer_name, email: form.email, contact: form.phone },
        theme: { color: "#A0684E" },
        handler: async (response) => {
          try {
            await api.post(`/orders/${orderNumber}/razorpay/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            resolve();
          } catch (e) {
            reject(new Error("We couldn't confirm your payment. If money was deducted, it'll be refunded — please contact us on WhatsApp with this order number."));
          }
        },
        modal: {
          ondismiss: () => reject(new Error("cancelled")),
        },
      });
      rzp.on("payment.failed", () => reject(new Error("Payment failed. Please try again or use Cash on Delivery.")));
      rzp.open();
    });
  };

  const placeOrder = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const payload = { ...buildPayload(), payment_method: form.payment_method === "razorpay" ? "razorpay" : "COD" };
      const res = await api.post("/orders", payload);
      const orderNumber = res.data.order_number;

      if (form.payment_method === "razorpay") {
        try {
          await payWithRazorpay(orderNumber);
        } catch (e) {
          if (e.message !== "cancelled") toast.error(e.message);
          // Order stays pending_payment either way — customer can retry from their order history.
          setSubmitting(false);
          return;
        }
      }

      clear();
      navigate(`/order/${orderNumber}`);
    } catch (e) {
      toast.error("Could not place order. Try again.");
      setSubmitting(false);
    }
  };

  // Auth gate — must be signed in to check out (browsing stays open).
  if (authLoading) {
    return <div className="container-x py-24 text-center text-[#6E7B85]">Loading…</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login?next=/checkout" replace />;
  }

  if (items.length === 0) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-4xl">Your cart is empty</h1>
        <p className="text-[#6E7B85] mt-2">Add some pieces before checkout.</p>
        <Link
          to="/shop/kurtis"
          className="mt-6 inline-flex bg-[#A0684E] text-[#E8E3D7] px-6 py-3 rounded-sm uppercase tracking-widest text-sm"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#E8E3D7]">
      <div className="container-x py-10">
        <Link to="/" className="text-sm text-[#6E7B85] hover:text-[#A0684E] inline-flex items-center gap-1">
          <ChevronLeft size={14} /> Continue shopping
        </Link>
        <h1 className="font-display text-4xl mt-4">Checkout</h1>

        {/* Stepper */}
        <div className="flex items-center gap-2 mt-8 max-w-md" data-testid="checkout-stepper">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border ${
                  i < step
                    ? "bg-[#A0684E] text-[#E8E3D7] border-[#A0684E]"
                    : i === step
                    ? "bg-[#B58D3E] text-[#2A2E30] border-[#B58D3E]"
                    : "bg-[#E8E3D7] text-[#6E7B85] border-[#2A2E30]/20"
                }`}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-xs uppercase tracking-widest ${i === step ? "text-[#2A2E30]" : "text-[#6E7B85]"}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-[#2A2E30]/15" />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-10 mt-10">
          {/* Form */}
          <div className="bg-[#E8E3D7] border border-[#2A2E30]/10 rounded-sm p-6 md:p-8">
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
                  <label className="label-caps text-[#2A2E30]">Order notes (optional)</label>
                  <textarea
                    data-testid="checkout-notes"
                    rows={2}
                    value={form.notes}
                    onChange={setField("notes")}
                    placeholder="Any delivery instructions or custom requests..."
                    className="w-full mt-1 border border-[#2A2E30]/20 bg-transparent p-3 outline-none focus:border-[#A0684E] rounded-sm text-sm"
                  />
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5" data-testid="step-payment">
                <h3 className="font-display text-2xl">Payment method</h3>
                <label
                  className={`flex items-start gap-4 p-5 border-2 rounded-sm cursor-pointer ${
                    form.payment_method === "COD" ? "border-[#A0684E] bg-[#A0684E]/5" : "border-[#2A2E30]/15"
                  }`}
                  data-testid="payment-cod"
                >
                  <input
                    type="radio"
                    checked={form.payment_method === "COD"}
                    onChange={() => setForm({ ...form, payment_method: "COD" })}
                    className="mt-1 accent-[#A0684E]"
                  />
                  <div>
                    <div className="font-display text-xl">Cash on Delivery</div>
                    <p className="text-sm text-[#6E7B85] mt-1">
                      Pay when the piece arrives at your door. Available across India.
                    </p>
                  </div>
                </label>
                <label
                  className={`flex items-start gap-4 p-5 border-2 rounded-sm ${
                    razorpay ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
                  } ${form.payment_method === "razorpay" ? "border-[#A0684E] bg-[#A0684E]/5" : "border-[#2A2E30]/15"}`}
                  data-testid="payment-razorpay"
                >
                  <input
                    type="radio"
                    disabled={!razorpay}
                    checked={form.payment_method === "razorpay"}
                    onChange={() => setForm({ ...form, payment_method: "razorpay" })}
                    className="mt-1 accent-[#A0684E]"
                  />
                  <div>
                    <div className="font-display text-xl">UPI / Cards / Wallets</div>
                    <p className="text-sm text-[#6E7B85] mt-1">
                      {razorpay ? "Pay securely via Razorpay — UPI, cards, netbanking & wallets." : "Coming soon — for now, please use COD."}
                    </p>
                  </div>
                </label>
                <div className="bg-[#DDD5C4] p-4 rounded-sm text-sm text-[#2A2E30]/80 leading-relaxed">
                  By placing this order you agree to Rari Ethnic's shipping and
                  exchange policy. Delivery in 4–7 days. We do not offer returns
                  or refunds — exchanges only, accepted within 15 days of delivery
                  from your Account page. You will receive a WhatsApp update once
                  dispatched.
                </div>
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-[#2A2E30]/10">
              {step > 0 ? (
                <button
                  onClick={back}
                  data-testid="checkout-back"
                  className="px-5 py-3 border border-[#2A2E30]/20 rounded-sm text-sm uppercase tracking-widest hover:bg-[#DDD5C4]"
                >
                  Back
                </button>
              ) : <span />}
              {step < 2 ? (
                <button
                  onClick={next}
                  data-testid="checkout-next"
                  className="px-6 py-3 bg-[#2A2E30] text-[#E8E3D7] rounded-sm text-sm uppercase tracking-widest hover:bg-[#A0684E] transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={placeOrder}
                  disabled={submitting}
                  data-testid="checkout-place-order"
                  className="px-6 py-3 bg-[#A0684E] text-[#E8E3D7] rounded-sm text-sm uppercase tracking-widest hover:bg-[#8C4A3B] disabled:opacity-60"
                >
                  {submitting ? "Placing..." : `Place order · ${formatINR(total)}`}
                </button>
              )}
            </div>
          </div>

          {/* Summary */}
          <aside className="bg-[#DDD5C4]/50 border border-[#2A2E30]/10 rounded-sm p-6 h-fit sticky top-24">
            <h3 className="font-display text-2xl">Order summary</h3>
            <div className="mt-4 space-y-4 max-h-72 overflow-y-auto pr-2">
              {items.map((it) => (
                <div key={it.key} className="flex gap-3">
                  <img src={it.image} alt="" className="w-14 h-16 object-cover bg-[#DDD5C4]" />
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-sm text-[#2A2E30]">{it.name}</div>
                    <div className="text-xs text-[#6E7B85] mt-0.5">
                      {it.size && `${it.size} · `}Qty {it.quantity}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {formatINR(it.price * it.quantity)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-5 border-t border-[#2A2E30]/10 space-y-2 text-sm">
              <Row label="Subtotal" value={formatINR(subtotal)} />
              <Row label="Shipping" value={shipping === 0 ? "Free" : formatINR(shipping)} />
              <div className="pt-3 mt-2 border-t border-[#2A2E30]/10 flex justify-between">
                <span className="font-display text-lg">Total</span>
                <span data-testid="checkout-total" className="font-display text-lg text-[#A0684E]">
                  {formatINR(total)}
                </span>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-[#2A2E30]/10 space-y-2 text-xs text-[#6E7B85]">
              <div className="flex items-center gap-2"><Truck size={14} className="text-[#A0684E]" /> Pan-India delivery in 4-7 days</div>
              <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-[#A0684E]" /> COD available · No hidden charges</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text", testid }) => (
  <div>
    <label className="label-caps text-[#2A2E30]">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      data-testid={testid}
      className="w-full mt-1 border-b border-[#2A2E30]/25 bg-transparent py-2 outline-none focus:border-[#A0684E]"
    />
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-[#6E7B85]">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default Checkout;
