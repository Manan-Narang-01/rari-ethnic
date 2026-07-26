import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSite } from "@/context/SiteContext";

const CartContext = createContext(null);

const STORAGE_KEY = "rari_cart_v1";

export const CartProvider = ({ children }) => {
  const { settings } = useSite();
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, size, quantity = 1) => {
    setItems((prev) => {
      const key = `${product.id}_${size || "one"}`;
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + quantity } : i
        );
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
          quantity,
          shipping_enabled: product.shipping_enabled || false,
          shipping_charge: product.shipping_charge || 0,
        },
      ];
    });
    setIsOpen(true);
  };

  const removeItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));

  const updateQty = (key, quantity) => {
    if (quantity < 1) return removeItem(key);
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity } : i)));
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
  const threshold = settings?.free_shipping_threshold ?? 2000;
  const fee = settings?.shipping_fee ?? 99;
  // A shipping-enabled product's own charge replaces the free-shipping-threshold
  // rule for the whole order (see backend OrderService, which is authoritative —
  // this mirrors it purely so the customer sees the real total before checkout).
  const shippingSurchargeItems = items.filter((i) => i.shipping_enabled);
  const hasShippingSurcharge = shippingSurchargeItems.length > 0;
  const shipping = hasShippingSurcharge
    ? shippingSurchargeItems.reduce((s, i) => s + i.shipping_charge * i.quantity, 0)
    : subtotal >= threshold || subtotal === 0
    ? 0
    : fee;
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
