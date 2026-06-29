import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart') || '[]');
    } catch {
      return [];
    }
  });

  const persist = useCallback((cart) => {
    localStorage.setItem('cart', JSON.stringify(cart));
    setItems(cart);
  }, []);

  const addItem = (product, variant, quantity = 1) => {
    const existing = items.find(
      (i) => i.productId === product._id && i.variantId === variant._id
    );
    let updated;
    if (existing) {
      updated = items.map((i) =>
        i.productId === product._id && i.variantId === variant._id
          ? { ...i, quantity: i.quantity + quantity }
          : i
      );
    } else {
      updated = [
        ...items,
        {
          productId: product._id,
          variantId: variant._id,
          productName: product.name,
          quality: variant.quality,
          price: variant.price,
          unit: variant.unit,
          quantity,
        },
      ];
    }
    persist(updated);
  };

  const removeItem = (productId, variantId) => {
    persist(items.filter((i) => !(i.productId === productId && i.variantId === variantId)));
  };

  const updateQuantity = (productId, variantId, quantity) => {
    if (quantity <= 0) return removeItem(productId, variantId);
    persist(
      items.map((i) =>
        i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i
      )
    );
  };

  const clearCart = () => persist([]);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
