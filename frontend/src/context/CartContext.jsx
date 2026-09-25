import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "rari_cart_v1";

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (e) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    // A private/incognito window (Safari especially) or a full storage quota
    // can make setItem throw synchronously -- uncaught, that would blow up
    // the render commit on every single cart mutation (add/remove/qty
    // change), since this effect re-runs on every `items` change.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      /* ignore -- cart still works for the rest of this session, it just
         won't survive a reload */
    }
  }, [items]);

  // Stock is cached on the cart line at add-time (like price/name/image
  // already were) so quantity can be capped without an extra API round-trip.
  // It's a snapshot, not a live guarantee -- POST /api/orders re-validates
  // and atomically decrements real stock server-side (see OrderService),
  // which is the actual authoritative check; this is just to stop the UI
  // from letting someone dial in an obviously-oversold quantity.
  const addItem = (product, size, quantity = 1) => {
    const stock = typeof product.stock === "number" ? product.stock : Infinity;
    let capped = false;
    let addedQuantity = quantity;
    setItems((prev) => {
      const key = `${product.id}_${size || "one"}`;
      const existing = prev.find((i) => i.key === key);
      const currentQty = existing ? existing.quantity : 0;
      const nextQty = Math.min(currentQty + quantity, stock);
      addedQuantity = nextQty - currentQty;
      capped = nextQty < currentQty + quantity;
      if (nextQty <= 0) return prev; // already at/over stock -- nothing to add
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: nextQty, stock } : i));
      }
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.images?.[0],
          size: size || null,
          quantity: nextQty,
          stock,
          shipping_enabled: product.shipping_enabled || false,
          shipping_charge: product.shipping_charge || 0,
        },
      ];
    });
    setIsOpen(true);
    return { addedQuantity, capped };
  };

  const removeItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));

  const updateQty = (key, quantity) => {
    if (quantity < 1) return removeItem(key);
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(quantity, i.stock ?? Infinity) } : i))
    );
  };

  const clear = () => setItems([]);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items]
  );
  const count = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items]
  );
  // Shipping is opt-in per product (see backend OrderService, which is
  // authoritative — this mirrors it purely so the customer sees the real
  // total before checkout). No shipping-enabled items means free shipping.
  const shippingSurchargeItems = items.filter((i) => i.shipping_enabled);
  const hasShippingSurcharge = shippingSurchargeItems.length > 0;
  const shipping = hasShippingSurcharge
    ? shippingSurchargeItems.reduce((s, i) => s + i.shipping_charge * i.quantity, 0)
    : 0;
  const total = subtotal + shipping;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        clear,
        subtotal,
        shipping,
        hasShippingSurcharge,
        total,
        count,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
};
