import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { formatINR } from "@/lib/api";

export const CartDrawer = () => {
  const { items, isOpen, setIsOpen, updateQty, removeItem, subtotal, shipping } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const goCheckout = () => {
    setIsOpen(false);
    navigate("/checkout");
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        data-testid="cart-drawer-backdrop"
        className="absolute inset-0 bg-[#2A2E30]/40 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      <aside
        data-testid="cart-drawer"
        className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-[#E8E3D7] shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#2A2E30]/10">
          <h2 className="font-display text-2xl">Your Cart</h2>
          <button
            data-testid="cart-close-button"
            onClick={() => setIsOpen(false)}
            className="p-1 text-[#2A2E30] hover:text-[#A0684E]"
          >
            <X size={22} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <ShoppingBag size={40} className="text-[#6E7B85] mb-3" />
            <p className="font-display text-2xl">Your cart is empty</p>
            <p className="text-sm text-[#6E7B85] mt-1">
              Add pieces you love — we'll keep them safe.
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="mt-6 bg-[#A0684E] text-[#E8E3D7] px-6 py-3 rounded-sm text-sm uppercase tracking-widest hover:bg-[#8C4A3B]"
            >
              Continue browsing
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {items.map((it) => (
                <div key={it.key} className="flex gap-3" data-testid={`cart-item-${it.slug}`}>
                  <Link
                    to={`/product/${it.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="shrink-0"
                  >
                    <img
                      src={it.image}
                      alt={it.name}
                      className="w-20 h-24 object-cover bg-[#DDD5C4]"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${it.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="font-display text-base leading-tight block hover:text-[#A0684E]"
                    >
                      {it.name}
                    </Link>
                    {it.size && (
                      <div className="text-xs text-[#6E7B85] mt-0.5">Size: {it.size}</div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-[#2A2E30]/15">
                        <button
                          onClick={() => updateQty(it.key, it.quantity - 1)}
                          data-testid={`cart-decrease-${it.slug}`}
                          className="w-7 h-7 flex items-center justify-center hover:bg-[#DDD5C4]"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-7 text-center text-sm">{it.quantity}</span>
                        <button
                          onClick={() => updateQty(it.key, it.quantity + 1)}
                          data-testid={`cart-increase-${it.slug}`}
                          className="w-7 h-7 flex items-center justify-center hover:bg-[#DDD5C4]"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="font-medium text-sm">
                        {formatINR(it.price * it.quantity)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeItem(it.key)}
                      data-testid={`cart-remove-${it.slug}`}
                      className="text-xs text-[#6E7B85] hover:text-[#A0684E] mt-1 underline underline-offset-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#2A2E30]/10 px-6 py-5 space-y-2 bg-[#DDD5C4]/40">
              <div className="flex justify-between text-sm">
                <span className="text-[#6E7B85]">Subtotal</span>
                <span data-testid="cart-subtotal" className="font-medium">
                  {formatINR(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6E7B85]">Shipping</span>
                <span className="font-medium">
                  {shipping === 0 ? "Free" : formatINR(shipping)}
                </span>
              </div>
              {subtotal < 2000 && (
                <p className="text-xs text-[#A0684E]">
                  Add {formatINR(2000 - subtotal)} more for free shipping.
                </p>
              )}
              <button
                onClick={goCheckout}
                data-testid="cart-checkout-button"
                className="mt-3 w-full bg-[#A0684E] text-[#E8E3D7] py-3.5 rounded-sm text-sm uppercase tracking-widest hover:bg-[#8C4A3B] transition-colors"
              >
                Checkout · {formatINR(subtotal + shipping)}
              </button>
              <p className="text-[11px] text-center text-[#6E7B85] mt-2">
                Cash on Delivery available · Pan-India
              </p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};
