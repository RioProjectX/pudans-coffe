import { useState } from 'react';
import { Transaction } from '../types';
import { X, Printer, CheckCircle2, Bluetooth, RefreshCw, AlertCircle, Eye, Settings2 } from 'lucide-react';
import { useBluetoothPrinter } from '../context/BluetoothPrinterContext';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export default function ReceiptModal({ transaction, onClose }: ReceiptModalProps) {
  if (!transaction) return null;

  const {
    isConnected,
    isConnecting,
    isPrinting,
    deviceInfo,
    connect,
    printReceipt,
    lastError,
    statusMessage,
    setIsSettingsOpen
  } = useBluetoothPrinter();

  const [printSuccess, setPrintSuccess] = useState<string | null>(null);
  const [showTextPreview, setShowTextPreview] = useState(false);

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

  const handlePrintBrowser = () => {
    const printContent = document.getElementById('printable-receipt')?.innerHTML;
    if (!printContent) return;
    
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
      win.document.write('<html><head><title>Print Struk - Pudan\'s Coffee</title>');
      win.document.write(style);
      win.document.write('</head><body>');
      win.document.write(printContent);
      win.document.write('</body></html>');
      win.document.close();
      
      setTimeout(() => {
        win.focus();
        win.print();
        win.close();
      }, 350);
    }
  };

  const handlePrintBluetooth = async () => {
    setPrintSuccess(null);
    if (!isConnected) {
      const connected = await connect();
      if (!connected) return;
    }

    const success = await printReceipt(transaction);
    if (success) {
      setPrintSuccess(`Struk berhasil dicetak ke ${deviceInfo?.name || 'Printer Bluetooth'}!`);
      setTimeout(() => setPrintSuccess(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-stone-100 flex flex-col relative animate-in fade-in-50 zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" /> Transaksi Selesai
            </span>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="Pengaturan Printer Bluetooth"
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border transition cursor-pointer ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
              }`}
            >
              <Bluetooth size={10} className={isConnected ? 'text-emerald-600' : 'text-stone-400'} />
              <span>{isConnected ? deviceInfo?.name?.substring(0, 12) || 'Printer' : 'Hubungkan'}</span>
            </button>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-stone-200 rounded-full text-stone-400 hover:text-stone-700 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert Banners */}
        {printSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{printSuccess}</span>
          </div>
        )}

        {lastError && (
          <div className="bg-rose-50 border-b border-rose-100 px-4 py-2 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="text-rose-600 flex-shrink-0" />
            <span className="truncate">{lastError}</span>
          </div>
        )}

        {/* Outer Struk Envelope with Paper texture */}
        <div className="p-6 bg-stone-100 flex-1 flex flex-col items-center max-h-[60vh] overflow-y-auto">
          
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
              <h2 className="font-serif font-bold text-base tracking-tight text-stone-900 uppercase">Pudan's Coffee</h2>
              <p className="text-[10px] text-stone-500 font-sans">Kopi Premium, Cemilan, &amp; Kuliner Harian</p>
              <p className="text-[10px] text-stone-400 font-sans">Jl. Terompet No. 69, Kec. Medan Baru</p>
              <p className="text-[10px] text-stone-400 font-sans">IG: @pudanscoffee</p>
            </div>

            {/* Dotted divider */}
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
                <span>Pudan's POS Master</span>
              </div>
            </div>

            {/* Dotted divider */}
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

            {/* Dotted divider */}
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

            {/* Dotted divider */}
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

            {/* Dotted divider */}
            <div className="border-t border-dashed border-stone-300 my-4"></div>

            {/* Receipt Footer */}
            <div className="text-center space-y-1 mt-3">
              <p className="text-[11px] font-bold text-stone-700">Terima Kasih!</p>
              <p className="text-[9px] text-stone-400 font-sans">Silakan kunjungi kami kembali.</p>
              <span className="text-[8px] text-stone-300 block font-mono">Pudan's POS v1.0.0</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-stone-100 flex flex-col gap-2.5 bg-stone-50">
          
          {/* Main Bluetooth Thermal Print Button */}
          <button 
            type="button"
            id="print-bluetooth-action-btn"
            onClick={handlePrintBluetooth}
            disabled={isConnecting || isPrinting}
            className="w-full bg-[#3C2A21] hover:bg-[#2A1D17] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <RefreshCw size={15} className="animate-spin text-[#D4A373]" />
                <span>Menghubungkan ke Printer...</span>
              </>
            ) : isPrinting ? (
              <>
                <RefreshCw size={15} className="animate-spin text-[#D4A373]" />
                <span>Mencetak ke Thermal Bluetooth...</span>
              </>
            ) : (
              <>
                <Bluetooth size={15} className="text-[#D4A373]" />
                <span>
                  {isConnected 
                    ? `Cetak Thermal (${deviceInfo?.name || 'Iware RPP02N'})` 
                    : 'Hubungkan & Cetak Thermal'}
                </span>
              </>
            )}
          </button>

          <div className="flex gap-2">
            {/* Secondary fallback print: Browser window.print() */}
            <button 
              id="print-action-btn"
              type="button"
              onClick={handlePrintBrowser}
              className="flex-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Printer size={14} className="text-stone-500" /> Cetak Browser / PDF
            </button>

            {/* Quick Open Settings button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="Buka Pengaturan Printer"
              className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
            >
              <Settings2 size={14} />
            </button>

            {/* Close button */}
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-100 hover:text-stone-800 transition"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
