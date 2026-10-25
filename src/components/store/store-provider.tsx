"use client";

import { MotionConfig } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  variantId: string | null;
  variantOptions: Record<string, string> | null;
  slug: string;
  titleFa: string;
  titleEn: string;
  image: string | null;
  priceMinor: number | null;
  currency: string | null;
  quantity: number;
};

type StoreState = {
  cart: CartItem[];
  wishlist: string[];
  hydrated: boolean;
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  removeFromCart: (productId: string, variantId: string | null) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
};

const StoreContext = createContext<StoreState | null>(null);
const CART_KEY = "sensi-cart-v1";
const WISHLIST_KEY = "sensi-wishlist-v1";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedCart = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartItem[];
      const savedWishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]") as string[];
      setCart(Array.isArray(savedCart) ? savedCart.filter((item) => item && typeof item.productId === "string" && Number.isInteger(item.quantity)).map((item) => ({ ...item, variantId: item.variantId ?? null, variantOptions: item.variantOptions ?? null })) : []);
      setWishlist(Array.isArray(savedWishlist) ? savedWishlist.filter((id) => typeof id === "string") : []);
    } catch {
      setCart([]);
      setWishlist([]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist, hydrated]);

  const addToCart = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setCart((current) => {
      const found = current.find((entry) => entry.productId === item.productId && entry.variantId === item.variantId);
      if (found) return current.map((entry) => entry.productId === item.productId && entry.variantId === item.variantId ? { ...entry, quantity: Math.min(99, entry.quantity + quantity) } : entry);
      return [...current, { ...item, quantity: Math.max(1, Math.min(99, quantity)) }];
    });
  }, []);
  const setQuantity = useCallback((productId: string, variantId: string | null, quantity: number) => {
    setCart((current) => quantity <= 0 ? current.filter((entry) => !(entry.productId === productId && entry.variantId === variantId)) : current.map((entry) => entry.productId === productId && entry.variantId === variantId ? { ...entry, quantity: Math.min(99, Math.floor(quantity)) } : entry));
  }, []);
  const removeFromCart = useCallback((productId: string, variantId: string | null) => setCart((current) => current.filter((entry) => !(entry.productId === productId && entry.variantId === variantId))), []);
  const clearCart = useCallback(() => setCart([]), []);
  const toggleWishlist = useCallback((productId: string) => setWishlist((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]), []);

  const value = useMemo(() => ({ cart, wishlist, hydrated, addToCart, setQuantity, removeFromCart, clearCart, toggleWishlist }), [cart, wishlist, hydrated, addToCart, setQuantity, removeFromCart, clearCart, toggleWishlist]);
  return <StoreContext.Provider value={value}><MotionConfig reducedMotion="user">{children}</MotionConfig></StoreContext.Provider>;
}

export function useStore() {
  const state = useContext(StoreContext);
  if (!state) throw new Error("useStore must be used within StoreProvider");
  return state;
}
