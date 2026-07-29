import { useState, useEffect, useRef } from "react";
import { ShoppingCart, Truck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useShop } from "@/contexts/ShopContext";
import gsap from "gsap";

const Shop = () => {
  const { products, categories, loading } = useShop();
  const [active, setActive] = useState<string>("all");
  const cursorGlowRef = useRef<HTMLDivElement>(null);
  const stripeCheckoutUrl = import.meta.env.VITE_STRIPE_CHECKOUT_URL as string | undefined;

  const openStripeCheckout = (productTitle?: string) => {
    if (!stripeCheckoutUrl) {
      toast.error("Configure VITE_STRIPE_CHECKOUT_URL to enable payments.");
      return;
    }
    if (productTitle) {
      toast.success(`Redirecting to payment for "${productTitle}"...`);
    }
    window.open(stripeCheckoutUrl, "_blank", "noopener,noreferrer");
  };

  // 3D Card Hover Tilt logic
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((centerY - y) / centerY) * 8;
    const rotateY = ((x - centerX) / centerX) * 8;
    
    gsap.to(card, {
      rotateX: rotateX,
      rotateY: rotateY,
      transformPerspective: 1000,
      borderColor: "rgba(212, 175, 55, 0.4)",
      boxShadow: `${-rotateY * 1}px ${rotateX * 1}px 35px rgba(212, 175, 55, 0.1)`,
      duration: 0.3,
      ease: "power2.out"
    });
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      rotateX: 0,
      rotateY: 0,
      borderColor: "rgba(255, 255, 255, 0.5)",
      boxShadow: "0 8px 32px 0 rgba(139, 90, 43, 0.08)",
      duration: 0.5,
      ease: "power2.out"
    });
  };

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      if (cursorGlowRef.current) {
        gsap.to(cursorGlowRef.current, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.6,
          ease: "power2.out",
        });
      }
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, []);

  const filtered = active === "all" ? products : products.filter((p) => p.category === active);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-stone-850 overflow-x-hidden relative selection:bg-amber-500/20 selection:text-amber-700">
      <Navbar />

      {/* Sunlit Amber Cursor Glow Follower */}
      <div 
        ref={cursorGlowRef} 
        className="fixed w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,rgba(245,158,11,0.04)_50%,transparent_100%)] pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10 mix-blend-multiply no-print"
      />

      <div className="relative z-20 pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-heading font-black text-gradient tracking-tight mb-3">Shop</h1>
          <p className="text-stone-600 max-w-xl mx-auto text-base">
            Browse my collection of courses, games, films, books, and more.
          </p>
          <div className="mt-6 flex justify-center">
            <button className="glass-btn-3d px-6 py-3 font-bold gap-2 flex items-center shadow-md" onClick={() => openStripeCheckout()}>
              <Truck size={15} className="text-amber-600" /> Finalizar Compra
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <button
            onClick={() => setActive("all")}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
              active === "all"
                ? "bg-white/70 text-amber-600 border border-amber-500/20 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/45 border border-transparent"
            }`}
          >
            <ShoppingCart size={13} /> All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.key)}
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                active === cat.key
                  ? "bg-white/70 text-amber-600 border border-amber-500/20 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                  : "text-stone-600 hover:text-stone-900 hover:bg-white/45 border border-transparent"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((product, idx) => (
            <div 
              key={product.id} 
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="glass-card flex flex-col justify-between overflow-hidden border border-white/55 transition-all duration-300 hover:shadow-amber-500/5 reveal-section"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="h-48 overflow-hidden relative">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-amber-600 bg-amber-500/10 px-2.5 py-0.5 border border-amber-500/20 rounded-sm">{product.category}</span>
                    <span className="text-xl font-black text-amber-600">${product.price}</span>
                  </div>
                  <h3 className="font-heading font-bold text-lg text-stone-900 mb-1.5">{product.title}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed mb-6">{product.description}</p>
                </div>
                <div className="space-y-2">
                  <button
                    className="glass-btn-3d w-full py-3 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-1.5"
                    onClick={() => toast.success(`"${product.title}" added to cart!`)}
                  >
                    <ShoppingCart size={13} className="text-amber-600" /> Add to Cart
                  </button>
                  <button
                    className="glass-btn-3d w-full py-3 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-1.5"
                    onClick={() => openStripeCheckout(product.title)}
                  >
                    <Truck size={13} className="text-amber-600" /> Pagar
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-stone-500">
              No products in this category yet.
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Shop;
