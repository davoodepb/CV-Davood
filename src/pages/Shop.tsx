import { useState } from "react";
import { Minus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useShop } from "@/contexts/ShopContext";

const Shop = () => {
  const {
    products,
    categories,
    cart,
    cartTotal,
    cartCount,
    loading,
    addToCart,
    removeFromCart,
    clearCart,
  } = useShop();
  const [active, setActive] = useState<string>("all");

  const filtered = active === "all" ? products : products.filter((p) => p.category === active);

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
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.quantity} x ${item.product.price.toFixed(2)}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-semibold text-primary">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Minus size={14} /> Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-primary">${cartTotal.toFixed(2)}</span>
              </div>
              <Button
                className="w-full"
                variant="destructive"
                onClick={clearCart}
                disabled={cart.length === 0}
              >
                <Trash2 size={16} /> Clear Cart
              </Button>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Shop;
