import { useState } from 'react';
import { useBluetoothPrinter } from '../context/BluetoothPrinterContext';
import { 
  X, 
  Bluetooth, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Send, 
  Unlink, 
  Sparkles, 
  HelpCircle,
  FileText,
  Coins,
  Unlock,
  ShieldCheck
} from 'lucide-react';

const SAMPLE_RECEIPT_TEXT = `================================
         PUDAN'S COFFEE
Kopi Premium, Cemilan & Kuliner
 Jl. Terompet No. 69 Medan Baru
     IG: @pudanscoffee
--------------------------------
No. Struk : TX-CONTOH-001
Tanggal   : 10 Nov 2026 15:30
Kasir     : Pudan's POS Master
Pelanggan : Walk-In
--------------------------------
ITEM                     TOTAL
--------------------------------
Kopi Susu Gula Aren
  2 x Rp 18.000        Rp 36.000
Croissant Butter
  1 x Rp 22.000        Rp 22.000
--------------------------------
Subtotal               Rp 58.000
Pajak PB1 (10%)        Rp  5.800
TOTAL AKHIR            Rp 63.800
--------------------------------
Metode Pembayaran           CASH
Bayar Diterima         Rp 70.000
Kembalian              Rp  6.200
================================
  TERIMA KASIH ATAS KUNJUNGAN!
     Silakan Datang Kembali
================================`;

export default function BluetoothPrinterModal() {
  const {
    isSupported,
    isConnected,
    isConnecting,
    isPrinting,
    deviceInfo,
    lastError,
    statusMessage,
    connectionMode,
    setConnectionMode,
    connect,
    disconnect,
    printTestSlip,
    sendCustomText,
    openCashDrawer,
    autoOpenDrawer,
    setAutoOpenDrawer,
    clearError,
    isSettingsOpen,
    setIsSettingsOpen
  } = useBluetoothPrinter();

  const [customText, setCustomText] = useState(SAMPLE_RECEIPT_TEXT);
  const [showHelp, setShowHelp] = useState(false);

  if (!isSettingsOpen) return null;

  const handleConnect = async () => {
    clearError();
    await connect(connectionMode);
  };

  const handleSendCustomText = async () => {
    if (!customText.trim()) return;
    await sendCustomText(customText);
  };

  return (
    <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-stone-100 flex flex-col relative my-6">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-100 bg-[#3C2A21] text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-[#D4A373] border border-white/10">
              <Bluetooth size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-[#FBF9F6] flex items-center gap-2">
                Printer Termal Bluetooth
                <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-[#D4A373]/30 text-[#F5F2ED] border border-[#D4A373]/40">
                  ESC / POS
                </span>
              </h2>
              <p className="text-xs text-stone-300">
                Web Bluetooth API untuk Iware RPP02N, ZJ-5802, &amp; Printer 58mm/80mm
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(false)}
            className="p-1.5 hover:bg-white/10 rounded-full text-stone-300 hover:text-white transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-130px)] bg-stone-50/50">

          {/* Web Bluetooth Support Warning */}
          {!isSupported && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs flex gap-3">
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Browser Belum Mendukung Web Bluetooth API</p>
                <p className="text-amber-700 mt-1 leading-relaxed">
                  Fitur koneksi langsung Bluetooth memerlukan browser berbasis Chromium dengan koneksi aman (HTTPS / localhost), seperti:
                  <strong> Google Chrome</strong>, <strong>Microsoft Edge</strong>, atau <strong>Chrome di Android</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Status Message / Error Message Banner */}
          {lastError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-rose-800 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Gagal Menghubungkan</p>
                <p className="text-rose-700 mt-0.5">{lastError}</p>
              </div>
              <button 
                onClick={clearError}
                className="text-rose-500 hover:text-rose-800 text-xs font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}

          {statusMessage && !lastError && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Connection Status Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isConnected 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
              : 'bg-white border-stone-200 text-stone-850 shadow-xs'
          }`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition ${
                  isConnected ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-400'
                }`}>
                  <Printer size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">
                      {isConnected ? deviceInfo?.name || 'Printer Bluetooth' : 'Belum Ada Printer Terhubung'}
                    </h3>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isConnected 
                        ? 'bg-emerald-200 text-emerald-800' 
                        : 'bg-stone-200 text-stone-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'}`} />
                      {isConnected ? 'TERHUBUNG' : 'TERPUTUS'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 font-mono">
                    {isConnected 
                      ? `ID: ${deviceInfo?.id || 'Tersambung via BLE GATT'}` 
                      : 'Siap untuk menghubungkan perangkat Iware RPP02N atau printer kasir lainnya'}
                  </p>
                </div>
              </div>

              {isConnected && (
                <button
                  onClick={disconnect}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <Unlink size={13} /> Putuskan
                </button>
              )}
            </div>
          </div>

          {/* Filter options and Connect Button */}
          {!isConnected && (
            <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3 shadow-xs">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-stone-700">Mode Filter Pencarian Bluetooth:</label>
                <button
                  type="button"
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-xs text-[#D4A373] hover:text-[#3C2A21] flex items-center gap-1 font-semibold"
                >
                  <HelpCircle size={13} /> Bantuan Pasang
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  connectionMode === 'escpos_filter' 
                    ? 'border-[#3C2A21] bg-[#F5F2ED]/60 font-semibold text-stone-900' 
                    : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                }`}>
                  <input
                    type="radio"
                    name="mode"
                    value="escpos_filter"
                    checked={connectionMode === 'escpos_filter'}
                    onChange={() => setConnectionMode('escpos_filter')}
                    className="mt-0.5 text-[#3C2A21]"
                  />
                  <div>
                    <span className="block font-bold">Filter Layanan ESC/POS</span>
                    <span className="text-[11px] text-stone-500 font-normal">
                      Khusus Iware RPP02N, ZJ-58, FFE0/18F0, &amp; nama awalan printer
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  connectionMode === 'all_devices' 
                    ? 'border-[#3C2A21] bg-[#F5F2ED]/60 font-semibold text-stone-900' 
                    : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                }`}>
                  <input
                    type="radio"
                    name="mode"
                    value="all_devices"
                    checked={connectionMode === 'all_devices'}
                    onChange={() => setConnectionMode('all_devices')}
                    className="mt-0.5 text-[#3C2A21]"
                  />
                  <div>
                    <span className="block font-bold">Semua Perangkat Bluetooth</span>
                    <span className="text-[11px] text-stone-500 font-normal">
                      Gunakan jika nama printer tidak muncul pada mode filter
                    </span>
                  </div>
                </label>
              </div>

              {/* Primary Connect Button */}
              <button
                type="button"
                id="btn-hubungkan-printer"
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full bg-[#3C2A21] hover:bg-[#2A1D17] text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin text-[#D4A373]" />
                    <span>Mencari &amp; Menghubungkan Printer...</span>
                  </>
                ) : (
                  <>
                    <Bluetooth size={16} className="text-[#D4A373]" />
                    <span>Hubungkan Printer</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Help box */}
          {showHelp && (
            <div className="bg-[#F5F2ED] border border-black/5 rounded-2xl p-4 text-xs text-stone-700 space-y-2 animate-in slide-in-from-top-1">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#D4A373]" /> Petunjuk Printer Iware RPP02N &amp; Thermal BLE
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-stone-600 leading-relaxed text-[11px]">
                <li>Nyalakan printer termal Bluetooth Iware RPP02N (lampu indikator biru/hijau menyala).</li>
                <li>Pastikan Bluetooth pada laptop, tablet, atau HP Anda dalam kondisi <strong>Aktif</strong>.</li>
                <li>Klik tombol <strong>"Hubungkan Printer"</strong> di atas. Dialog browser akan muncul menampilkan daftar perangkat Bluetooth.</li>
                <li>Pilih perangkat bertuliskan <strong>"RPP02N"</strong>, <strong>"Printer001"</strong>, atau <strong>"POS-58"</strong> lalu klik <em>Pair / Hubungkan</em>.</li>
                <li>Setelah status berubah menjadi <span className="text-emerald-700 font-bold">TERHUBUNG</span>, klik <strong>Cetak Tes Struk</strong> untuk memastikan hasil print keluar dengan mulus!</li>
              </ol>
            </div>
          )}

          {/* Quick Actions when Connected */}
          {isConnected && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={printTestSlip}
                disabled={isPrinting}
                className="bg-amber-700 hover:bg-amber-800 text-white py-2.5 px-3 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isPrinting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Printer size={14} />
                )}
                <span>Cetak Lembar Tes Struk</span>
              </button>

              <button
                type="button"
                onClick={openCashDrawer}
                disabled={isPrinting}
                className="bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 px-3 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isPrinting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Unlock size={14} />
                )}
                <span>Buka Cash Drawer (RJ11)</span>
              </button>
            </div>
          )}

          {/* Cash Drawer RJ11 Control & Automation Card */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Coins size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                    Laci Kasir (Cash Drawer RJ11 / DK)
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
                      ESC/POS DK
                    </span>
                  </h4>
                  <p className="text-[10px] text-stone-500">
                    Koneksi kabel RJ11 dari laci kasir ke port DK printer termal
                  </p>
                </div>
              </div>

              {/* Status indicator */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                autoOpenDrawer ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
              }`}>
                {autoOpenDrawer ? 'OTOMATIS AKTIF' : 'NONAKTIF'}
              </span>
            </div>

            <div className="bg-[#FAF7F2] p-3 rounded-xl border border-stone-150 space-y-2 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoOpenDrawer}
                  onChange={(e) => setAutoOpenDrawer(e.target.checked)}
                  className="mt-0.5 rounded text-[#3C2A21] focus:ring-[#3C2A21]"
                />
                <div className="flex-1">
                  <span className="font-bold text-stone-900 block">
                    Buka laci otomatis saat struk pembayaran (bill) keluar
                  </span>
                  <span className="text-[11px] text-stone-500 block leading-tight mt-0.5">
                    Printer akan mengirim pulsa elektrik 12V/24V via RJ11 untuk membuka laci kasir saat transaksi diselesaikan.
                  </span>
                </div>
              </label>

              <div className="flex items-center gap-1.5 text-[10px] text-stone-600 pt-1 border-t border-stone-200/60 font-sans">
                <ShieldCheck size={13} className="text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Aman:</strong> Struk antrian pesanan dapur (kitchen ticket) <em>tidak akan</em> membuka laci kasir demi menjaga keamanan uang kas.
                </span>
              </div>
            </div>

            {isConnected && (
              <button
                type="button"
                onClick={openCashDrawer}
                disabled={isPrinting}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200/80 py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Unlock size={13} className="text-stone-600" />
                <span>Uji / Buka Laci Kasir Sekarang</span>
              </button>
            )}
          </div>

          {/* Interactive simple receipt text send section */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-2.5 shadow-xs">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <FileText size={14} className="text-[#3C2A21]" />
                Kirim Teks Format Struk Sederhana:
              </label>
              <button
                type="button"
                onClick={() => setCustomText(SAMPLE_RECEIPT_TEXT)}
                className="text-[10px] text-stone-400 hover:text-stone-700 underline font-mono"
              >
                Reset Contoh Struk
              </button>
            </div>

            <textarea
              rows={8}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Tulis format teks struk yang ingin dikirimkan langsung ke printer termal..."
              className="w-full text-xs font-mono bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#3C2A21] resize-none"
            />

            <button
              type="button"
              id="btn-kirim-teks-printer"
              onClick={handleSendCustomText}
              disabled={!isConnected || isPrinting || !customText.trim()}
              className="w-full bg-[#3C2A21] hover:bg-[#2A1D17] text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPrinting ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-[#D4A373]" />
                  <span>Mengirim ke Printer...</span>
                </>
              ) : (
                <>
                  <Send size={14} className="text-[#D4A373]" />
                  <span>Kirim Teks ke Printer Bluetooth</span>
                </>
              )}
            </button>
            {!isConnected && (
              <p className="text-[11px] text-stone-400 text-center italic">
                *Hubungkan printer terlebih dahulu untuk mengirim teks langsung.
              </p>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end">
          <button 
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="px-5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
