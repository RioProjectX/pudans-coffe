import { useState, useMemo } from 'react';
import { Product, CartItem, PaymentMethod, Transaction, Category } from '../types';
import { Search, ShoppingCart, Plus, Minus, Trash2, User, Ticket, HelpCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface POSProps {
  products: Product[];
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
  }) => void;
}

export default function POS({ products, onCheckout }: POSProps) {
  // POS States
  const [activeCategory, setActiveCategory] = useState<Category | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashAmount, setCashAmount] = useState<string>('');
  
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
  const discountAmount = 0;

  const total = useMemo(() => {
    return subtotal;
  }, [subtotal]);

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
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setCustomerName('');
    setCashAmount('');
    setIsMobileCartOpen(false);
  };

  // Quick fill handler
  const selectCashSuggestion = (amount: number) => {
    setCashAmount(amount.toString());
  };

  const isCheckoutDisabled = useMemo(() => {
    if (cart.length === 0) return true;
    if (paymentMethod === 'CASH') {
      const cashNum = parseFloat(cashAmount) || 0;
      return cashNum < total;
    }
    return false;
  }, [cart, paymentMethod, cashAmount, total]);

  // Process checkout transaction
  const handleProcessCheckout = () => {
    if (isCheckoutDisabled) return;

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

    onCheckout({
      items: itemsToCheckout,
      subtotal,
      tax,
      discount: discountAmount,
      total,
      paymentMethod,
      amountPaid: finalAmountPaid,
      changeAmount: finalChange,
      customerName: customerName.trim(),
    });

    // Reset everything!
    handleClearCart();
  };

  // Quick manual checkout if QRIS succeeds
  const handleQRISSucceed = () => {
    setPaymentMethod('QRIS');
    setShowQRISModal(false);
    // Proceed directly:
    const itemsToCheckout = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      category: item.product.category,
    }));

    onCheckout({
      items: itemsToCheckout,
      subtotal,
      tax,
      discount: discountAmount,
      total,
      paymentMethod: 'QRIS',
      amountPaid: total,
      changeAmount: 0,
      customerName: customerName.trim(),
    });

    handleClearCart();
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
        
        <div className="grid grid-cols-1 gap-2">
          <div className="relative">
            <User className="absolute left-3 top-2.5 text-stone-400" size={13} />
            <input
              type="text"
              placeholder="Nama Pelanggan (opsional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-stone-150 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] text-xs bg-white"
            />
          </div>
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
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal:</span>
            <span className="font-mono">{formatIDR(subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm font-bold text-[#3C2A21] border-t border-dashed border-stone-300 pt-2.5 leading-none mt-2.5">
            <span>TOTAL TAGIHAN:</span>
            <span className="font-mono text-base text-[#3C2A21]" id="pos-total-tagihan">{formatIDR(total)}</span>
          </div>
        </div>

        {/* Payment Method selector buttons */}
        <div className="space-y-2">
          <label className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">Metode Pembayaran</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setPaymentMethod('CASH');
                setCashAmount('');
              }}
              className={`py-2 rounded-xl text-xs font-bold transition border flex flex-col items-center justify-center cursor-pointer
                ${paymentMethod === 'CASH'
                  ? 'bg-[#3C2A21] border-[#3C2A21] text-white shadow-sm'
                  : 'bg-white border-stone-200 text-[#3C2A21] hover:bg-stone-100'
                }`}
            >
              💵 Tunai / Cash
            </button>
            <button
              onClick={() => {
                setPaymentMethod('QRIS');
                if (cart.length > 0) setShowQRISModal(true);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition border flex flex-col items-center justify-center cursor-pointer
                ${paymentMethod === 'QRIS'
                  ? 'bg-[#3C2A21] border-[#3C2A21] text-white shadow-sm'
                  : 'bg-white border-stone-200 text-[#3C2A21] hover:bg-stone-100'
                }`}
            >
              📱 QRIS Dinamis
            </button>
          </div>
        </div>

        {/* Cash input handler panel displayed ONLY when CASH is chosen */}
        {paymentMethod === 'CASH' && (
          <div className="space-y-3 animate-fade-in duration-200">
            {/* Quick cash suggestions bills */}
            {cashSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cashSuggestions.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => selectCashSuggestion(amount)}
                    className="flex-grow bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 font-mono text-[11px] font-semibold py-1 rounded-lg transition cursor-pointer text-center"
                  >
                    {amount === total ? 'Pas' : amount.toLocaleString('id-ID')}
                  </button>
                ))}
              </div>
            )}

            {/* Physical/Custom Cash received input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">Nominal Tunai Diterima</span>
                {parseFloat(cashAmount) > 0 && parseFloat(cashAmount) < total && (
                  <span className="text-[10px] font-bold text-rose-500">Nominal Kurang</span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-stone-500">Rp</span>
                <input
                  type="number"
                  placeholder="Masukkan jumlah uang"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] text-xs font-mono font-bold text-stone-800 bg-white"
                />
              </div>
            </div>

            {/* Real change output calculations */}
            {parseFloat(cashAmount) >= total && (
              <div className="flex justify-between items-center bg-[#F4F9F4] p-2.5 rounded-xl border border-[#e4f5e4]">
                <span className="text-[10px] text-emerald-800 font-semibold uppercase">Kembalian Kasir:</span>
                <span className="text-xs font-mono font-black text-emerald-800">{formatIDR(changeValue)}</span>
              </div>
            )}
          </div>
        )}

        {/* Checkout Final Core Action CTA Button */}
        <button
          id="checkout-complete-btn"
          disabled={isCheckoutDisabled}
          onClick={handleProcessCheckout}
          className={`w-full py-3.5 rounded-2xl font-bold text-xs transition duration-200 flex items-center justify-center gap-2 shadow-lg cursor-pointer
            ${isCheckoutDisabled
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none border border-stone-100'
              : 'bg-[#3C2A21] hover:bg-[#2A1D17] text-white shadow-[#3C2A21]/20 transform active:scale-98'
            }`}
        >
          <CheckCircle2 size={16} />
          <span>Selesaikan Pesanan &amp; Cetak</span>
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

      {/* 4. Elegant QRIS modal overlay */}
      {showQRISModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">QRIS Dinamis</span>
              <button 
                onClick={() => {
                  setShowQRISModal(false);
                  setPaymentMethod('CASH'); // Fallback cash
                }}
                className="text-stone-400 text-xs font-semibold hover:text-stone-800 bg-stone-150 px-2 py-0.5 rounded-lg"
              >
                Batal
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-serif font-bold text-base text-stone-800">PUDANS COFFEE</h3>
              <p className="text-[10px] text-stone-400 uppercase font-mono tracking-wider">NMID: ID102030405060</p>
            </div>

            {/* Beautiful Custom SVGMockup QR code referencing QRIS payment */}
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-stone-150 inline-block w-max mx-auto shadow-inner">
              <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto block">
                {/* Outer frame */}
                <rect width="200" height="200" fill="#FFFFFF" rx="10" />
                
                {/* QRIS logo symbol in center */}
                <rect x="75" y="75" width="50" height="50" fill="#1C355E" rx="8" />
                <text x="100" y="98" fontSize="10" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="black" textAnchor="middle">QRIS</text>
                <text x="100" y="112" fontSize="6" fill="#F4B41A" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">PUDANS</text>

                {/* Simulated Finder patterns in corners */}
                <rect x="15" y="15" width="40" height="40" fill="#1C355E" rx="4" />
                <rect x="23" y="23" width="24" height="24" fill="#FFFFFF" rx="2" />
                <rect x="29" y="29" width="12" height="12" fill="#1C355E" rx="1" />

                <rect x="145" y="15" width="40" height="40" fill="#1C355E" rx="4" />
                <rect x="153" y="153" width="24" height="24" fill="#FFFFFF" rx="2" stroke="" />
                <rect x="153" y="23" width="24" height="24" fill="#FFFFFF" rx="2" />
                <rect x="159" y="29" width="12" height="12" fill="#1C355E" rx="1" />

                <rect x="15" y="145" width="40" height="40" fill="#1C355E" rx="4" />
                <rect x="23" y="153" width="24" height="24" fill="#FFFFFF" rx="2" />
                <rect x="29" y="159" width="12" height="12" fill="#1C355E" rx="1" />

                {/* Randomly dotted areas representing matrix code blocks */}
                <g fill="#2C2E35" opacity="0.85">
                  <rect x="65" y="15" width="10" height="15" />
                  <rect x="80" y="25" width="15" height="10" />
                  <rect x="105" y="15" width="20" height="15" />
                  <rect x="130" y="30" width="10" height="25" />
                  
                  <rect x="15" y="65" width="15" height="10" />
                  <rect x="25" y="80" width="10" height="15" stroke="" />
                  <rect x="40" y="65" width="25" height="15" />
                  <rect x="45" y="95" width="10" height="30" />
                  
                  <rect x="135" y="65" width="15" height="20" />
                  <rect x="155" y="80" width="30" height="10" />
                  <rect x="145" y="105" width="15" height="15" />
                  <rect x="170" y="115" width="15" height="20" />

                  <rect x="65" y="145" width="15" height="35" />
                  <rect x="90" y="155" width="30" height="10" />
                  <rect x="105" y="170" width="15" height="15" />
                  <rect x="130" y="150" width="10" height="35" />

                  {/* Dynamic center bits */}
                  <rect x="65" y="65" width="5" height="5" />
                  <rect x="130" y="65" width="5" height="5" />
                  <rect x="65" y="130" width="5" height="5" />
                  <rect x="130" y="130" width="5" height="5" />
                </g>
              </svg>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-stone-400 tracking-wider block font-bold uppercase">Total Pembayaran</span>
              <p className="text-xl font-bold font-mono text-[#8B5A2B]">{formatIDR(total)}</p>
            </div>

            <p className="text-[11px] text-stone-500 max-w-xs mx-auto text-center leading-relaxed">
              Tunjukkan QR di atas ke pelanggan. Sistem akan memverifikasi pembayaran secara otomatis setelah pemindaian selesai.
            </p>

            <div className="pt-3 border-t border-stone-100 flex gap-2">
              <button
                onClick={() => {
                  setShowQRISModal(false);
                  setPaymentMethod('CASH');
                }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-50 border border-stone-200 transition"
              >
                Ganti Tunai
              </button>
              <button
                id="qris-verify-success"
                onClick={handleQRISSucceed}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
              >
                Simulasi Berhasil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
