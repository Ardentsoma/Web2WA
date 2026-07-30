/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  MessageCircle, 
  CheckCircle2, 
  ArrowRight,
  Download,
  Info,
  X,
  Store,
  Truck,
  User,
  CreditCard
} from 'lucide-react';

// --- Types ---
interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
}

interface CartItem extends Product {
  quantity: number;
}

// --- Mock Data ---
const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "AirPods Pro",
    price: 249.00,
    description: "Active Noise Cancellation with Transparency mode and spatial audio.",
    image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800"
  },
  {
    id: 2,
    name: "Power Bank 20,000mAh",
    price: 49.50,
    description: "Ultra-high capacity fast charging portable battery with dual USB-C output.",
    image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800"
  },
  {
    id: 3,
    name: "Artisan Coffee Beans",
    price: 24.99,
    description: "Ethically sourced, medium roast beans with notes of chocolate and hazelnut.",
    image: "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=800"
  },
  {
    id: 4,
    name: "Insulated Go-Mug",
    price: 32.00,
    description: "Double-walled stainless steel mug that keeps beverage hot for 6 hours.",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800"
  }
];

const TEMPLATE_PRESETS = {
  delivery: `🚚 Delivery Confirmation

Order: #{order_number}
Payment: Confirmed ✅

Customer: {customer_name}
Phone: {customer_phone}

Items:
{items}

Delivery Location:
{address}

Hello, I have completed payment. Kindly confirm my payment and help me arrange delivery.`,
  compact: `📦 Order #{order_number} Paid ({total_paid})
Name: {customer_name} ({customer_phone})
Items: {items}
Address: {address}

Hi, please dispatch my order.`,
  detailed: `===========================
 🚚 LOGISTICS DISPATCH REQUEST
===========================
Order ID: #{order_number}
Status: Paid ({payment_status})
Total Paid: {total_paid}

CUSTOMER DETAILS:
• Name: {customer_name}
• Phone: {customer_phone}
• Address: {address}

PURCHASED ITEMS:
{items}

Kindly process for shipping and reply with tracking details.`
};

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [step, setStep] = useState<'browsing' | 'checkout' | 'success'>('browsing');
  
  // Plugin / Admin settings state (WordPress Backend)
  const [whatsappNumber, setWhatsappNumber] = useState('2348030000000');
  const [messageTemplate, setMessageTemplate] = useState(TEMPLATE_PRESETS.delivery);
  const [checkoutNotice, setCheckoutNotice] = useState('Note: After successful payment, you will be redirected to WhatsApp to finalize delivery logistics.');

  // Customer checkout inputs
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderId, setOrderId] = useState('');

  // UI helpers
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Escape key handler for drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCartOpen) {
        setIsCartOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen]);

  // Focus restoration & initial focus trap activation
  useEffect(() => {
    if (isCartOpen) {
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 60);
    } else {
      cartButtonRef.current?.focus();
    }
  }, [isCartOpen]);

  // Fully trap focus loop within the drawer bounds (WCAG 2.4.3)
  const handleDrawerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const drawer = document.querySelector('[role="dialog"]');
    if (!drawer) return;
    const focusable = drawer.querySelectorAll('button, input, select, textarea, a, [tabindex="0"]');
    if (focusable.length === 0) return;
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;
    
    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };

  // --- Handlers ---
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    notify(`${product.name} added to cart`);
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const notify = (msg: string) => {
    setNotificationMsg(msg);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const startCheckout = () => {
    setIsCartOpen(false);
    if (cart.length === 0) {
      setCart([
        { ...PRODUCTS[0], quantity: 1 },
        { ...PRODUCTS[1], quantity: 2 }
      ]);
    }
    setStep('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMockPayment = () => {
    const newOrderId = Math.floor(1000 + Math.random() * 9000).toString();
    setOrderId(newOrderId);
    notify("Processing Payment...");
    setTimeout(() => {
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
  };

  // Replace placeholders to construct final WhatsApp text
  const generateFormattedMessage = () => {
    const itemsList = cart.length > 0 
      ? cart.map(item => `• ${item.name} ×${item.quantity}`).join('\n')
      : '• AirPods Pro ×1\n• Power Bank ×2';

    const replacements: Record<string, string> = {
      '{order_number}': orderId,
      '{customer_name}': customerName || 'John Doe',
      '{customer_phone}': customerPhone || '08031234567',
      '{items}': itemsList,
      '{address}': customerAddress || 'Ikeja, Lagos',
      '{total_paid}': `₦${totalPrice.toFixed(2)}`,
      '{payment_status}': 'Confirmed ✅'
    };

    let result = messageTemplate;
    Object.keys(replacements).forEach(key => {
      result = result.replaceAll(key, replacements[key]);
    });
    return result;
  };

  const checkoutOnWhatsApp = () => {
    const message = generateFormattedMessage();
    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const copyMessagePreview = () => {
    navigator.clipboard.writeText(generateFormattedMessage());
    setCopied(true);
    notify("Copied message format to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPlugin = async () => {
    try {
      const response = await fetch('/web2wa-plugin.zip');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'web2wa-plugin.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      notify("Plugin ZIP v2.2 downloaded!");
    } catch (err) {
      console.error(err);
      notify("Error downloading plugin ZIP");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111] font-sans selection:bg-[#25D366]/20">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/95 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setStep('browsing')}>
            <div className="w-9 h-9 rounded-lg bg-[#25D366] flex items-center justify-center text-white">
              <Truck className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-base font-bold tracking-tight text-[#111]">Web2WA</h1>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => {
                if (step !== 'browsing') {
                  setStep('browsing');
                  setTimeout(() => {
                    const el = document.getElementById('how-to-install');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                } else {
                  const el = document.getElementById('how-to-install');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-xs font-semibold text-[#6B6B6B] hover:text-[#111] transition-colors cursor-pointer"
            >
              How To Install
            </button>

            <button 
              onClick={downloadPlugin}
              className="px-4 py-2 bg-[#111] text-white font-semibold rounded-lg text-xs hover:bg-black transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 inline mr-1.5" />
              Download Plugin
            </button>

            <button 
              ref={cartButtonRef}
              onClick={() => setIsCartOpen(true)}
              className="relative p-1 text-[#6B6B6B] hover:text-[#111] transition-colors cursor-pointer"
              aria-label="View Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#25D366] text-white text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {/* --- STOREFRONT BROWSING SCREEN --- */}
        {step === 'browsing' && (
          <motion.div
            key="browsing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Hero */}
            <header className="px-6 py-20 md:py-28 max-w-7xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-[#111] mb-6 leading-tight max-w-4xl mx-auto">
                Post-Payment WooCommerce <br className="hidden md:block" /> WhatsApp Logistics Bridge
              </h2>
              <p className="text-sm md:text-base text-[#6B6B6B] max-w-2xl mx-auto mb-10 leading-relaxed">
                Allow customers to pay via standard payment gateways, then seamlessly route them 
                to WhatsApp with pre-filled order details to finalize delivery logistics.
              </p>
              <button
                onClick={startCheckout}
                className="px-8 py-3.5 bg-[#25D366] text-white font-bold rounded-lg text-sm hover:bg-[#1DA851] transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4 inline mr-2" />
                Test Demo Order
              </button>
            </header>

            {/* Products Grid */}
            <main className="px-6 pb-24 max-w-7xl mx-auto">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B] mb-10">
                Featured Store Items
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                {PRODUCTS.map((product) => (
                  <motion.div 
                    key={product.id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="group"
                  >
                    <div className="relative mb-4">
                      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-[#F5F5F5]">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://picsum.photos/seed/' + encodeURIComponent(product.name) + '/800/600'; }}
                        />
                      </div>
                      <button 
                        onClick={() => addToCart(product)}
                        className="absolute bottom-3 right-3 bg-white p-2.5 rounded-lg hover:bg-[#25D366] hover:text-white transition-all duration-200 cursor-pointer"
                        title="Add to cart"
                      >
                        <Plus className="w-4.5 h-4.5" />
                      </button>
                    </div>
                    <h4 className="font-bold text-sm text-[#111] mb-1">{product.name}</h4>
                    <p className="text-xs text-[#6B6B6B] line-clamp-2 mb-3 leading-relaxed">{product.description}</p>
                    <span className="font-extrabold text-[#25D366] text-base">₦{product.price.toFixed(2)}</span>
                  </motion.div>
                ))}
              </div>
            </main>

            {/* How To Install */}
            <section id="how-to-install" className="px-6 py-16 md:py-20 max-w-7xl mx-auto">
              <div className="max-w-xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-[#111]">How To Install</h2>
                <ol className="space-y-8">
                  {[
                    'Download the updated <b>web2wa-plugin.zip</b> from the navbar above.',
                    'In WordPress Admin, go to <b>Plugins &gt; Add New &gt; Upload Plugin</b>.',
                    'Upload <b>web2wa-plugin.zip</b> and click <b>Install Now</b>.',
                    'Configure your WhatsApp number and message template under <b>Settings &gt; WhatsApp Logistics</b>.'
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-5">
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#111] text-white flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </span>
                      <p className="text-sm text-[#6B6B6B] leading-relaxed pt-1" dangerouslySetInnerHTML={{ __html: step }} />
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          </motion.div>
        )}

        {/* --- CHECKOUT SCREEN --- */}
        {step === 'checkout' && (
          <motion.div 
            key="checkout"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl mx-auto px-6 py-10"
          >
            <button 
              onClick={() => setStep('browsing')}
              className="text-xs font-semibold text-[#6B6B6B] hover:text-[#111] mb-6 transition-colors cursor-pointer"
            >
              ← Back to Shop
            </button>
            <h2 className="text-3xl font-bold mb-8 text-[#111]">WooCommerce Checkout</h2>

            {/* Dynamic Notice Banner */}
            <div className="bg-[#F5F5F5] p-4 mb-8 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#25D366] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#111] mb-0.5">WhatsApp Logistics Notice:</p>
                  <p className="text-xs text-[#6B6B6B] leading-relaxed">{checkoutNotice}</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-12 gap-10">
              {/* Billing & Shipping Form */}
              <div className="md:col-span-7 space-y-6">
                <div>
                  <h3 className="font-bold text-sm text-[#111] mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#25D366]" />
                    Customer & Shipping Info
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-[#6B6B6B]">Full Name</label>
                      <input 
                        type="text" 
                        value={customerName} 
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-2.5 bg-white rounded-lg text-sm text-[#111] placeholder:text-[#6B6B6B]/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-[#6B6B6B]">Phone Number</label>
                      <input 
                        type="text" 
                        value={customerPhone} 
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. +234 803 123 4567"
                        className="w-full px-4 py-2.5 bg-white rounded-lg text-sm text-[#111] placeholder:text-[#6B6B6B]/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-[#6B6B6B]">Delivery Location / Address</label>
                      <input 
                        type="text" 
                        value={customerAddress} 
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="e.g. 123 Broad Street, Lagos"
                        className="w-full px-4 py-2.5 bg-white rounded-lg text-sm text-[#111] placeholder:text-[#6B6B6B]/50 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-[#111] mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#25D366]" />
                    Payment Method
                  </h3>
                  <div className="p-4 bg-[#F5F5F5] rounded-lg">
                    <div className="flex items-center gap-3">
                      <input type="radio" checked readOnly className="accent-[#25D366]" />
                      <div>
                        <p className="font-semibold text-sm text-[#111]">Online Payment (Stripe / Credit Card)</p>
                        <p className="text-xs text-[#6B6B6B]">Complete payment directly on checkout</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary Side panel */}
              <div className="md:col-span-5">
                <div className="sticky top-28">
                  <h3 className="font-bold text-sm text-[#111] mb-4">Your Order</h3>
                  <div className="space-y-3 mb-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between text-xs font-semibold text-[#6B6B6B]">
                        <span>{item.name} × {item.quantity}</span>
                        <span className="font-bold text-[#111]">₦{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between font-bold text-base mb-6 text-[#111] pt-4">
                    <span>Total Amount</span>
                    <span className="text-[#25D366]">₦{totalPrice.toFixed(2)}</span>
                  </div>

                  <button 
                    onClick={handleMockPayment}
                    className="w-full py-3.5 bg-[#25D366] text-white font-bold rounded-lg text-sm hover:bg-[#1DA851] transition-colors cursor-pointer"
                  >
                    Pay & Complete Order →
                  </button>
                  <p className="text-center text-[10px] text-[#6B6B6B] mt-3 uppercase tracking-wider font-semibold">
                    Redirects to WhatsApp Logistics
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- CLEAN CUSTOMER THANK YOU / SUCCESS PAGE --- */}
        {step === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto px-6 py-16 text-center"
          >
            <div className="w-16 h-16 bg-[#25D366]/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-[#25D366]" />
            </div>
            
            <h2 className="text-3xl font-bold mb-2 text-[#111]">Payment Successful!</h2>
            <p className="text-sm text-[#6B6B6B] mb-8">
              Thank you for your order! Your payment for Order <span className="font-mono font-bold text-[#111]">#{orderId}</span> has been confirmed.
            </p>

            <div className="p-6 bg-[#F5F5F5] rounded-lg text-left mb-8 space-y-3 text-xs">
              <div className="flex justify-between pb-2 font-medium">
                <span className="text-[#6B6B6B]">Order Number:</span>
                <span className="font-bold font-mono text-[#111]">#{orderId}</span>
              </div>
              <div className="flex justify-between pb-2 font-medium">
                <span className="text-[#6B6B6B]">Customer Name:</span>
                <span className="font-semibold text-[#111]">{customerName || 'N/A'}</span>
              </div>
              <div className="flex justify-between pb-2 font-medium">
                <span className="text-[#6B6B6B]">Phone:</span>
                <span className="font-semibold text-[#111]">{customerPhone || 'N/A'}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-[#6B6B6B]">Delivery Location:</span>
                <span className="font-semibold text-[#111]">{customerAddress || 'N/A'}</span>
              </div>
            </div>

            {/* WhatsApp Logistics Button */}
            <button 
              onClick={checkoutOnWhatsApp}
              className="w-full py-3.5 bg-[#25D366] text-white font-bold rounded-lg flex items-center justify-center gap-2 text-sm hover:bg-[#1DA851] transition-colors cursor-pointer mb-6"
            >
              <MessageCircle className="w-5 h-5" />
              Chat with Logistics Details on WhatsApp
            </button>

            <button 
              onClick={() => {
                setCart([
                  { ...PRODUCTS[0], quantity: 1 },
                  { ...PRODUCTS[1], quantity: 2 }
                ]);
                setStep('browsing');
              }}
              className="text-xs font-semibold text-[#6B6B6B] hover:text-[#111] transition-colors cursor-pointer"
            >
              Return to Store
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 z-[60]"
              aria-hidden="true"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onKeyDown={handleDrawerKeyDown}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Shopping Cart Drawer"
            >
              {/* Drawer Header */}
              <div className="p-6 flex justify-between items-center">
                <h3 className="text-lg font-bold text-[#111] flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#25D366]" />
                  Shopping Cart
                </h3>
                <button 
                  ref={closeButtonRef}
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 text-[#6B6B6B] hover:text-[#111] transition-colors cursor-pointer"
                  aria-label="Close Shopping Cart"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#6B6B6B]/40">
                    <Store className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Your cart is empty.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#F5F5F5] flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-xs text-[#111]">{item.name}</h4>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-[#6B6B6B] hover:text-red-500 p-1 transition-colors cursor-pointer"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#25D366] font-bold">₦{item.price.toFixed(2)}</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-6 h-6 flex items-center justify-center bg-[#F5F5F5] hover:bg-[#E5E5E5] rounded transition-colors text-[#111] cursor-pointer"
                              aria-label={`Decrease quantity of ${item.name}`}
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center text-[#111]">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-6 h-6 flex items-center justify-center bg-[#F5F5F5] hover:bg-[#E5E5E5] rounded transition-colors text-[#111] cursor-pointer"
                              aria-label={`Increase quantity of ${item.name}`}
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-6 bg-[#FAFAFA]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#6B6B6B] text-sm font-medium">Subtotal</span>
                  <span className="text-xl font-bold text-[#111]">₦{totalPrice.toFixed(2)}</span>
                </div>
                
                <button 
                  onClick={startCheckout}
                  disabled={cart.length === 0}
                  className="w-full py-3.5 bg-[#25D366] text-white font-bold rounded-lg text-sm hover:bg-[#1DA851] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Proceed to Checkout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-[#111] text-white px-5 py-2.5 rounded-lg flex items-center gap-2.5 text-xs font-semibold"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="w-4 h-4 text-[#25D366]" />
            <span>{notificationMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-xs text-[#6B6B6B] font-medium">
          Developed by Nmesoma N. Sunday
        </div>
      </footer>
    </div>
  );
}
