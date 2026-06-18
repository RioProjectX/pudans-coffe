import { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { Search, Printer, Calendar, DollarSign, ArrowRight, CornerDownRight, Receipt, Eye, Trash2, RotateCcw } from 'lucide-react';

interface HistoryProps {
  transactions: Transaction[];
  onSelectTransaction: (transaction: Transaction) => void;
  onClearAllTransactions?: () => void;
}

type DateRangeFilter = 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK';

export default function History({ transactions, onSelectTransaction, onClearAllTransactions }: HistoryProps) {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'CASH' | 'QRIS'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('ALL');

  // Previewing selected invoice meta detail local state
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  // Clear confirmation local state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) + ' ' + d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Filter application calculation logic
  const filteredTransactions = useMemo(() => {
    const today = new Date('2026-06-17T10:41:00-07:00');
    
    return transactions.filter(t => {
      // 0. Check payment status
      const isPaid = t.paymentStatus === 'Sudah Bayar' || !t.paymentStatus;
      if (!isPaid) return false;

      // 1. Search Query
      const matchSearch = 
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (t.customerName || 'walk-in').toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

      // 2. Payment Method
      const matchPayment = paymentFilter === 'ALL' || t.paymentMethod === paymentFilter;

      // 3. Date ranges
      const tDate = new Date(t.timestamp);
      let matchDate = true;

      if (dateFilter === 'TODAY') {
        const startOfToday = new Date(today);
        startOfToday.setHours(0, 0, 0, 0);
        matchDate = tDate >= startOfToday;
      } else if (dateFilter === 'YESTERDAY') {
        const startOfYesterday = new Date(today);
        startOfYesterday.setDate(today.getDate() - 1);
        startOfYesterday.setHours(0, 0, 0, 0);

        const endOfYesterday = new Date(today);
        endOfYesterday.setHours(0, 0, 0, 0);

        matchDate = tDate >= startOfYesterday && tDate < endOfYesterday;
      } else if (dateFilter === 'WEEK') {
        const startOf7DaysAgo = new Date(today);
        startOf7DaysAgo.setDate(today.getDate() - 7);
        startOf7DaysAgo.setHours(0, 0, 0, 0);
        matchDate = tDate >= startOf7DaysAgo;
      }

      return matchSearch && matchPayment && matchDate;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // newest first
  }, [transactions, searchQuery, paymentFilter, dateFilter]);

  // Selected Transaction Object
  const selectedTxObj = useMemo(() => {
    return transactions.find(t => t.id === selectedTxId) || null;
  }, [transactions, selectedTxId]);

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-140px)] min-h-[500px]">
      
      {/* List section (Left / Main Panel) */}
      <div className="flex-1 flex flex-col space-y-4 h-full overflow-hidden">
        
        {/* Filter Toolbar components */}
        <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch">
            
            {/* Search Input bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
              <input
                type="text"
                placeholder="Cari nomor struk, nama pelanggan, atau nama produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-stone-150 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] text-xs bg-white"
              />
            </div>

            {/* Selector Method payment */}
            <div className="flex gap-2 flex-wrap md:flex-nowrap">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
                className="px-3 py-2 border border-stone-150 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] bg-white text-xs font-semibold text-stone-600"
              >
                <option value="ALL">💵 Semua Metode</option>
                <option value="CASH">Tunai (Cash)</option>
                <option value="QRIS">QRIS Dinamis</option>
              </select>

              {/* Date Filter selector dropdown */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 border border-stone-150 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] bg-white text-xs font-semibold text-stone-600"
              >
                <option value="ALL">📅 Semua Waktu</option>
                <option value="TODAY">Hari Ini</option>
                <option value="YESTERDAY">Kemarin</option>
                <option value="WEEK">7 Hari Terakhir</option>
              </select>

              {onClearAllTransactions && transactions.length > 0 && (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl focus:outline-none text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  title="Hapus semua riwayat struk transaksi"
                >
                  <Trash2 size={13} /> Kosongkan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* List of completed orders Table card */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm flex-1 overflow-y-auto">
          {filteredTransactions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center text-stone-400 space-y-2">
              <div className="bg-stone-50 p-4 rounded-full">
                <Receipt size={32} className="text-stone-300" />
              </div>
              <p className="text-xs font-semibold">Tidak Ada Riwayat Transaksi</p>
              <p className="text-[11px] max-w-xs text-stone-400">Silakan ubah filter pencarian Anda atau buat transaksi baru dari mesin Kasir.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 min-w-full font-sans">
              {/* Table header hidden on mobile */}
              <div className="hidden md:flex justify-between items-center px-4 py-3 bg-stone-50 text-[10px] uppercase font-bold text-stone-400 font-mono tracking-wider">
                <span className="w-32">No. Transaksi</span>
                <span className="w-48">Tanggal &amp; Waktu</span>
                <span className="w-32">Pelanggan</span>
                <span className="w-24">Metode</span>
                <span className="w-28 text-center">Status</span>
                <span className="w-28 text-right">Total Tagihan</span>
                <span className="w-12"></span>
              </div>

              {filteredTransactions.map((tx) => (
                <div 
                  key={tx.id}
                  onClick={() => setSelectedTxId(tx.id)}
                  className={`flex flex-col md:flex-row md:items-center justify-between px-4 py-3 text-xs transition-all duration-150 cursor-pointer hover:bg-stone-50
                    ${selectedTxId === tx.id ? 'bg-[#F5F2ED] border-l-4 border-[#3C2A21]' : ''}
                  `}
                >
                  {/* Tx code */}
                  <div className="w-full md:w-32 flex items-center gap-2 justify-between md:justify-start">
                    <span className="font-bold font-mono text-[#3C2A21]">{tx.id}</span>
                    <span className={`block md:hidden text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold
                      ${tx.paymentMethod === 'QRIS' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {tx.paymentMethod}
                    </span>
                  </div>

                  {/* Stamp */}
                  <div className="w-full md:w-48 text-stone-500 font-sans mt-0.5 md:mt-0">
                    {formatDate(tx.timestamp)}
                  </div>

                  {/* Customer name */}
                  <div className="w-full md:w-32 font-semibold text-stone-800 mt-0.5 md:mt-0">
                    {tx.customerName || <span className="text-stone-400 italic">Walk-In</span>}
                  </div>

                  {/* Method badge (Desktop only) */}
                  <div className="hidden md:block w-24">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold
                      ${tx.paymentMethod === 'QRIS' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {tx.paymentMethod}
                    </span>
                  </div>

                  {/* Status Pembayaran badge */}
                  <div className="w-full md:w-28 mt-1 md:mt-0 text-left md:text-center flex md:block items-center justify-between">
                    <span className="inline md:hidden text-stone-400 font-sans font-normal">Status:</span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 text-[10px] px-2.5 py-0.2 rounded-full font-bold">
                      Sudah Bayar
                    </span>
                  </div>

                  {/* Bill size */}
                  <div className="w-full md:w-28 text-left md:text-right font-bold text-stone-800 font-mono mt-1 md:mt-0 flex md:block items-center justify-between">
                    <span className="inline md:hidden text-stone-400 font-sans font-normal">Total:</span>
                    <span>{formatIDR(tx.total)}</span>
                  </div>

                  {/* Expand action */}
                  <div className="hidden md:flex w-12 justify-end">
                    <button className="text-stone-400 group-hover:text-stone-200 p-1 bg-stone-100 rounded-lg">
                      <Eye size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel (Right Sidebar) */}
      <div className="w-full xl:w-96 bg-white border border-black/5 rounded-3xl shadow-xl flex flex-col h-full overflow-hidden">
        {selectedTxObj ? (
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Header detail */}
            <div className="p-4 bg-stone-50 border-b border-stone-150 flex justify-between items-center flex-shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] text-stone-400 uppercase tracking-widest block font-bold">Detail Pesanan</span>
                <h4 className="font-mono font-bold text-[#3C2A21]">{selectedTxObj.id}</h4>
              </div>
              <button
                onClick={() => onSelectTransaction(selectedTxObj)}
                className="bg-[#3C2A21] hover:bg-[#2A1D17] text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer size={13} /> Cetak Ulang Struk
              </button>
            </div>

            {/* Scrollable details contents */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Meta logs */}
              <div className="space-y-1.5 text-xs bg-stone-50 p-3 rounded-xl border border-stone-150">
                <div className="flex justify-between">
                  <span className="text-stone-500">Tanggal Transaksi:</span>
                  <span className="font-bold text-stone-800">{formatDate(selectedTxObj.timestamp)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Nama Pelanggan:</span>
                  <span className="font-bold text-stone-850">{selectedTxObj.customerName || 'Walk-In Customer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Metode Pembayaran:</span>
                  <span className="font-bold text-stone-800">{selectedTxObj.paymentMethod}</span>
                </div>
              </div>

              {/* Basket list details */}
              <div className="space-y-2">
                <label className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">Item Dibeli</label>
                <div className="divide-y divide-stone-100 bg-white border border-stone-150 rounded-xl overflow-hidden p-3 space-y-2">
                  {selectedTxObj.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-1.5 first:pt-0 last:pb-0">
                      <div>
                        <span className="font-bold text-stone-800">{item.name}</span>
                        <span className="block text-[10px] text-stone-400 font-mono">
                          {item.quantity} x {formatIDR(item.price)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-stone-700">{formatIDR(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* In-depth computations box */}
              <div className="space-y-2">
                <label className="text-[10px] text-stone-400 uppercase tracking-wider font-bold font-sans">Perhitungan Keuangan</label>
                <div className="bg-[#F5F2ED] p-3.5 rounded-xl border border-black/5 text-xs space-y-2 font-sans">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatIDR(selectedTxObj.subtotal)}</span>
                  </div>
                  {selectedTxObj.tax > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>Pajak (PB1 10%):</span>
                      <span className="font-mono">{formatIDR(selectedTxObj.tax)}</span>
                    </div>
                  )}
                  {selectedTxObj.discount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Diskon Promo:</span>
                      <span className="font-mono">-{formatIDR(selectedTxObj.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-[#3C2A21] border-t border-dashed border-stone-200 pt-2 leading-none mt-2">
                    <span>TOTAL AKHIR:</span>
                    <span className="font-mono">{formatIDR(selectedTxObj.total)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Transaction Audit stats block */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-150 text-[11px] text-stone-500 leading-relaxed font-sans space-y-1">
                <div className="flex justify-between">
                  <span>Jumlah Bayar:</span>
                  <span className="font-mono text-stone-700">{formatIDR(selectedTxObj.amountPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kembalian:</span>
                  <span className="font-mono text-stone-700">{formatIDR(selectedTxObj.changeAmount)}</span>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-stone-400">
            <Receipt size={40} className="text-stone-300 mb-2" />
            <p className="text-xs font-semibold text-stone-600">Pilih Transaksi</p>
            <p className="text-[11px] max-w-xs mt-1 leading-normal">
              Klik salah satu transaksi pada daftar sebelah kiri untuk memuat rincian pesanan dan mencetak struk thermal.
            </p>
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal for Deleting All Records */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-black/5 p-6 flex flex-col items-center text-center animate-scale-in">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4 border border-rose-100">
              <RotateCcw size={20} className="animate-spin-once-now font-bold" />
            </div>
            <h3 className="font-serif text-base font-bold text-stone-850">Kosongkan Riwayat Struk?</h3>
            <p className="text-xs text-[#8E8D8A] mt-2 mb-6">
              Apakah Anda yakin ingin menghapus seluruh riwayat pesanan? Data di monitor dashboard dan rincian transaksi akan diatur ulang kembali ke 0.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold transition border border-stone-250 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (onClearAllTransactions) {
                    onClearAllTransactions();
                  }
                  setSelectedTxId(null);
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
