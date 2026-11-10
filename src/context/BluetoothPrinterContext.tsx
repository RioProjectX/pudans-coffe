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
  printReceipt: (transaction: Transaction) => Promise<boolean>;
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

  const printReceipt = useCallback(async (transaction: Transaction): Promise<boolean> => {
    if (!isConnected) {
      setLastError('Printer Bluetooth belum terhubung.');
      return false;
    }

    setIsPrinting(true);
    setLastError(null);
    setStatusMessage('Mengirim data struk ke printer...');

    try {
      await bluetoothPrinter.printReceipt(transaction);
      setStatusMessage('Struk berhasil dicetak!');
      return true;
    } catch (err: any) {
      console.error('Print error:', err);
      setLastError(err.message || 'Gagal mengirim data ke printer.');
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
