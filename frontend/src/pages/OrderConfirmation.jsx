import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, buildWaLink, formatINR } from "@/lib/api";
import { CheckCircle2, MessageCircle } from "lucide-react";

export const OrderConfirmation = () => {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.get(`/orders/${orderNumber}`).then((r) => setOrder(r.data)).catch(() => {});
  }, [orderNumber]);

  if (!order) {
    return (
      <div className="container-x py-24 text-center">
        <p className="text-[#6E7B85]">Loading your order...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#E8E3D7]">
      <div className="container-x py-16 max-w-2xl">
        <div className="text-center fade-up">
          <div className="inline-flex w-16 h-16 rounded-full bg-[#B58D3E]/20 items-center justify-center">
            <CheckCircle2 size={32} className="text-[#A0684E]" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl mt-5" data-testid="order-confirmed-title">
            Order confirmed
          </h1>
          <p className="text-[#6E7B85] mt-3 max-w-md mx-auto">
            Thank you, {order.customer_name.split(" ")[0]}. We'll pack your pieces
            with care and send a WhatsApp update the moment it dispatches.
          </p>
          <div className="mt-6 inline-block bg-[#DDD5C4] px-4 py-2 rounded-sm">
            <span className="label-caps text-[#6E7B85]">Order number</span>
            <div data-testid="order-number" className="font-display text-2xl text-[#A0684E]">
              {order.order_number}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-10 bg-[#E8E3D7] border border-[#2A2E30]/10 rounded-sm p-6">
          <h3 className="font-display text-2xl">What you ordered</h3>
          <div className="mt-4 space-y-4">
            {order.items.map((it, i) => (
              <div key={i} className="flex gap-3">
                <img src={it.image} alt="" className="w-16 h-20 object-cover bg-[#DDD5C4]" />
                <div className="flex-1">
                  <div className="font-body">{it.name}</div>
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
            <Row label="Subtotal" value={formatINR(order.subtotal)} />
            <Row label="Shipping" value={order.shipping === 0 ? "Free" : formatINR(order.shipping)} />
            <div className="pt-3 mt-2 border-t border-[#2A2E30]/10 flex justify-between">
              <span className="font-display text-lg">Total ({order.payment_method})</span>
              <span className="font-display text-lg text-[#A0684E]">{formatINR(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Delivery */}
        <div className="mt-6 bg-[#A0684E]/6 border border-[#A0684E]/20 rounded-sm p-6">
          <span className="label-caps text-[#A0684E]">Delivery to</span>
          <div className="mt-2 font-body">
            <div className="font-medium">{order.customer_name}</div>
            <div className="text-sm text-[#2A2E30]/85 mt-1">
              {order.address_line1}
              {order.address_line2 && `, ${order.address_line2}`}
              <br />
              {order.city}, {order.state} — {order.pincode}
              <br />
              {order.phone}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <a
            href={buildWaLink(`Hi Rari Ethnic! I just placed order ${order.order_number}. When will it dispatch?`)}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="order-whatsapp"
            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white py-3.5 rounded-sm text-sm uppercase tracking-widest hover:bg-[#20b055]"
          >
            <MessageCircle size={16} /> Chat about this order
          </a>
          <Link
            to="/shop/kurtis"
            className="flex-1 text-center border border-[#2A2E30]/20 py-3.5 rounded-sm text-sm uppercase tracking-widest hover:bg-[#2A2E30] hover:text-[#E8E3D7] transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-[#6E7B85]">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default OrderConfirmation;
