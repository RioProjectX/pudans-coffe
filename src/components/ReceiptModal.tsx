import { Transaction } from '../types';
import { X, Printer, CheckCircle2 } from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export default function ReceiptModal({ transaction, onClose }: ReceiptModalProps) {
  if (!transaction) return null;

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

  const handlePrint = () => {
    const printContent = document.getElementById('printable-receipt')?.innerHTML;
    if (!printContent) return;
    
    // Create an iframe to print cleanly or open standard print dialog
    const originalContent = document.body.innerHTML;
    const style = `
      <style>
        body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; font-size: 12px; }
        .text-center { text-align: center; }
        .w-full { width: 100%; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .border-t-dotted { border-top: 1px dotted #000; margin: 8px 0; }
        .bold { font-weight: bold; }
        .my-4 { margin: 16px 0; }
      </style>
    `;
    
    const win = window.open('', '', 'height=600,width=400');
    if (win) {
      win.document.write('<html><head><title>Print Struk - Pudans Coffee</title>');
      win.document.write(style);
      win.document.write('</head><body>');
      win.document.write(printContent);
      win.document.write('</body></html>');
      win.document.close();
      
      // Delay printing slightly to ensure assets/fonts load
      setTimeout(() => {
        win.focus();
        win.print();
        win.close();
      }, 350);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-stone-100 flex flex-col relative animate-in fade-in-50 zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" /> Transaksi Selesai
          </span>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-stone-200 rounded-full text-stone-400 hover:text-stone-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Outer Struk Envelope with Paper texture */}
        <div className="p-6 bg-stone-100 flex-1 flex flex-col items-center">
          
          {/* Thermal Receipt Body */}
          <div 
            id="printable-receipt"
            className="bg-white w-full shadow-md border-t-4 border-[#3C2A21] p-5 font-mono text-xs text-stone-800 relative rounded-b-2xl"
          >
            {/* Tiny thermal card header cut effect */}
            <div className="absolute left-0 right-0 top-0 h-1 flex justify-between overflow-hidden opacity-10">
              {Array.from({ length: 40 }).map((_, i) => (
                <span key={i} className="inline-block w-2.5 h-2.5 rounded-full bg-stone-900 transform -translate-y-1.5" />
              ))}
            </div>

            {/* Coffee Shop info */}
            <div className="text-center space-y-1 my-2">
              <h2 className="font-serif font-bold text-base tracking-tight text-stone-900 uppercase">Pudans Coffee</h2>
              <p className="text-[10px] text-stone-500 font-sans">Kopi Premium, Cemilan, &amp; Kuliner Harian</p>
              <p className="text-[10px] text-stone-400 font-sans">Jl. Terompet No. 69, Kec. Medan Baru</p>
              <p className="text-[10px] text-stone-400 font-sans">Telp: 0812-3456-7890</p>
            </div>

            {/* Dotteddivider */}
            <div className="border-t border-dashed border-stone-300 my-4"></div>

            {/* Invoice meta */}
            <div className="space-y-1 text-[11px] text-stone-600">
              <div className="flex justify-between">
                <span>No Transaksi:</span>
                <span className="font-bold text-stone-900">{transaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{formatDate(transaction.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-bold text-stone-900">{transaction.customerName || 'Walk-In'}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>Pudans POS Master</span>
              </div>
            </div>

            {/* Dotteddivider */}
            <div className="border-t border-dashed border-stone-300 my-4"></div>

            {/* Items table */}
            <div className="space-y-3 font-mono text-stone-900">
              <div className="flex justify-between font-bold border-b border-dashed border-stone-200 pb-1.5 text-[11px] text-stone-500">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>

              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between text-stone-900 font-semibold">
                    <span className="truncate max-w-[200px]">{item.name}</span>
                    <span>{formatIDR(item.price * item.quantity)}</span>
                  </div>
                  <div className="text-[10px] text-stone-500">
                    {item.quantity} x {formatIDR(item.price)}
                  </div>
                </div>
              ))}
            </div>

            {/* Dotteddivider */}
            <div className="border-t border-dashed border-stone-300 my-4"></div>

            {/* Totals computation */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span>{formatIDR(transaction.subtotal)}</span>
              </div>
              {transaction.tax > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Pajak (PB1 10%):</span>
                  <span>{formatIDR(transaction.tax)}</span>
                </div>
              )}
              {transaction.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon Promo:</span>
                  <span>-{formatIDR(transaction.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-stone-900 border-t border-dashed border-stone-200 pt-1.5">
                <span>TOTAL AKHIR:</span>
                <span>{formatIDR(transaction.total)}</span>
              </div>
            </div>

            {/* Dotteddivider */}
            <div className="border-t border-dashed border-stone-300 my-4"></div>

            {/* Payment Details */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-stone-600">
                <span>Metode Bayar:</span>
                <span className="font-bold text-stone-900">{transaction.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Bayar Diterima:</span>
                <span>{formatIDR(transaction.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Kembalian:</span>
                <span>{formatIDR(transaction.changeAmount)}</span>
              </div>
            </div>

            {/* Dotteddivider */}
            <div className="border-t border-dashed border-stone-300 my-4"></div>

            {/* Receipt Footer */}
            <div className="text-center space-y-1 mt-3">
              <p className="text-[11px] font-bold text-stone-700">Terima Kasih!</p>
              <p className="text-[9px] text-stone-400 font-sans">Silakan kunjungi kami kembali.</p>
              <span className="text-[8px] text-stone-300 block font-mono">Pudans POS v1.0.0</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-stone-100 flex gap-3 bg-stone-50">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-100 hover:text-stone-800 transition text-center"
          >
            Tutup Dialog
          </button>
          
          <button 
            id="print-action-btn"
            onClick={handlePrint}
            className="flex-1 bg-[#3C2A21] hover:bg-[#2A1D17] text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Printer size={15} /> Cetak Struk
          </button>
        </div>
      </div>
    </div>
  );
}
