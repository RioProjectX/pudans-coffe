import { useState, useMemo } from 'react';
import { Product, CartItem, PaymentMethod, Transaction, Category } from '../types';
import { Search, ShoppingCart, Plus, Minus, Trash2, User, Ticket, HelpCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface POSProps {
  products: Product[];
  userRole?: 'KASIR' | 'ADMIN' | 'OWNER';
  onCheckout: (transactionDetails: {
    items: { productId: string; name: string; price: number; quantity: number; category: Category }[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    changeAmount: number;
    customerName: string;
    notes?: string;
    paymentStatus?: 'Belum Bayar' | 'Lunas';
    isBackfill?: boolean;
    backfillDate?: string;
    backfillTime?: string;
    backfilledBy?: string;
    backfillReason?: string;
    adjustStock?: boolean;
  }) => Promise<void> | any;
}

export default function POS({ products, userRole = 'KASIR', onCheckout }: POSProps) {
  // POS States
  const [activeCategory, setActiveCategory] = useState<Category | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Backfill / Manual Recovered States
  const [isBackfill, setIsBackfill] = useState(false);
  const [backfillDate, setBackfillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [backfillTime, setBackfillTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [backfillReason, setBackfillReason] = useState('');
  const [adjustStock, setAdjustStock] = useState(true);
  const [backfillPaymentStatus, setBackfillPaymentStatus] = useState<'Belum Bayar' | 'Lunas'>('Lunas');
  
  // Notes and Discount Custom Inputs
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState<string>('');
  
  // Modals for payment
  const [showQRISModal, setShowQRISModal] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Formats
  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Filter products based on search & category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = activeCategory === 'ALL' || p.category === activeCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cart]);

  const tax = 0;
  
  const discountAmount = useMemo(() => {
    return Math.max(0, parseFloat(discount) || 0);
  }, [discount]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  // Quick fill cache suggestions based on grand total
  const cashSuggestions = useMemo(() => {
    if (total <= 0) return [];
    
    const bills = [10000, 20000, 50000, 100000];
    const recommendedSet = new Set<number>();
    
    // Add exact payment
    recommendedSet.add(total);
    
    // Push common bills above total
    bills.forEach(bill => {
      if (bill > total) {
        recommendedSet.add(bill);
      }
      
      // Multiples of 50k or 100k
      const doubleBill = bill * 2;
      if (doubleBill > total) {
        recommendedSet.add(doubleBill);
      }
    });

    return Array.from(recommendedSet)
      .sort((a, b) => a - b)
      .slice(0, 4); // Limit to 4 options
  }, [total]);

  // Current change calculation
  const changeValue = useMemo(() => {
    const cashNum = parseFloat(cashAmount) || 0;
    if (cashNum < total) return 0;
    return cashNum - total;
  }, [cashAmount, total]);

  // Cart actions
  const handleAddToCart = (product: Product) => {
    if (!product.isAvailable) return;

    console.log(`[USER EVENT: SELECT MENU] Product "${product.name}" (ID: ${product.id}) added to cart.`);

    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
    
    // Automatically open checkout modal on mobile screens
    setIsMobileCartOpen(true);
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    console.log(`[USER EVENT: MODIFY QUANTITY] Product ID: ${productId}, Delta: ${delta}`);
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    console.log(`[USER EVENT: REMOVE MENU] Product ID: ${productId} removed from cart.`);
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => {
    console.log(`[UI CONTROL] Clearing active cart and customer form.`);
    setCart([]);
    setCustomerName('');
    setCashAmount('');
    setDiscount('');
    setNotes('');
    setIsBackfill(false);
    setBackfillReason('');
    setIsMobileCartOpen(false);
  };

  // Quick fill handler
  const selectCashSuggestion = (amount: number) => {
    setCashAmount(amount.toString());
  };

  const isCheckoutDisabled = useMemo(() => {
    return cart.length === 0 || !customerName.trim() || isSubmitting;
  }, [cart, customerName, isSubmitting]);

  // Process checkout transaction
  const handleProcessCheckout = async () => {
    console.log(`[STAGE 1: CLICK TRIGGER] "Buat Pesanan & Kirim" clicked. isSubmitting: ${isSubmitting}`);
    
    if (isCheckoutDisabled) {
      console.warn(`[STAGE 1: VALIDATION FAILURE] Checkout aborted. Cart empty, missing name, or currently submitting.`, {
        cartLength: cart.length,
        customerName: customerName,
        isSubmitting
      });
      return;
    }

    console.log(`[STAGE 2: VALIDATION SUCCESS] Cart & Customer Name validated. Formulating transaction payload...`, {
      customerName: customerName.trim(),
      items: cart.map(i => `${i.product.name} (x${i.quantity})`),
      totalPrice: total
    });

    const itemsToCheckout = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      category: item.product.category,
    }));

    const finalAmountPaid = paymentMethod === 'CASH' 
      ? (parseFloat(cashAmount) || total) 
      : total;

    const finalChange = paymentMethod === 'CASH'
      ? changeValue
      : 0;

    const payload = {
      items: itemsToCheckout,
      subtotal,
      tax,
      discount: discountAmount,
      total,
      paymentMethod,
      amountPaid: finalAmountPaid,
      changeAmount: finalChange,
      customerName: customerName.trim(),
      notes: notes.trim() || undefined,
      paymentStatus: isBackfill ? backfillPaymentStatus : 'Belum Bayar',
      isBackfill,
      backfillDate: isBackfill ? backfillDate : undefined,
      backfillTime: isBackfill ? backfillTime : undefined,
      backfilledBy: isBackfill ? userRole : undefined,
      backfillReason: isBackfill ? (backfillReason.trim() || 'No reason provided') : undefined,
      adjustStock: isBackfill ? adjustStock : undefined,
    };

    console.log(`[STAGE 3: DISPATCH TO SERVER] Handing transaction payload to App.tsx onCheckout...`, payload);
    
    setIsSubmitting(true);
    try {
      await onCheckout(payload);
      console.log(`[STAGE 3: DISPATCH SUCCESS] App onCheckout completed.`);
      handleClearCart();
    } catch (err) {
      console.error(`[STAGE 3: DISPATCH FAILED] App onCheckout threw an error:`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick manual checkout if QRIS succeeds
  const handleQRISSucceed = async () => {
    console.log(`[STAGE 1: QRIS SUCESS TRIGGER] QRIS modal reported success. Triggering direct checkout...`);
    setPaymentMethod('QRIS');
    setShowQRISModal(false);
    
    const itemsToCheckout = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      category: item.product.category,
    }));

    const payload = {
      items: itemsToCheckout,
      subtotal,
      tax,
      discount: discountAmount,
      total,
      paymentMethod: 'QRIS' as const,
      amountPaid: total,
      changeAmount: 0,
      customerName: customerName.trim(),
    };

    console.log(`[STAGE 3: DISPATCH TO SERVER] Handing QRIS transaction payload to App.tsx onCheckout...`, payload);

    setIsSubmitting(true);
    try {
      await onCheckout(payload);
      console.log(`[STAGE 3: DISPATCH SUCCESS] App onCheckout (QRIS) completed.`);
      handleClearCart();
    } catch (err) {
      console.error(`[STAGE 3: DISPATCH FAILED] App onCheckout (QRIS) failed:`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build simple category labels
  const categories: { label: string; value: Category | 'ALL' }[] = [
    { label: 'Semu Menu', value: 'ALL' },
    { label: '☕ Kopi', value: 'KOPI' },
    { label: '🍹 Non-Kopi', value: 'NON_KOPI' },
    { label: '🍳 Makanan', value: 'MAKANAN' },
    { label: '🍰 Cemilan', value: 'CEMILAN' },
  ];

  const getProductCountInCart = (prodId: string) => {
    const found = cart.find(item => item.product.id === prodId);
    return found ? found.quantity : 0;
  };

  const renderCartContent = (isMobileView = false) => (
    <div className={`flex flex-col ${isMobileView ? 'w-full' : 'h-full overflow-hidden'}`}>
      {/* Customer Input Header info */}
      <div className="p-4 bg-[#F5F2ED] border-b border-black/5 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-sm font-bold text-stone-800 flex items-center gap-1.5">
            <ShoppingCart size={16} className="text-[#3C2A21]" /> Detail Pesanan ({cart.length} item)
          </h3>
          {cart.length > 0 && (
            <button 
              onClick={handleClearCart}
              className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold uppercase hover:bg-rose-50 px-2 py-1 rounded-lg transition cursor-pointer"
            >
              Reset Keranjang
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-1">
          <div className="relative">
            <User className={`absolute left-3 top-2.5 transition-colors ${cart.length > 0 && !customerName.trim() ? 'text-amber-500 font-bold' : 'text-stone-400'}`} size={13} />
            <input
              type="text"
              placeholder="Nama Pelanggan (Wajib)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 border rounded-xl focus:outline-none focus:ring-1 text-xs bg-white transition-all
                ${cart.length > 0 && !customerName.trim()
                  ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/10 placeholder-amber-400/80'
                  : 'border-stone-150 focus:border-[#D4A373] focus:ring-[#D4A373]'
                }`}
            />
          </div>
          {cart.length > 0 && !customerName.trim() && (
            <div className="text-[10px] text-amber-600 font-semibold flex items-center gap-1.5 mt-0.5 animate-pulse bg-amber-50 px-2 py-1 rounded-lg border border-amber-100/50">
              ⚠️ Nama pelanggan wajib diisi sebelum memesan!
            </div>
          )}

          {/* User is Admin or Owner and has access to Backfill */}
          {(userRole === 'ADMIN' || userRole === 'OWNER') && (
            <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/40 space-y-2 mt-1.5 text-left">
              <label className="flex items-center gap-2 cursor-pointer text-stone-700 font-bold text-[10.5px] select-none">
                <input
                  type="checkbox"
                  checked={isBackfill}
                  onChange={(e) => setIsBackfill(e.target.checked)}
                  className="rounded border-amber-300 text-amber-600 focus:ring-amber-400 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Input Pesanan Tanggal Sebelumnya (Backfill)</span>
              </label>

              {isBackfill && (
                <div className="space-y-2 border-t border-amber-100/60 pt-2 animate-in slide-in-from-top duration-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[9px] text-amber-800 font-bold uppercase">Tanggal</label>
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={backfillDate}
                        onChange={(e) => setBackfillDate(e.target.value)}
                        className="w-full px-2 py-1 border border-amber-200 rounded-lg text-stone-700 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] text-amber-800 font-bold uppercase">Jam</label>
                      <input
                        type="time"
                        value={backfillTime}
                        onChange={(e) => setBackfillTime(e.target.value)}
                        className="w-full px-2 py-1 border border-amber-200 rounded-lg text-stone-700 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] text-amber-800 font-bold uppercase">Alasan Input Manual</label>
                    <input
                      type="text"
                      placeholder="Contoh: Rekap mati lampu / pesanan offline"
                      value={backfillReason}
                      onChange={(e) => setBackfillReason(e.target.value)}
                      className="w-full px-2 py-1 border border-amber-200 rounded-lg text-stone-700 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[9px] text-amber-800 font-bold uppercase">Metode Bayar</label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('CASH')}
                          className={`flex-1 py-1 px-1 rounded-lg border text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                            paymentMethod === 'CASH'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          CASH
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('QRIS')}
                          className={`flex-1 py-1 px-1 rounded-lg border text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                            paymentMethod === 'QRIS'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          QRIS
                        </button>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[9px] text-amber-800 font-bold uppercase">Status Transaksi</label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setBackfillPaymentStatus('Lunas')}
                          className={`flex-1 py-1 px-1 rounded-lg border text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                            backfillPaymentStatus === 'Lunas'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          Lunas
                        </button>
                        <button
                          type="button"
                          onClick={() => setBackfillPaymentStatus('Belum Bayar')}
                          className={`flex-1 py-1 px-1 rounded-lg border text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                            backfillPaymentStatus === 'Belum Bayar'
                              ? 'bg-[#3C2A21] text-white border-[#3C2A21]'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          Belum
                        </button>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-stone-600 font-bold text-[9.5px] select-none mt-1">
                    <input
                      type="checkbox"
                      checked={adjustStock}
                      onChange={(e) => setAdjustStock(e.target.checked)}
                      className="rounded border-stone-300 text-[#3C2A21] focus:ring-[#3C2A21] w-3 h-3 cursor-pointer"
                    />
                    <span>Sesuaikan Stok Barang</span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable list of ordered basket items */}
      <div className={`divide-y divide-stone-100 p-4 ${isMobileView ? '' : 'flex-1 overflow-y-auto min-h-[140px]'}`}>
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 space-y-2 py-8">
            <div className="bg-stone-50 p-4 rounded-full text-stone-300">
              <ShoppingCart size={32} />
            </div>
            <p className="text-xs font-semibold font-serif">Keranjang Masih Kosong</p>
            <p className="text-[11px] max-w-xs text-stone-400">Silakan klik atau ketuk item menu di samping kiri untuk memesan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.product.id} className="flex justify-between items-start pt-1 pb-2">
                <div className="space-y-1 max-w-[170px]">
                  <h5 className="text-xs font-bold text-stone-800 leading-tight">{item.product.name}</h5>
                  <span className="text-[11px] font-mono text-stone-500 block">
                    {formatIDR(item.product.price)}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Quantity Selector controls */}
                  <div className="flex items-center border border-stone-200 bg-stone-50 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => handleUpdateQty(item.product.id, -1)}
                      className="px-1.5 py-1 text-[#3C2A21] hover:bg-stone-200 transition cursor-pointer"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="px-2 text-xs font-bold font-mono text-stone-800 min-w-4 text-center">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => handleUpdateQty(item.product.id, 1)}
                      className="px-1.5 py-1 text-[#3C2A21] hover:bg-stone-200 transition cursor-pointer"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Trash Delete button */}
                  <button
                    onClick={() => handleRemoveFromCart(item.product.id)}
                    className="text-stone-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calculations Drawer panel */}
      <div className="bg-[#F5F2ED] border-t border-black/5 p-5 space-y-4 flex-shrink-0">
        {/* Notes and Discount Inputs */}
        <div className="grid grid-cols-2 gap-2 pb-2 border-b border-dashed border-stone-300">
          <div className="space-y-0.5">
            <label className="text-[9px] text-stone-500 font-bold uppercase">Diskon (Rp)</label>
            <input
              type="number"
              placeholder="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-full px-2 py-1 border border-stone-200 rounded-lg text-stone-700 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-[#D4A373] bg-white"
            />
          </div>
          <div className="space-y-0.5">
            <label className="text-[9px] text-stone-500 font-bold uppercase">Catatan Pesanan</label>
            <input
              type="text"
              placeholder="Contoh: No Sugar / Less Ice"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2 py-1 border border-stone-200 rounded-lg text-stone-700 text-[11px] focus:outline-none focus:ring-1 focus:ring-[#D4A373] bg-white"
            />
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal:</span>
            <span className="font-mono">{formatIDR(subtotal)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-rose-600 font-semibold">
              <span>Potongan Diskon:</span>
              <span className="font-mono">-{formatIDR(discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-bold text-[#3C2A21] border-t border-dashed border-stone-300 pt-2.5 leading-none mt-2.5">
            <span>TOTAL TAGIHAN:</span>
            <span className="font-mono text-base text-[#3C2A21]" id="pos-total-tagihan">{formatIDR(total)}</span>
          </div>
        </div>

        {/* Simplification: Just a button to place the order to the queue */}
        <button
          id="checkout-complete-btn"
          disabled={cart.length === 0}
          onClick={handleProcessCheckout}
          className={`w-full py-3.5 rounded-2xl font-bold text-xs transition duration-200 flex items-center justify-center gap-2 shadow-lg cursor-pointer
            ${cart.length === 0
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none border border-stone-100'
              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 transform active:scale-98'
            }`}
        >
          <ShoppingCart size={16} />
          <span>Buat Pesanan &amp; Kirim</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-130px)] lg:h-[calc(100vh-140px)] min-h-[500px]">
      
      {/* 1. Left Grid (Product selection catalog) */}
      <div className="flex-1 flex flex-col space-y-4 h-full overflow-hidden">
        
        {/* Search & Category Filter Section */}
        <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm flex flex-col md:flex-row gap-3 items-center">
          
          {/* Search bar inputs */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-2.5 text-stone-400" size={17} />
            <input
              type="text"
              placeholder="Cari menu kopi, makanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-stone-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A373]/20 focus:border-[#D4A373] text-xs transition placeholder-stone-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 text-xs font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Horizontal scrollable category list */}
          <div className="flex gap-1 overflow-x-auto w-full md:flex-1 pb-1 scrollbar-thin scrollbar-thumb-stone-200 hover:scrollbar-thumb-stone-300">
            {categories.map((cat) => (
              <button
                key={cat.value}
                id={`cat-tab-${cat.value}`}
                onClick={() => setActiveCategory(cat.value)}
                className={`text-xs px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition border ${
                  activeCategory === cat.value
                    ? 'bg-[#3C2A21] border-[#3C2A21] text-white shadow-sm'
                    : 'bg-stone-50 border-stone-150 text-stone-600 hover:bg-stone-100 hover:text-stone-850'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic products Grid content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-black/5 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
              <div className="bg-[#F5F2ED] p-4 rounded-full text-[#3C2A21] mb-3">
                <Search size={32} />
              </div>
              <h3 className="font-serif text-base font-bold text-stone-800">Menu Tidak Ditemukan</h3>
              <p className="text-xs text-stone-400 max-w-xs mt-1">
                Katalog "{searchQuery}" tidak tersedia. Silakan ganti kata kunci atau tambahkan menu baru di tab Katalog.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
              {filteredProducts.map((p) => {
                const qtyInCart = getProductCountInCart(p.id);
                return (
                  <div
                    key={p.id}
                    id={`pos-prod-${p.id}`}
                    onClick={() => handleAddToCart(p)}
                    className={`group bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden relative cursor-pointer p-3.5
                      ${p.isAvailable 
                        ? 'border-stone-150 hover:border-[#D4A373] hover:shadow-md' 
                        : 'border-dashed border-stone-250 opacity-60 pointer-events-none bg-stone-50'
                      }
                      ${qtyInCart > 0 ? 'ring-2 ring-[#D4A373] border-transparent shadow-[#D4A373]/10 shadow-lg' : ''}
                    `}
                  >
                    <div>
                      {/* Card Category Header Line */}
                      <div className="flex justify-between items-center gap-1.5 mb-2.5">
                        <span className="text-[9px] text-[#3C2A21] bg-[#F5F2ED] border border-black/5 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {p.category === 'KOPI' ? 'Kopi' : p.category === 'NON_KOPI' ? 'Non-Kopi' : p.category === 'MAKANAN' ? 'Makanan' : 'Cemilan'}
                        </span>

                        <div className="flex gap-1.5 items-center">
                          {/* Badge product in cart count */}
                          {qtyInCart > 0 && (
                            <span className="bg-[#D4A373] text-white text-[10px] font-black font-mono w-5 h-5 rounded-full flex items-center justify-center shadow-sm animate-scale-in">
                              {qtyInCart}
                            </span>
                          )}

                          {/* Status Badge */}
                          {!p.isAvailable && (
                            <span className="bg-stone-950 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                              Habis
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Product descriptions */}
                      <h4 className="text-xs sm:text-sm font-bold text-stone-850 tracking-tight leading-snug group-hover:text-[#D4A373] transition-colors line-clamp-2">
                        {p.name}
                      </h4>
                    </div>

                    <div className="pt-2.5 mt-3 border-t border-stone-100 flex justify-between items-center">
                      <span className="text-xs sm:text-sm font-black font-mono text-[#3C2A21]">
                        {formatIDR(p.price)}
                      </span>
                      {p.isAvailable && (
                        <span className="w-6 h-6 rounded-lg bg-stone-50 group-hover:bg-[#D4A373]/10 text-stone-400 group-hover:text-[#D4A373] flex items-center justify-center transition border border-stone-100">
                          <Plus size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Right Tray Column (Running checkout calculations) - Desktop view (hidden on mobile) */}
      <div className="hidden lg:flex w-full lg:w-96 bg-white border border-black/5 rounded-3xl shadow-xl flex-col h-full overflow-hidden flex-shrink-0">
        {renderCartContent()}
      </div>

      {/* Floating Bottom Cart Bar for Mobile Devices */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-[#3C2A21] hover:bg-[#2A1D17] text-white p-3.5 rounded-2xl flex items-center justify-between shadow-xl border border-white/10 active:scale-98 transition transform duration-150 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative bg-white/10 p-2 rounded-xl">
                <ShoppingCart size={16} />
                <span className="absolute -top-1.5 -right-1.5 bg-[#D4A373] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-[#3C2A21] font-mono">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="text-left">
                <p className="text-[9px] text-stone-300 uppercase tracking-wider font-semibold">Total Pesanan</p>
                <p className="text-xs font-bold leading-tight">{customerName ? `${customerName} • ` : ''}{cart.length} Menu</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono">{formatIDR(total)}</span>
              <span className="bg-[#D4A373] hover:bg-[#C29262] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                Bayar
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Mobile Cart Full-Screen Drawer Overlay Modal sliding up */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex flex-col justify-end">
          <div 
            onClick={() => setIsMobileCartOpen(false)}
            className="absolute inset-0 w-full h-full cursor-default"
          />
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl relative z-10 border-t border-black/5 overflow-hidden">
            {/* Grabber indicator at top */}
            <div className="w-12 h-1 bg-stone-200 rounded-full mx-auto my-3 flex-shrink-0" onClick={() => setIsMobileCartOpen(false)} />
            
            {/* Top Close bar */}
            <div className="px-4 pb-3 flex justify-between items-center border-b border-stone-100 flex-shrink-0">
              <h3 className="font-serif text-sm font-bold text-stone-850 flex items-center gap-2">
                <ShoppingCart size={16} className="text-[#3C2A21]" /> Detail Pesanan
              </h3>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="text-[11px] font-bold text-[#3C2A21] hover:text-[#D4A373] bg-[#F5F2ED] px-3 py-1.5 rounded-xl transition border border-black/5 cursor-pointer"
              >
                Kembali Menu
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-10">
              {renderCartContent(true)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
