import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2, CreditCard, Wallet, Landmark, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useShop } from "@/contexts/ShopContext";

type CheckoutData = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  paymentMethod: "card" | "mbway" | "multibanco";
};

const Shop = () => {
  const {
    products,
    categories,
    cart,
    cartTotal,
    cartCount,
    loading,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    setQuantity,
    removeLineItem,
    clearCart,
    placeOrder,
  } = useShop();
  const [active, setActive] = useState<string>("all");
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Portugal",
    postalCode: "",
    paymentMethod: "card",
  });

  const SHIPPING = 4.9;
  const VAT_RATE = 0.23;

  const filtered = active === "all" ? products : products.filter((p) => p.category === active);
  const subtotal = useMemo(() => cartTotal, [cartTotal]);
  const vat = useMemo(() => subtotal * VAT_RATE, [subtotal]);
  const shipping = useMemo(() => (cart.length > 0 ? SHIPPING : 0), [cart.length]);
  const grandTotal = useMemo(() => subtotal + vat + shipping, [subtotal, vat, shipping]);

  const updateField = (field: keyof CheckoutData, value: string) => {
    setCheckoutData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlaceOrder = async () => {
    const required: Array<keyof CheckoutData> = [
      "fullName",
      "email",
      "phone",
      "city",
      "country",
      "postalCode",
    ];

    const missing = required.filter((field) => !checkoutData[field].trim());
    if (missing.length > 0) {
      toast.error("Please fill all required checkout fields.");
      return;
    }

    if (cart.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    const items = cart.map((item) => ({
      productId: item.product.id,
      title: item.product.title,
      unitPrice: item.product.price,
      quantity: item.quantity,
      lineTotal: item.product.price * item.quantity,
    }));

    const orderId = await placeOrder({
      customer: {
        fullName: checkoutData.fullName,
        email: checkoutData.email,
        phone: checkoutData.phone,
        address: checkoutData.address,
        city: checkoutData.city,
        country: checkoutData.country,
        postalCode: checkoutData.postalCode,
      },
      items,
      paymentMethod: checkoutData.paymentMethod,
      paymentStatus: "success",
      subtotal,
      vat,
      shipping,
      total: grandTotal,
    });

    toast.success(`Order ${orderId} confirmed! A receipt email has been sent.`);
    clearCart();
    setShowCheckout(false);
    setCheckoutData((prev) => ({
      ...prev,
      fullName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      paymentMethod: "card",
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground">Shop</h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Browse my collection of courses, games, films, books, and more.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          <Button
            variant={active === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActive("all")}
            className="gap-2"
          >
            <ShoppingCart size={16} /> All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={active === cat.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActive(cat.key)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((product) => (
              <div key={product.id} className="shop-card">
                <div className="h-48 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-xs capitalize">{product.category}</Badge>
                    <span className="text-lg font-bold text-primary">${product.price}</span>
                  </div>
                  <h3 className="font-heading font-semibold text-foreground mb-1">{product.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{product.description}</p>
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      addToCart(product);
                      toast.success(`"${product.title}" added to cart!`);
                    }}
                  >
                    <ShoppingCart size={16} /> Add to Cart
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No products in this category yet.
              </div>
            )}
          </div>

          <aside className="shop-card xl:sticky xl:top-24">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-heading font-semibold text-lg">Your Cart</h2>
              <Badge>{cartCount} items</Badge>
            </div>

            <div className="p-5 space-y-4 max-h-[420px] overflow-auto">
              {cart.length === 0 && (
                <p className="text-sm text-muted-foreground">Your cart is empty. Add a product to get started.</p>
              )}

              {cart.map((item) => (
                <div key={item.product.id} className="rounded-lg border border-border p-3 bg-muted/30">
                  <p className="font-medium text-sm text-foreground">{item.product.title}</p>
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => decreaseQuantity(item.product.id)}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </Button>
                      <input
                        aria-label="Quantity"
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => setQuantity(item.product.id, Number(e.target.value))}
                        className="w-14 h-7 rounded-md border border-border bg-background text-center text-sm"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => increaseQuantity(item.product.id)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </Button>
                    </div>
                    <span className="font-semibold text-primary">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {item.quantity} x ${item.product.price.toFixed(2)}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 text-destructive hover:text-destructive"
                    onClick={() => removeLineItem(item.product.id)}
                  >
                    Remove item
                  </Button>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-primary">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">VAT (23%)</span>
                <span>${vat.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-primary">${grandTotal.toFixed(2)}</span>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => setShowCheckout((prev) => !prev)}
                disabled={cart.length === 0}
              >
                <ShieldCheck size={16} /> {showCheckout ? "Hide Checkout" : "Finalizar Compra"}
              </Button>
              <Button
                className="w-full"
                variant="destructive"
                onClick={clearCart}
                disabled={cart.length === 0}
              >
                <Trash2 size={16} /> Clear Cart
              </Button>
            </div>

            {showCheckout && (
              <div className="p-5 border-t border-border space-y-4 bg-muted/20">
                <h3 className="font-heading font-semibold">Checkout</h3>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    placeholder="Full Name *"
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={checkoutData.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                  />
                  <input
                    placeholder="Email *"
                    type="email"
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={checkoutData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                  <input
                    placeholder="Phone *"
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={checkoutData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                  <input
                    placeholder="Address"
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={checkoutData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="City *"
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                      value={checkoutData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                    />
                    <input
                      placeholder="Postal Code *"
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                      value={checkoutData.postalCode}
                      onChange={(e) => updateField("postalCode", e.target.value)}
                    />
                  </div>
                  <input
                    placeholder="Country *"
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={checkoutData.country}
                    onChange={(e) => updateField("country", e.target.value)}
                  />

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment Method</p>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 cursor-pointer">
                        <input
                          type="radio"
                          name="payment"
                          checked={checkoutData.paymentMethod === "card"}
                          onChange={() => setCheckoutData((prev) => ({ ...prev, paymentMethod: "card" }))}
                        />
                        <CreditCard size={14} /> Credit Card
                      </label>
                      <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 cursor-pointer">
                        <input
                          type="radio"
                          name="payment"
                          checked={checkoutData.paymentMethod === "mbway"}
                          onChange={() => setCheckoutData((prev) => ({ ...prev, paymentMethod: "mbway" }))}
                        />
                        <Wallet size={14} /> MBWay
                      </label>
                      <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 cursor-pointer">
                        <input
                          type="radio"
                          name="payment"
                          checked={checkoutData.paymentMethod === "multibanco"}
                          onChange={() => setCheckoutData((prev) => ({ ...prev, paymentMethod: "multibanco" }))}
                        />
                        <Landmark size={14} /> Multibanco
                      </label>
                    </div>
                  </div>

                  <Button className="w-full" onClick={handlePlaceOrder}>
                    Pay ${grandTotal.toFixed(2)}
                  </Button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Shop;
