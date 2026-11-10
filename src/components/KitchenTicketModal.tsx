import { useState } from 'react';
import { Transaction } from '../types';
import { X, ChefHat, Printer, Bluetooth, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { useBluetoothPrinter } from '../context/BluetoothPrinterContext';

interface KitchenTicketModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onPrinted?: (txId: string) => void;
}

export default function KitchenTicketModal({ transaction, onClose, onPrinted }: KitchenTicketModalProps) {
  if (!transaction) return null;

  const {
    isConnected,
    isConnecting,
    isPrinting,
    deviceInfo,
    connect,
    printKitchenTicket,
    lastError,
    setIsSettingsOpen
  } = useBluetoothPrinter();

  const [printSuccess, setPrintSuccess] = useState<string | null>(null);

  // Extract queue sequence number from ID (e.g. TX-20261110-003 -> 003)
  const parts = transaction.id.split('-');
  const queueNo = parts.length >= 3 ? parts[2] : transaction.id.slice(-3);

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
      }) + ' WIB';
    } catch {
      return dateStr;
    }
  };

  const handlePrintBluetooth = async () => {
    setPrintSuccess(null);
    if (!isConnected) {
      const connected = await connect();
      if (!connected) return;
    }

    const success = await printKitchenTicket(transaction);
    if (success) {
      setPrintSuccess(`Struk antrian dapur berhasil dicetak ke ${deviceInfo?.name || 'Printer Bluetooth'}!`);
      if (onPrinted) onPrinted(transaction.id);
      setTimeout(() => setPrintSuccess(null), 4000);
    }
  };

  const handlePrintBrowser = () => {
    const printContent = document.getElementById('printable-kitchen-ticket')?.innerHTML;
    if (!printContent) return;
    
    const style = `
      <style>
        body { font-family: 'Courier New', Courier, monospace; padding: 15px; color: #000; font-size: 13px; line-height: 1.4; }
        .text-center { text-align: center; }
        .w-full { width: 100%; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .border-t-dashed { border-top: 1px dashed #000; margin: 8px 0; }
        .border-b-dashed { border-bottom: 1px dashed #000; margin: 8px 0; }
        .bold { font-weight: bold; }
        .queue-box { border: 2px solid #000; padding: 6px; text-align: center; font-size: 18px; font-weight: bold; margin: 10px 0; }
        .my-2 { margin: 8px 0; }
        .item-row { margin: 6px 0; font-size: 14px; font-weight: bold; }
      </style>
    `;
    
    const win = window.open('', '', 'height=600,width=400');
    if (win) {
      win.document.write('<html><head><title>Struk Dapur - Pudan\'s Coffee</title>');
      win.document.write(style);
      win.document.write('</head><body>');
      win.document.write(printContent);
      win.document.write('</body></html>');
      win.document.close();
      
      setTimeout(() => {
        win.focus();
        win.print();
        win.close();
        if (onPrinted) onPrinted(transaction.id);
      }, 350);
    }
  };

  const totalQuantity = transaction.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-stone-200 flex flex-col relative my-4">
        
        {/* Header Modal */}
        <div className="p-4 border-b border-stone-150 bg-amber-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-800 text-amber-200">
              <ChefHat size={18} />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-amber-50">Struk Dapur / Kitchen</h3>
              <p className="text-[10px] text-amber-200/80">Tiket antrian &amp; rincian pesanan barista</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-amber-200 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alerts */}
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

        {/* Kitchen Ticket Preview Container */}
        <div className="p-5 bg-stone-100 flex-1 flex flex-col items-center max-h-[62vh] overflow-y-auto">
          <div 
            id="printable-kitchen-ticket"
            className="bg-white w-full shadow-md border-t-4 border-amber-800 p-5 font-mono text-xs text-stone-900 relative rounded-b-2xl"
          >
            {/* Ticket Header */}
            <div className="text-center space-y-1 mb-3">
              <span className="text-[10px] font-bold tracking-widest text-amber-900 uppercase bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                TIKET PESANAN DAPUR
              </span>
              <h2 className="font-serif font-black text-base text-stone-900 uppercase mt-1">PUDAN'S COFFEE</h2>
              <p className="text-[9px] text-stone-400 font-sans">Jl. Terompet No. 69 Medan Baru</p>
            </div>

            {/* Large Queue Number Box */}
            <div className="bg-amber-50/70 border-2 border-dashed border-amber-700/60 rounded-xl p-3 text-center my-3">
              <span className="text-[9px] font-bold text-amber-800 uppercase block tracking-wider font-sans">
                NOMOR ANTRIAN
              </span>
              <span className="font-mono font-black text-2xl text-amber-950 block tracking-tight">
                #{queueNo}
              </span>
            </div>

            {/* Order Meta Info */}
            <div className="space-y-1 text-[11px] text-stone-600 border-b border-dashed border-stone-300 pb-3">
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-bold text-stone-900 font-sans">{transaction.customerName || 'Walk-In'}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu Pesanan:</span>
                <span>{formatDate(transaction.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span>ID Pesanan:</span>
                <span className="font-mono text-[10px]">{transaction.id}</span>
              </div>
            </div>

            {/* Menu Items to Prepare */}
            <div className="my-3 space-y-2">
              <div className="flex justify-between font-bold text-[10px] text-stone-400 uppercase tracking-wider border-b border-stone-200 pb-1">
                <span>QTY &amp; MENU PESANAN</span>
                <span>CEK</span>
              </div>

              {transaction.items.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between py-1 border-b border-stone-100 last:border-b-0">
                  <div className="flex-1 pr-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono font-black text-sm text-amber-950 bg-amber-100/70 px-1.5 py-0.2 rounded">
                        {item.quantity}x
                      </span>
                      <span className="font-bold text-stone-900 text-xs">
                        {item.name}
                      </span>
                    </div>
                    {item.category && (
                      <span className="text-[9px] text-stone-400 block ml-7">
                        Kategori: {item.category}
                      </span>
                    )}
                  </div>
                  {/* Square check box for kitchen cook */}
                  <div className="w-4 h-4 border-2 border-stone-400 rounded-sm mt-0.5 flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* Special Notes / Instructions if any */}
            {transaction.notes && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 my-3 text-[11px]">
                <span className="font-bold text-rose-800 block text-[10px] uppercase">Catatan Pelanggan:</span>
                <p className="text-rose-900 italic font-sans">{transaction.notes}</p>
              </div>
            )}

            {/* Summary Item Count */}
            <div className="border-t-2 border-stone-800 pt-2 flex justify-between items-center text-xs font-bold text-stone-900 mt-3">
              <span>TOTAL PESANAN:</span>
              <span className="font-mono text-sm bg-stone-900 text-white px-2 py-0.5 rounded">
                {totalQuantity} Porsi
              </span>
            </div>

            {/* Ticket Footer */}
            <div className="text-center space-y-1 mt-4 pt-3 border-t border-dashed border-stone-300">
              <p className="text-[10px] font-bold text-stone-700 uppercase">MOHON SEGERA DISIAPKAN</p>
              <p className="text-[9px] text-stone-400 font-sans">Pudan's Barista &amp; Kitchen Team</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-stone-150 bg-stone-50 flex flex-col gap-2">
          
          {/* Main Bluetooth Print Button */}
          <button 
            type="button"
            onClick={handlePrintBluetooth}
            disabled={isConnecting || isPrinting}
            className="w-full bg-amber-900 hover:bg-amber-950 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <RefreshCw size={15} className="animate-spin text-amber-300" />
                <span>Menghubungkan Printer...</span>
              </>
            ) : isPrinting ? (
              <>
                <RefreshCw size={15} className="animate-spin text-amber-300" />
                <span>Mencetak Struk Dapur...</span>
              </>
            ) : (
              <>
                <Bluetooth size={15} className="text-amber-300" />
                <span>
                  {isConnected 
                    ? `Cetak Tiket Dapur (${deviceInfo?.name || 'Iware RPP02N'})` 
                    : 'Hubungkan & Cetak Tiket Dapur'}
                </span>
              </>
            )}
          </button>

          <div className="flex gap-2">
            <button 
              type="button"
              onClick={handlePrintBrowser}
              className="flex-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Printer size={13} className="text-stone-500" /> Cetak Browser / PDF
            </button>

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
