import { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { Clock, Search, CheckCircle, ChevronRight, Check, X, AlertTriangle, Sparkles } from 'lucide-react';

interface PendingOrdersProps {
  transactions: Transaction[];
  onConfirmPayment: (txId: string) => Promise<void>;
}

export default function PendingOrders({ transactions, onConfirmPayment }: PendingOrdersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [txToConfirm, setTxToConfirm] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Helper format currency to IDR
  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Helper format human-readable timestamp
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) + ' • ' + d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Filter only 'Belum Bayar' transactions
  const pendingTransactions = useMemo(() => {
    return transactions.filter(t => t.paymentStatus === 'Belum Bayar');
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

  // Confirm payment trigger
  const handleConfirm = async () => {
    if (!txToConfirm) return;
    setIsSubmitting(true);
    try {
      await onConfirmPayment(txToConfirm.id);
      
      // Trigger success alert toast
      setSuccessToast('Pembayaran berhasil dikonfirmasi. Pesanan telah dipindahkan ke Riwayat Transaksi.');
      setTxToConfirm(null);
      
      // Auto dismiss toast
      setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to confirm payment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Notification */}
      {successToast && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 bg-emerald-600 outline outline-offset-2 outline-emerald-500/10 text-white p-4 rounded-2xl shadow-xl z-50 flex items-start gap-3 animate-slide-in duration-300">
          <div className="bg-white/20 p-1.5 rounded-full mt-0.5">
            <Check size={16} className="text-white font-bold" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold leading-none mb-1">Sukses</p>
            <p className="text-[11px] text-emerald-50 leading-normal">{successToast}</p>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-white/70 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-white border border-black/5 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 animate-pulse">
              <Clock size={11} /> Belum Lunas: {pendingTransactions.length} Pesanan
            </span>
          </div>
          <h2 className="text-xl font-serif font-bold text-stone-800">Daftar Pesanan Diterima</h2>
          <p className="text-xs text-stone-400">Verifikasikan pembayaran di sini untuk memindahkan pesanan masuk ke riwayat struk resmi.</p>
        </div>

        {/* Search input bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
          <input
            type="text"
            placeholder="Cari pesanan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] text-xs bg-white"
          />
        </div>
      </div>

      {/* Main content view */}
      {filteredPending.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-black/5 shadow-sm flex flex-col items-center justify-center min-h-[350px]">
          <div className="bg-[#FAF7F2] p-5 rounded-full text-stone-300 mb-4 border border-stone-100">
            <CheckCircle size={36} className="text-[#D4A373]/70" />
          </div>
          <h3 className="font-serif text-base font-bold text-stone-800">Semua Tagihan Beres</h3>
          <p className="text-xs text-stone-400 max-w-sm mt-1">
            {pendingTransactions.length === 0 
              ? 'Tidak ada pesanan tertunda dengan status "Belum Bayar" saat ini.' 
              : 'Pencarian tidak cocok dengan pesanan tertunda mana pun.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPending.map((tx) => (
            <div 
              key={tx.id} 
              className="bg-white hover:border-[#D4A373]/50 border border-stone-150 rounded-2xl p-5 flex flex-col justify-between shadow-xs transition duration-200"
            >
              <div className="space-y-4">
                {/* Header card info */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] text-stone-400 font-mono tracking-widest uppercase block mb-0.5">ID Pesanan</span>
                    <h4 className="font-mono font-bold text-[#3C2A21]">{tx.id}</h4>
                  </div>
                  <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide font-mono select-none">
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
                    <span className="font-semibold text-stone-700 block truncate">{new Date(tx.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
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
                  <span className="text-stone-500">Metode: <strong className="text-semibold text-stone-700 font-mono">{tx.paymentMethod}</strong></span>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block leading-tight">Total Tagihan</span>
                    <span className="text-sm font-black font-mono text-[#3C2A21]">{formatIDR(tx.total)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTxToConfirm(tx)}
                  className="w-full bg-[#3C2A21] hover:bg-[#2A1D17] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm hover:shadow active:scale-98 cursor-pointer"
                >
                  <Check size={14} className="font-bold text-emerald-400" />
                  <span>Konfirmasi Sudah Bayar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {txToConfirm && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-black/5 p-6 flex flex-col items-center text-center animate-scale-in">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4 border border-amber-100">
              <AlertTriangle size={22} className="animate-pulse" />
            </div>
            <h3 className="font-serif text-base font-bold text-stone-850">Konfirmasi Pembayaran</h3>
            <p className="text-xs text-stone-500 mt-2 mb-6 px-1 leading-relaxed">
              Apakah Anda yakin pembayaran sebesar <strong className="text-stone-800 font-mono">{formatIDR(txToConfirm.total)}</strong> untuk pesanan <strong className="text-stone-800 font-mono">{txToConfirm.id}</strong> ({txToConfirm.customerName || 'Walk-In'}) sudah diterima?
            </p>
            <div className="flex gap-3 w-full">
              <button
                disabled={isSubmitting}
                onClick={() => setTxToConfirm(null)}
                className="flex-1 py-2.5 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold transition border border-stone-250 cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="flex-1 py-2.5 bg-[#3C2A21] hover:bg-[#2D1F18] text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md shadow-[#3C2A21]/10"
              >
                {isSubmitting ? 'Memproses...' : 'Ya, Sudah Bayar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
