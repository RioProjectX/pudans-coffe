import React from 'react';
import { useBluetoothPrinter } from '../context/BluetoothPrinterContext';
import { Bluetooth, RefreshCw, Settings2, CheckCircle2 } from 'lucide-react';

export default function BluetoothHeaderButton() {
  const { 
    isConnected, 
    isConnecting, 
    deviceInfo, 
    connect, 
    setIsSettingsOpen 
  } = useBluetoothPrinter();

  const handleQuickConnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConnected) {
      setIsSettingsOpen(true);
    } else {
      await connect('escpos_filter');
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        id="btn-header-bluetooth"
        onClick={handleQuickConnect}
        disabled={isConnecting}
        title={isConnected ? `Printer: ${deviceInfo?.name} (Klik untuk pengaturan)` : 'Hubungkan Printer Termal Bluetooth (ESC/POS)'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs border ${
          isConnected
            ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white border-emerald-400/30'
            : isConnecting
              ? 'bg-[#3C2A21] text-amber-200 border-amber-500/30'
              : 'bg-[#D4A373]/20 hover:bg-[#D4A373]/35 text-[#F5F2ED] border-[#D4A373]/40'
        }`}
      >
        {isConnecting ? (
          <>
            <RefreshCw size={13} className="animate-spin text-amber-300" />
            <span className="hidden sm:inline">Menghubungkan...</span>
          </>
        ) : isConnected ? (
          <>
            <Bluetooth size={13} className="text-white" />
            <span className="truncate max-w-[110px]">
              {deviceInfo?.name || 'Printer Terhubung'}
            </span>
            <CheckCircle2 size={12} className="text-emerald-200 ml-0.5" />
          </>
        ) : (
          <>
            <Bluetooth size={13} className="text-[#D4A373]" />
            <span>Hubungkan Printer</span>
          </>
        )}
      </button>

      {/* Settings Dialog Trigger */}
      <button
        type="button"
        onClick={() => setIsSettingsOpen(true)}
        title="Buka Pengaturan &amp; Format Struk Bluetooth"
        className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
      >
        <Settings2 size={15} />
      </button>
    </div>
  );
}
