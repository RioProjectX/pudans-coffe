import { useState, useMemo } from 'react';
import { Transaction, PaymentMethod, Product, Category } from '../types';
import { Clock, Search, CheckCircle, Check, X, AlertTriangle, Printer, Smartphone, DollarSign, ArrowRight, Plus, Minus, AlertCircle } from 'lucide-react';

interface PendingOrdersProps {
  transactions: Transaction[];
  products: Product[];
  onConfirmPayment: (txId: string, paymentDetails: {
    paymentMethod: PaymentMethod;
    amountPaid: number;
    changeAmount: number;
    paymentStatus: 'Lunas';
    status_pembayaran: string;
    metode_pembayaran: string;
    nominal_pembayaran: number;
    nominal_kembalian: number;
    waktu_pembayaran: string;
  }) => Promise<any>;
  onUpdateTransactionItems?: (
    txId: string,
    newItems: { productId: string; name: string; price: number; quantity: number; category: Category }[],
    newTotal: number
  ) => Promise<any>;
}

export default function PendingOrders({ transactions, products, onConfirmPayment, onUpdateTransactionItems }: PendingOrdersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [txToConfirm, setTxToConfirm] = useState<Transaction | null>(null);
  
  // Payment processing states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [qrisStatus, setQrisStatus] = useState<'WAITING' | 'SUCCESS'>('WAITING');
  const [showDoubleConfirm, setShowDoubleConfirm] = useState(false);
  
  // Add items modal states
  const [txForAddItems, setTxForAddItems] = useState<Transaction | null>(null);
  const [addItemsGrid, setAddItemsGrid] = useState<{ [productId: string]: number }>({});
  const [addItemsSearch, setAddItemsSearch] = useState('');
  const [addItemsCategory, setAddItemsCategory] = useState<Category | 'ALL'>('ALL');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Helper format currency to IDR
  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Filter only 'Belum Bayar' or 'Belum Dibayar' transactions
  const pendingTransactions = useMemo(() => {
    return transactions.filter(t => t.paymentStatus === 'Belum Bayar' || t.paymentStatus === 'Belum Dibayar');
  }, [transactions]);

  // Apply search query filter
  const filteredPending = useMemo(() => {
    if (!searchQuery.trim()) return pendingTransactions;
    const query = searchQuery.toLowerCase();
    return pendingTransactions.filter(t => 
      t.id.toLowerCase().includes(query) || 
      (t.customerName || '').toLowerCase().includes(query) ||
      t.items.some(item => item.name.toLowerCase().includes(query))
    );
  }, [pendingTransactions, searchQuery]);

  // Handle open add items modal
  const handleOpenAddItems = (tx: Transaction) => {
    setTxForAddItems(tx);
    setAddItemsSearch('');
    setAddItemsCategory('ALL');
    
    // Initialize quantities with existing transaction items
    const initialQtys: { [productId: string]: number } = {};
    tx.items.forEach(item => {
      initialQtys[item.productId] = item.quantity;
    });
    setAddItemsGrid(initialQtys);
  };

  // Handle open payment modal
  const handleOpenPayment = (tx: Transaction) => {
    setTxToConfirm(tx);
    setPaymentMethod('CASH');
    setCashAmount('');
    setQrisStatus('WAITING');
    setShowDoubleConfirm(false);
  };

  // Quick cash options helper
  const getCashSuggestions = () => {
    if (!txToConfirm) return [];
    const total = txToConfirm.total;
    const standardBills = [10000, 20000, 50000, 100000, 200000];
    
    // Add Uang Pas and any bills that are greater than or equal to total
    const suggestions = [{ label: 'Uang Pas', value: total }];
    standardBills.forEach(bill => {
      if (bill >= total) {
        suggestions.push({ label: formatIDR(bill), value: bill });
      }
    });
    return suggestions;
  };

  // Change computation
  const changeValue = useMemo(() => {
    if (!txToConfirm) return 0;
    const cashNum = parseFloat(cashAmount) || 0;
    if (cashNum < txToConfirm.total) return 0;
    return cashNum - txToConfirm.total;
  }, [cashAmount, txToConfirm]);

  // Confirm payment handler
  const handleProcessConfirm = async () => {
    if (!txToConfirm) return;
    
    setIsSubmitting(true);
    try {
      const finalAmountPaid = paymentMethod === 'CASH' 
        ? (parseFloat(cashAmount) || txToConfirm.total) 
        : txToConfirm.total;

      const finalChange = paymentMethod === 'CASH'
        ? changeValue
        : 0;

      const paymentDetails = {
        paymentMethod,
        amountPaid: finalAmountPaid,
        changeAmount: finalChange,
        paymentStatus: 'Lunas' as const,
        status_pembayaran: 'Lunas',
        metode_pembayaran: paymentMethod,
        nominal_pembayaran: finalAmountPaid,
        nominal_kembalian: finalChange,
        waktu_pembayaran: new Date().toISOString()
      };

      await onConfirmPayment(txToConfirm.id, paymentDetails);
      
      // Trigger success alert toast
      setSuccessToast('Pembayaran berhasil dikonfirmasi. Pesanan telah dipindahkan ke Riwayat Transaksi.');
      setTxToConfirm(null);
      setShowDoubleConfirm(false);
      
      // Auto dismiss toast after 4 seconds
      setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to confirm payment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPaymentDisabled = useMemo(() => {
    if (!txToConfirm) return true;
    if (paymentMethod === 'CASH') {
      const cashNum = parseFloat(cashAmount) || 0;
      return cashNum < txToConfirm.total;
    }
    if (paymentMethod === 'QRIS') {
      return qrisStatus !== 'SUCCESS';
    }
    return false;
  }, [txToConfirm, paymentMethod, cashAmount, qrisStatus]);

  return (
    <div className="space-y-6">
      {/* Toast Alert Notification */}
      {successToast && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 bg-emerald-600 outline outline-offset-2 outline-emerald-500/10 text-white p-4 rounded-2xl shadow-xl z-50 flex items-start gap-3 animate-slide-in duration-300">
          <div className="bg-white/20 p-1.5 rounded-full mt-0.5 animate-bounce">
            <Check size={16} className="text-white font-bold" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold leading-none mb-1">Sukses</p>
            <p className="text-[11px] text-emerald-50 leading-normal">{successToast}</p>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-white/70 hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-white border border-black/5 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Clock size={11} className="animate-pulse" /> Belum Lunas: {pendingTransactions.length} Pesanan
            </span>
          </div>
          <h2 className="text-xl font-serif font-bold text-stone-800">Daftar Tunggu Pesanan</h2>
          <p className="text-xs text-stone-400">Kasir melakukan verifikasi pembayaran di sini untuk memvalidasi struk and memindahkan data transaksi.</p>
        </div>

        {/* Search input bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
          <input
            type="text"
            placeholder="Cari nomor pesanan atau nama pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] text-xs bg-white"
          />
        </div>
      </div>

      {/* Main content view list */}
      {filteredPending.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-black/5 shadow-sm flex flex-col items-center justify-center min-h-[350px]">
          <div className="bg-[#FAF7F2] p-5 rounded-full text-stone-300 mb-4 border border-stone-100">
            <CheckCircle size={36} className="text-[#D4A373]/70" />
          </div>
          <h3 className="font-serif text-base font-bold text-stone-800">Semua Tagihan Beres</h3>
          <p className="text-xs text-stone-400 max-w-sm mt-1">
            {pendingTransactions.length === 0 
              ? 'Tidak ada pesanan tertunda dengan status "Belum Bayar" saat ini.' 
              : 'Pencarian tidak cocok dengan pesanan tertunda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPending.map((tx) => (
            <div 
              key={tx.id} 
              className="bg-white hover:border-[#D4A373]/30 border border-stone-155 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-sm transition duration-200"
            >
              <div className="space-y-4">
                {/* Header card info */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] text-stone-400 font-mono tracking-widest uppercase block mb-0.5">ID Pesanan</span>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-mono font-bold text-[#3C2A21]">{tx.id}</h4>
                      {onUpdateTransactionItems && (
                        <button
                          type="button"
                          onClick={() => handleOpenAddItems(tx)}
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-[#FAF7F2] hover:bg-[#3C2A21] text-[#3C2A21] hover:text-white border border-stone-200 hover:border-[#3C2A21] rounded-md text-[10px] font-black transition cursor-pointer"
                          title="Tambah / Ubah Menu"
                        >
                          <Plus size={10} className="font-bold text-xs" />
                          <span>Menu</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[10px] px-2.5 py-1 rounded-full font-bold font-sans uppercase tracking-wide select-none">
                    Belum Bayar
                  </span>
                </div>

                {/* Date and Customer */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <div>
                    <span className="text-stone-400 block font-medium">Pelanggan</span>
                    <span className="font-bold text-stone-800 leading-tight block truncate">
                      {tx.customerName || <span className="italic font-normal text-stone-400">Walk-In</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block font-medium">Waktu Pesanan</span>
                    <span className="font-semibold text-stone-700 block truncate">
                      {new Date(tx.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                </div>

                {/* Items menu ordered */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Produk Pesanan:</span>
                  <div className="divide-y divide-stone-100 bg-white border border-stone-150 rounded-xl overflow-hidden px-3 py-1.5 text-xs max-h-36 overflow-y-auto">
                    {tx.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-1.5 first:pt-0.5 last:pb-0.5">
                        <span className="text-stone-700 font-medium line-clamp-1">{item.name} <strong className="text-[#3C2A21] font-bold font-mono">x{item.quantity}</strong></span>
                        <span className="font-mono font-bold text-stone-500 whitespace-nowrap">{formatIDR(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer action buttons */}
              <div className="pt-4 mt-4 border-t border-stone-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-400">Jumlah: {tx.items.reduce((acc, i) => acc + i.quantity, 0)} item</span>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block leading-tight">Total Tagihan</span>
                    <span className="text-sm font-black font-mono text-[#3C2A21]">{formatIDR(tx.total)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPayment(tx)}
                  className="w-full bg-[#3C2A21] hover:bg-[#2A1D17] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm hover:shadow active:scale-98 cursor-pointer"
                >
                  <Check size={14} className="font-bold text-emerald-400" />
                  <span>Konfirmasi Pembayaran</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Payment Wizard Modal */}
      {txToConfirm && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-black/5 animate-scale-in relative">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#F5F2ED] border-b border-stone-200 flex justify-between items-center">
              <div>
                <h3 className="font-serif text-sm font-bold text-stone-800">Pembayaran Pesanan</h3>
                <span className="text-[10px] font-mono text-stone-400">{txToConfirm.id} • {txToConfirm.customerName || 'Walk-In'}</span>
              </div>
              <button 
                onClick={() => setTxToConfirm(null)}
                className="text-stone-450 hover:text-stone-700 bg-white/60 hover:bg-white p-1.5 rounded-full transition cursor-pointer"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Order total header */}
              <div className="bg-[#3C2A21] text-white p-4 rounded-2xl flex justify-between items-center">
                <span className="text-xs font-medium text-stone-300">TOTAL BELANJA:</span>
                <span className="text-xl font-bold font-mono">{formatIDR(txToConfirm.total)}</span>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-[10px] text-stone-400 uppercase tracking-wider font-bold block">Pilih Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('CASH');
                      setCashAmount('');
                    }}
                    className={`py-3 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 cursor-pointer
                      ${paymentMethod === 'CASH'
                        ? 'bg-[#3C2A21] border-[#3C2A21] text-white shadow-sm'
                        : 'bg-white border-stone-200 text-[#3C2A21] hover:bg-stone-50'
                      }`}
                  >
                    <DollarSign size={14} />
                    <span>💵 Tunai / Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('QRIS');
                      setQrisStatus('WAITING');
                    }}
                    className={`py-3 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 cursor-pointer
                      ${paymentMethod === 'QRIS'
                        ? 'bg-[#3C2A21] border-[#3C2A21] text-white shadow-sm'
                        : 'bg-white border-stone-200 text-[#3C2A21] hover:bg-stone-50'
                      }`}
                  >
                    <Smartphone size={14} />
                    <span>📱 QRIS Dinamis</span>
                  </button>
                </div>
              </div>

              {/* CASH SPECIFIC SCREEN */}
              {paymentMethod === 'CASH' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Quick suggestions */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold block">Nominal Cepat</span>
                    <div className="grid grid-cols-3 gap-2">
                      {getCashSuggestions().map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCashAmount(sug.value.toString())}
                          className="bg-stone-50 hover:bg-[#F5F2ED] border border-stone-200 hover:border-stone-300 text-stone-800 font-mono text-[10px] font-semibold py-1.5 px-2 rounded-lg transition cursor-pointer text-center truncate"
                        >
                          {sug.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold block">Input Nominal Manual</span>
                      {parseFloat(cashAmount) > 0 && parseFloat(cashAmount) < txToConfirm.total && (
                        <span className="text-[10px] font-bold text-rose-500">Nominal bayar kurang</span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-mono font-bold text-stone-400">Rp</span>
                      <input
                        type="number"
                        placeholder="Masukkan jumlah uang"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] text-xs font-mono font-bold text-stone-850 bg-white"
                      />
                    </div>
                  </div>

                  {/* Pricing breakdown receipts */}
                  {parseFloat(cashAmount) >= txToConfirm.total && (
                    <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between text-stone-600">
                        <span>Total Belanja:</span>
                        <span>{formatIDR(txToConfirm.total)}</span>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>Uang Diterima:</span>
                        <span className="font-bold">{formatIDR(parseFloat(cashAmount))}</span>
                      </div>
                      <div className="flex justify-between text-emerald-800 font-bold border-t border-dashed border-emerald-200 pt-1.5">
                        <span>KEMBALIAN:</span>
                        <span>{formatIDR(changeValue)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* QRIS SPECIFIC SCREEN */}
              {paymentMethod === 'QRIS' && (
                <div className="space-y-4 text-center animate-in fade-in duration-200">
                  {/* Elegant code QRIS mockup */}
                  <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-stone-150 inline-block w-max mx-auto shadow-inner">
                    <svg width="150" height="150" viewBox="0 0 200 200" className="mx-auto block">
                      <rect width="200" height="200" fill="#FFFFFF" rx="10" />
                      <rect x="75" y="75" width="50" height="50" fill="#111827" rx="8" />
                      <text x="100" y="103" fontSize="12" fill="#FFFFFF" fontFamily="sans-serif" fontWeight="black" textAnchor="middle">QRIS</text>
                      
                      {/* Anchor boxes */}
                      <rect x="15" y="15" width="40" height="40" fill="#111827" rx="4" />
                      <rect x="23" y="23" width="24" height="24" fill="#FFFFFF" rx="2" />
                      <rect x="29" y="29" width="12" height="12" fill="#111827" rx="1" />

                      <rect x="145" y="15" width="40" height="40" fill="#111827" rx="4" />
                      <rect x="153" y="23" width="24" height="24" fill="#FFFFFF" rx="2" />
                      <rect x="159" y="29" width="12" height="12" fill="#111827" rx="1" />

                      <rect x="15" y="145" width="40" height="40" fill="#111827" rx="4" />
                      <rect x="23" y="153" width="24" height="24" fill="#FFFFFF" rx="2" />
                      <rect x="29" y="159" width="12" height="12" fill="#111827" rx="1" />

                      {/* Random pixel bits */}
                      <g fill="#1F2937" opacity="0.8">
                        <rect x="65" y="15" width="10" height="15" />
                        <rect x="80" y="25" width="15" height="10" />
                        <rect x="105" y="15" width="20" height="15" />
                        <rect x="130" y="30" width="10" height="25" />
                        <rect x="15" y="65" width="15" height="10" />
                        <rect x="40" y="65" width="25" height="15" />
                        <rect x="135" y="65" width="15" height="20" />
                        <rect x="155" y="80" width="30" height="10" />
                        <rect x="65" y="145" width="15" height="35" />
                        <rect x="105" y="170" width="15" height="15" />
                        <rect x="130" y="150" width="10" height="35" />
                      </g>
                    </svg>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center justify-center gap-2">
                    {qrisStatus === 'WAITING' ? (
                      <div className="bg-amber-50 text-amber-600 border border-amber-200 py-1.5 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                        <span>Menunggu Pembayaran QRIS</span>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 py-1.5 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Check size={12} className="text-emerald-600 font-bold" />
                        <span>Pembayaran Berhasil</span>
                      </div>
                    )}
                  </div>

                  {/* Simulation Succes triggers */}
                  {qrisStatus === 'WAITING' && (
                    <button
                      type="button"
                      onClick={() => setQrisStatus('SUCCESS')}
                      className="inline-flex items-center gap-1 text-[11px] text-[#A57C55] hover:text-[#3C2A21] underline font-bold cursor-pointer"
                    >
                      <CheckCircle size={12} />
                      Simulasikan Pembayaran Berhasil
                    </button>
                  )}
                </div>
              )}

              {/* Selesaikan CTA Button Trigger */}
              <div className="pt-4 border-t border-stone-150">
                <button
                  type="button"
                  disabled={isPaymentDisabled}
                  onClick={() => setShowDoubleConfirm(true)}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer
                    ${isPaymentDisabled
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                      : 'bg-[#3C2A21] hover:bg-[#201510] text-white shadow-[#3C2A21]/15 active:scale-98'
                    }`}
                >
                  <span>Selesaikan Transaksi</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* SECOND-LEVEL DOUBLE CONFIRMATION DIALOG INNER POPUP */}
            {showDoubleConfirm && (
              <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in z-50">
                <div className="bg-white rounded-2xl w-full max-w-xs p-5 text-center space-y-4 animate-scale-in">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 border border-amber-100 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-bold text-stone-800">Verifikasi Pembayaran</h4>
                    <p className="text-[11px] text-stone-450 mt-1.5 leading-relaxed">
                      Apakah pembayaran sudah diterima dan ingin menyelesaikan transaksi untuk pesanan <strong className="text-stone-700 font-mono">{txToConfirm.id}</strong>?
                    </p>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setShowDoubleConfirm(false)}
                      className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-semibold transition border border-stone-100 cursor-pointer disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleProcessConfirm}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? 'Finalisasi...' : 'Ya, Selesaikan'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ADD / EDIT TRANSACTION ITEMS MODAL */}
      {txForAddItems && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-black/5 animate-scale-in relative flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4 bg-[#F5F2ED] border-b border-stone-200 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="font-serif text-sm font-bold text-stone-800">Edit / Tambah Menu Pesanan</h3>
                <span className="text-[10px] font-mono text-[#D4A373] font-bold">ID Pesanan: {txForAddItems.id} • {txForAddItems.customerName || 'Walk-In'}</span>
              </div>
              <button 
                onClick={() => setTxForAddItems(null)}
                className="text-stone-450 hover:text-stone-700 bg-white/60 hover:bg-white p-1.5 rounded-full transition cursor-pointer"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick search and filter category */}
            <div className="p-4 bg-stone-50 border-b border-stone-150 flex flex-col sm:flex-row gap-3 items-center justify-between flex-shrink-0">
              {/* Category tabs */}
              <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                {([
                  { label: 'Semuan', value: 'ALL' },
                  { label: '☕ Kopi', value: 'KOPI' },
                  { label: '🍹 Non-Kopi', value: 'NON_KOPI' },
                  { label: '🍳 Makanan', value: 'MAKANAN' },
                  { label: '🍰 Cemilan', value: 'CEMILAN' },
                ] as const).map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setAddItemsCategory(cat.value)}
                    className={`text-[10px] px-3 py-1.5 rounded-lg font-semibold transition border whitespace-nowrap cursor-pointer
                      ${addItemsCategory === cat.value
                        ? 'bg-[#3C2A21] border-[#3C2A21] text-white font-bold'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search product input */}
              <div className="relative w-full sm:w-56 flex-shrink-0">
                <Search className="absolute left-2.5 top-2.5 text-stone-400" size={13} />
                <input
                  type="text"
                  placeholder="Cari menu..."
                  value={addItemsSearch}
                  onChange={(e) => setAddItemsSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D4A373] text-[11px] bg-white"
                />
              </div>
            </div>

            {/* Products interactive list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products
                  .filter(p => {
                    const matchCategory = addItemsCategory === 'ALL' || p.category === addItemsCategory;
                    const matchSearch = p.name.toLowerCase().includes(addItemsSearch.toLowerCase()) ||
                                        p.description.toLowerCase().includes(addItemsSearch.toLowerCase());
                    return matchCategory && matchSearch;
                  })
                  .map((p) => {
                    const currentQty = addItemsGrid[p.id] || 0;
                    return (
                      <div 
                        key={p.id} 
                        className={`p-3.5 border rounded-xl flex items-center justify-between transition
                          ${currentQty > 0 
                            ? 'bg-[#FAF7F2] border-[#D4A373] shadow-xs' 
                            : 'bg-white border-stone-150 hover:border-stone-200'}`}
                      >
                        <div className="space-y-1 pr-2 flex-1">
                          <span className="text-[9px] bg-stone-100 text-stone-500 font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider block w-max">
                            {p.category}
                          </span>
                          <h5 className="font-serif text-xs font-bold text-stone-800 leading-tight">{p.name}</h5>
                          <p className="text-[10px] text-stone-450 font-mono font-bold">{formatIDR(p.price)}</p>
                          {!p.isAvailable && (
                            <span className="text-[9px] font-bold text-rose-500 block">Habis / Tidak Tersedia</span>
                          )}
                        </div>

                        {/* Adjust qty buttons */}
                        <div className="flex items-center gap-2">
                          {currentQty > 0 ? (
                            <div className="flex items-center gap-1.5 bg-[#3C2A21] text-white px-2 py-1.5 rounded-lg border border-[#3C2A21]">
                              <button
                                type="button"
                                onClick={() => {
                                  setAddItemsGrid(prev => {
                                    const next = { ...prev };
                                    const val = next[p.id] || 0;
                                    if (val <= 1) {
                                      delete next[p.id];
                                    } else {
                                      next[p.id] = val - 1;
                                    }
                                    return next;
                                  });
                                }}
                                className="hover:bg-white/20 p-0.5 rounded text-white cursor-pointer"
                              >
                                <Minus size={11} className="font-bold" />
                              </button>
                              <span className="font-mono font-bold text-xs min-w-4 text-center">{currentQty}</span>
                              <button
                                type="button"
                                disabled={!p.isAvailable}
                                onClick={() => {
                                  setAddItemsGrid(prev => ({
                                    ...prev,
                                    [p.id]: (prev[p.id] || 0) + 1
                                  }));
                                }}
                                className="hover:bg-white/20 p-0.5 rounded text-white cursor-pointer disabled:opacity-40"
                              >
                                <Plus size={11} className="font-bold" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!p.isAvailable}
                              onClick={() => {
                                setAddItemsGrid(prev => ({
                                  ...prev,
                                  [p.id]: 1
                                }));
                              }}
                              className="px-2.5 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 hover:border-stone-400 text-[#3C2A21] rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                            >
                              <Plus size={10} className="font-bold" />
                              <span>Tambah</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Bottom summary and Action logic */}
            <div className="p-6 border-t border-stone-150 bg-stone-50 flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4 animate-in fade-in">
              {/* Count and total price */}
              <div className="text-center sm:text-left self-start sm:self-auto font-mono">
                <span className="text-[10px] text-stone-400 block leading-tight">TOTAL UPDATE</span>
                <span className="text-base font-black text-[#3C2A21]">
                  {formatIDR(
                    Object.entries(addItemsGrid).reduce((acc, [pId, qty]) => {
                      const prod = products.find(p => p.id === pId);
                      return acc + (prod ? prod.price * (qty as number) : 0);
                    }, 0)
                  )}
                </span>
                <span className="text-[10px] text-stone-450 block mt-0.5">
                  Item terpilih: {Object.values(addItemsGrid).reduce((acc: number, qty) => acc + (qty as number), 0)} item
                </span>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setTxForAddItems(null)}
                  className="px-4 py-2.5 bg-[#FAF7F2] hover:bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold border border-stone-200 cursor-pointer transition flex-1 sm:flex-none text-center"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={Object.keys(addItemsGrid).length === 0}
                  onClick={async () => {
                    // Map selected items to the exact items array schema
                    const newItemsList = Object.entries(addItemsGrid).map(([pId, qty]) => {
                      const prod = products.find(p => p.id === pId);
                      return {
                        productId: pId,
                        name: prod ? prod.name : 'Unknown Product',
                        price: prod ? prod.price : 0,
                        quantity: qty as number,
                        category: prod ? prod.category : 'KOPI' as Category
                      };
                    }).filter(item => item.quantity > 0);

                    const totalNewValue = newItemsList.reduce((acc, item) => acc + (item.price * item.quantity), 0);

                    if (onUpdateTransactionItems) {
                      try {
                        await onUpdateTransactionItems(txForAddItems.id, newItemsList, totalNewValue);
                        
                        // Visual success toast feedback
                        setSuccessToast(`Pesanan ${txForAddItems.id} berhasil diperbarui.`);
                        setTimeout(() => setSuccessToast(null), 3000);
                      } catch (err) {
                        console.error('Failed to update trx:', err);
                      }
                    }

                    // Close modal and reset state
                    setTxForAddItems(null);
                    setAddItemsGrid({});
                  }}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 flex-1 sm:flex-none text-center cursor-pointer shadow-sm
                    ${Object.keys(addItemsGrid).length === 0
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                      : 'bg-[#3C2A21] hover:bg-[#1C110C] text-white shadow-[#3C2A21]/15'}`}
                >
                  <Check size={13} className="font-bold" />
                  <span>Update Pesanan</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
