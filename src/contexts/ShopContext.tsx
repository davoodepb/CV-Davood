import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  variants: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CustomerCheckoutInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
}

export interface OrderProduct {
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface ShopOrder {
  id: string;
  customer: CustomerCheckoutInfo;
  items: OrderProduct[];
  paymentMethod: "card" | "mbway" | "multibanco";
  paymentStatus: "success" | "failed" | "refunded";
  subtotal: number;
  vat: number;
  shipping: number;
  total: number;
  createdAt: string;
  status: "pending" | "paid" | "shipped" | "delivered";
  trackingCode?: string;
  refundedAt?: string;
}

export interface ShopCategory {
  id: string;
  key: string;
  label: string;
}

const defaultCategories: ShopCategory[] = [
  { id: "cat-1", key: "courses", label: "Courses" },
  { id: "cat-2", key: "games", label: "Games" },
  { id: "cat-3", key: "films", label: "Films" },
  { id: "cat-4", key: "books", label: "Books" },
  { id: "cat-5", key: "video-short", label: "Video Short" },
  { id: "cat-6", key: "strategy-trading", label: "Strategy Trading" },
  { id: "cat-7", key: "holding", label: "Holding" },
  { id: "cat-8", key: "clothes", label: "Clothes" },
];

const defaultProducts: Product[] = [
  {
    id: "p1",
    title: "Complete Web Development Course",
    description: "Learn React, JavaScript, and modern web development from scratch.",
    price: 29.99,
    category: "courses",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop",
    stock: 120,
    variants: ["Standard"],
  },
  {
    id: "p2",
    title: "Pixel Adventure",
    description: "A retro-style platformer game with 50+ levels.",
    price: 9.99,
    category: "games",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=250&fit=crop",
    stock: 80,
    variants: ["Digital"],
  },
  {
    id: "p3",
    title: "The Developer's Journey",
    description: "A documentary about the life of indie developers.",
    price: 7.99,
    category: "films",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=250&fit=crop",
    stock: 60,
    variants: ["HD", "4K"],
  },
  {
    id: "p4",
    title: "Clean Code Handbook",
    description: "Best practices for writing maintainable and scalable code.",
    price: 15.99,
    category: "books",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=250&fit=crop",
    stock: 45,
    variants: ["Paperback", "eBook"],
  },
];

const normalizeProduct = (raw: Partial<Product> & { id: string }): Product => ({
  id: raw.id,
  title: raw.title || "Untitled",
  description: raw.description || "",
  price: Number(raw.price || 0),
  category: raw.category || "courses",
  image: raw.image || "",
  stock: typeof raw.stock === "number" ? raw.stock : 0,
  variants: Array.isArray(raw.variants) ? raw.variants.filter(Boolean) : [],
});

const normalizeOrder = (raw: Partial<ShopOrder> & { id: string }): ShopOrder => ({
  id: raw.id,
  customer: raw.customer || {
    fullName: "Unknown",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
  },
  items: Array.isArray(raw.items) ? raw.items : [],
  paymentMethod: raw.paymentMethod || "card",
  paymentStatus: raw.paymentStatus || "success",
  subtotal: Number(raw.subtotal || 0),
  vat: Number(raw.vat || 0),
  shipping: Number(raw.shipping || 0),
  total: Number(raw.total || 0),
  createdAt: raw.createdAt || new Date().toISOString(),
  status: raw.status || "paid",
  trackingCode: raw.trackingCode,
  refundedAt: raw.refundedAt,
});

interface ShopContextType {
  products: Product[];
  categories: ShopCategory[];
  cart: CartItem[];
  orders: ShopOrder[];
  cartTotal: number;
  cartCount: number;
  loading: boolean;
  addProduct: (p: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (key: string, label: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addToCart: (product: Product) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeLineItem: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  placeOrder: (orderInput: Omit<ShopOrder, "id" | "createdAt" | "status">) => Promise<string>;
  updateOrderStatus: (orderId: string, status: ShopOrder["status"]) => Promise<void>;
  updateOrderTracking: (orderId: string, trackingCode: string) => Promise<void>;
  markOrderRefunded: (orderId: string) => Promise<void>;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(defaultProducts);
  const [categories, setCategories] = useState<ShopCategory[]>(defaultCategories);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("shop-cart");
      return stored ? (JSON.parse(stored) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [orders, setOrders] = useState<ShopOrder[]>(() => {
    try {
      const stored = localStorage.getItem("shop-orders");
      return stored ? (JSON.parse(stored) as ShopOrder[]) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [prodSnap, catSnap, orderSnap] = await Promise.all([
          getDocs(collection(db, "products")),
          getDocs(collection(db, "categories")),
          getDocs(collection(db, "orders")),
        ]);

        if (!prodSnap.empty) {
          setProducts(prodSnap.docs.map((d) => normalizeProduct({ id: d.id, ...(d.data() as Partial<Product>) })));
        }
        if (!catSnap.empty) {
          setCategories(catSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopCategory)));
        }
        if (!orderSnap.empty) {
          const loadedOrders = orderSnap.docs
            .map((d) => normalizeOrder({ id: d.id, ...(d.data() as Partial<ShopOrder>) }))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setOrders(loadedOrders);
        }
      } catch {
        console.log("Using default shop data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    localStorage.setItem("shop-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("shop-orders", JSON.stringify(orders));
  }, [orders]);

  const addProduct = async (p: Omit<Product, "id">) => {
    try {
      const ref = await addDoc(collection(db, "products"), p);
      setProducts((prev) => [...prev, normalizeProduct({ ...p, id: ref.id })]);
    } catch {
      const id = "local-" + Date.now();
      setProducts((prev) => [...prev, normalizeProduct({ ...p, id })]);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      if (!id.startsWith("local-")) {
        await updateDoc(doc(db, "products", id), updates);
      }
    } catch {}
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProduct = async (id: string) => {
    try {
      if (!id.startsWith("local-")) {
        await deleteDoc(doc(db, "products", id));
      }
    } catch {}
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const addCategory = async (key: string, label: string) => {
    try {
      const ref = await addDoc(collection(db, "categories"), { key, label });
      setCategories((prev) => [...prev, { id: ref.id, key, label }]);
    } catch {
      setCategories((prev) => [...prev, { id: "local-" + Date.now(), key, label }]);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      if (!id.startsWith("local-") && !id.startsWith("cat-")) {
        await deleteDoc(doc(db, "categories", id));
      }
    } catch {}
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const increaseQuantity = (productId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQuantity = (productId: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const setQuantity = (productId: string, quantity: number) => {
    const safeQuantity = Math.max(1, Math.floor(quantity || 1));
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: safeQuantity }
          : item
      )
    );
  };

  const removeLineItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const removeFromCart = (productId: string) => {
    decreaseQuantity(productId);
  };

  const clearCart = () => {
    setCart([]);
  };

  const placeOrder = async (orderInput: Omit<ShopOrder, "id" | "createdAt" | "status">) => {
    const createdAt = new Date().toISOString();
    const payload = {
      ...orderInput,
      createdAt,
      status: "paid" as const,
    };

    try {
      const ref = await addDoc(collection(db, "orders"), payload);
      const savedOrder: ShopOrder = normalizeOrder({ id: ref.id, ...payload });
      setOrders((prev) => [savedOrder, ...prev]);
      return ref.id;
    } catch {
      const localId = `local-order-${Date.now()}`;
      const savedOrder: ShopOrder = normalizeOrder({ id: localId, ...payload });
      setOrders((prev) => [savedOrder, ...prev]);
      return localId;
    }
  };

  const updateOrderStatus = async (orderId: string, status: ShopOrder["status"]) => {
    try {
      if (!orderId.startsWith("local-order-")) {
        await updateDoc(doc(db, "orders", orderId), { status });
      }
    } catch {}
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
  };

  const updateOrderTracking = async (orderId: string, trackingCode: string) => {
    try {
      if (!orderId.startsWith("local-order-")) {
        await updateDoc(doc(db, "orders", orderId), { trackingCode });
      }
    } catch {}
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, trackingCode } : order))
    );
  };

  const markOrderRefunded = async (orderId: string) => {
    const refundedAt = new Date().toISOString();
    try {
      if (!orderId.startsWith("local-order-")) {
        await updateDoc(doc(db, "orders", orderId), {
          paymentStatus: "refunded",
          refundedAt,
        });
      }
    } catch {}
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, paymentStatus: "refunded", refundedAt }
          : order
      )
    );
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <ShopContext.Provider
      value={{
        products,
        categories,
        cart,
        orders,
        cartTotal,
        cartCount,
        loading,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        deleteCategory,
        addToCart,
        increaseQuantity,
        decreaseQuantity,
        setQuantity,
        removeLineItem,
        removeFromCart,
        clearCart,
        placeOrder,
        updateOrderStatus,
        updateOrderTracking,
        markOrderRefunded,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
};
