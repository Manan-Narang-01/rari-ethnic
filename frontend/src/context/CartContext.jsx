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
  const shipping = subtotal >= 2000 || subtotal === 0 ? 0 : 99;
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
