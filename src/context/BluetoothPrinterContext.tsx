import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { bluetoothPrinter, ConnectionMode } from '../lib/bluetoothPrinter';
import { Transaction } from '../types';

interface BluetoothPrinterContextType {
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  isPrinting: boolean;
  deviceInfo: { name: string; id: string } | null;
  lastError: string | null;
  connectionMode: ConnectionMode;
  setConnectionMode: (mode: ConnectionMode) => void;
  connect: (mode?: ConnectionMode) => Promise<boolean>;
  disconnect: () => void;
  printReceipt: (transaction: Transaction, openDrawerOverride?: boolean) => Promise<boolean>;
  printKitchenTicket: (transaction: Transaction) => Promise<boolean>;
  openCashDrawer: () => Promise<boolean>;
  autoOpenDrawer: boolean;
  setAutoOpenDrawer: (open: boolean) => void;
  printTestSlip: () => Promise<boolean>;
  sendCustomText: (text: string) => Promise<boolean>;
  clearError: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  statusMessage: string | null;
}

const BluetoothPrinterContext = createContext<BluetoothPrinterContextType | undefined>(undefined);

export function BluetoothPrinterProvider({ children }: { children: ReactNode }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ name: string; id: string } | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('escpos_filter');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [autoOpenDrawer, setAutoOpenDrawerState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pudans_auto_drawer');
      return saved !== null ? saved === 'true' : true; // Default: true (otomatis buka saat bill keluar)
    }
    return true;
  });

  const setAutoOpenDrawer = (val: boolean) => {
    setAutoOpenDrawerState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pudans_auto_drawer', String(val));
    }
  };

  useEffect(() => {
    setIsSupported(bluetoothPrinter.isSupported());

    bluetoothPrinter.setDisconnectHandler(() => {
      setIsConnected(false);
      setDeviceInfo(null);
      setStatusMessage('Printer Bluetooth terputus.');
    });
  }, []);

  const connect = useCallback(async (mode?: ConnectionMode): Promise<boolean> => {
    const selectedMode = mode || connectionMode;
    setIsConnecting(true);
    setLastError(null);
    setStatusMessage('Membuka dialog pencarian printer Bluetooth...');

    try {
      const dev = await bluetoothPrinter.connectPrinter(selectedMode);
      setIsConnected(true);
      setDeviceInfo(dev);
      setStatusMessage(`Terhubung ke ${dev.name}`);
      return true;
    } catch (err: any) {
      console.error('Connection error:', err);
      setLastError(err.message || 'Gagal menghubungkan ke printer Bluetooth.');
      setIsConnected(false);
      setDeviceInfo(null);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [connectionMode]);

  const disconnect = useCallback(() => {
    bluetoothPrinter.disconnect();
    setIsConnected(false);
    setDeviceInfo(null);
    setStatusMessage('Koneksi printer telah diputuskan.');
  }, []);

  const printReceipt = useCallback(async (transaction: Transaction, openDrawerOverride?: boolean): Promise<boolean> => {
    if (!isConnected) {
      setLastError('Printer Bluetooth belum terhubung.');
      return false;
    }

    setIsPrinting(true);
    setLastError(null);
    const shouldOpenDrawer = openDrawerOverride !== undefined ? openDrawerOverride : autoOpenDrawer;
    setStatusMessage(shouldOpenDrawer ? 'Mencetak struk & membuka laci kasir (RJ11)...' : 'Mengirim data struk ke printer...');

    try {
      await bluetoothPrinter.printReceipt(transaction, 32, shouldOpenDrawer);
      setStatusMessage(shouldOpenDrawer ? 'Struk berhasil dicetak & laci kasir terbuka!' : 'Struk berhasil dicetak!');
      return true;
    } catch (err: any) {
      console.error('Print error:', err);
      setLastError(err.message || 'Gagal mengirim data ke printer.');
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [isConnected, autoOpenDrawer]);

  const openCashDrawer = useCallback(async (): Promise<boolean> => {
    if (!isConnected) {
      setLastError('Printer Bluetooth belum terhubung.');
      return false;
    }

    setIsPrinting(true);
    setLastError(null);
    setStatusMessage('Mengirim sinyal pembuka laci kasir (RJ11)...');

    try {
      await bluetoothPrinter.openCashDrawer();
      setStatusMessage('Laci kasir (Cash Drawer) berhasil terbuka!');
      return true;
    } catch (err: any) {
      console.error('Open cash drawer error:', err);
      setLastError(err.message || 'Gagal membuka laci kasir. Pastikan kabel RJ11 tercolok erat ke port DK printer.');
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [isConnected]);

  const printKitchenTicket = useCallback(async (transaction: Transaction): Promise<boolean> => {
    if (!isConnected) {
      setLastError('Printer Bluetooth belum terhubung.');
      return false;
    }

    setIsPrinting(true);
    setLastError(null);
    setStatusMessage('Mencetak struk antrian pesanan ke dapur...');

    try {
      await bluetoothPrinter.printKitchenTicket(transaction);
      setStatusMessage('Struk dapur berhasil dicetak!');
      return true;
    } catch (err: any) {
      console.error('Kitchen ticket print error:', err);
      setLastError(err.message || 'Gagal mengirim struk pesanan ke dapur.');
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [isConnected]);

  const printTestSlip = useCallback(async (): Promise<boolean> => {
    if (!isConnected) {
      setLastError('Printer Bluetooth belum terhubung.');
      return false;
    }

    setIsPrinting(true);
    setLastError(null);
    setStatusMessage('Mencetak lembar tes struk...');

    try {
      await bluetoothPrinter.printTestSlip();
      setStatusMessage('Lembar tes berhasil dicetak!');
      return true;
    } catch (err: any) {
      console.error('Test print error:', err);
      setLastError(err.message || 'Gagal mencetak lembar tes.');
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [isConnected]);

  const sendCustomText = useCallback(async (text: string): Promise<boolean> => {
    if (!isConnected) {
      setLastError('Printer Bluetooth belum terhubung.');
      return false;
    }

    setIsPrinting(true);
    setLastError(null);
    setStatusMessage('Mengirim teks kustom ke printer...');

    try {
      await bluetoothPrinter.sendSimpleText(text);
      setStatusMessage('Teks berhasil dikirim ke printer!');
      return true;
    } catch (err: any) {
      console.error('Send text error:', err);
      setLastError(err.message || 'Gagal mengirim teks ke printer.');
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [isConnected]);

  const clearError = () => setLastError(null);

  return (
    <BluetoothPrinterContext.Provider
      value={{
        isSupported,
        isConnected,
        isConnecting,
        isPrinting,
        deviceInfo,
        lastError,
        connectionMode,
        setConnectionMode,
        connect,
        disconnect,
        printReceipt,
        printKitchenTicket,
        openCashDrawer,
        autoOpenDrawer,
        setAutoOpenDrawer,
        printTestSlip,
        sendCustomText,
        clearError,
        isSettingsOpen,
        setIsSettingsOpen,
        statusMessage,
      }}
    >
      {children}
    </BluetoothPrinterContext.Provider>
  );
}

export function useBluetoothPrinter() {
  const context = useContext(BluetoothPrinterContext);
  if (!context) {
    throw new Error('useBluetoothPrinter must be used within a BluetoothPrinterProvider');
  }
  return context;
}
