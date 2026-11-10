/**
 * Web Bluetooth ESC/POS Thermal Printer Driver
 * Specifically engineered for 58mm / 80mm Bluetooth thermal printers (e.g. Iware RPP02N, ZJ-5802, Panda, MPT-II, POS-58).
 */

import { Transaction } from '../types';

// Standard ESC/POS Bluetooth Service UUIDs commonly used by thermal printers
export const ESCPOS_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard 18F0 service
  '0000ffe0-0000-1000-8000-00805f9b34fb', // FFE0 service (Iware RPP02N, HM-10, ZJ-58, Goojprt)
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent profile
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Pos-print service
];

// Write characteristic UUIDs
export const ESCPOS_CHARACTERISTICS = [
  '00002af1-0000-1000-8000-00805f9b34fb', // 2AF1
  '0000ffe1-0000-1000-8000-00805f9b34fb', // FFE1
  '49535343-8841-43f4-a8d4-ecbe34729bb3', // ISSC Tx
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
];

// ESC/POS Command Byte Constants
export const ESC = 0x1b;
export const GS = 0x1d;

export const COMMANDS = {
  INIT: new Uint8Array([ESC, 0x40]), // ESC @ (Initialize printer)
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]), // ESC a 0
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]), // ESC a 1
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]), // ESC a 2
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]), // ESC E 1
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]), // ESC E 0
  DOUBLE_SIZE: new Uint8Array([GS, 0x21, 0x11]), // GS ! 0x11 (Double Height & Width)
  NORMAL_SIZE: new Uint8Array([GS, 0x21, 0x00]), // GS ! 0x00 (Normal font size)
  FEED_3_LINES: new Uint8Array([ESC, 0x64, 0x03]), // Feed 3 lines
  FEED_4_LINES: new Uint8Array([ESC, 0x64, 0x04]), // Feed 4 lines
  CUT_PARTIAL: new Uint8Array([GS, 0x56, 0x42, 0x00]), // GS V 66 0
  // Universal ESC/POS RJ11 Drawer Kick Pulse (Pin 2 + Pin 5 + DLE DC4 real-time kick)
  DRAWER_KICK: new Uint8Array([
    ESC, 0x70, 0x00, 0x19, 0xfa, // ESC p 0 25 250 (Pin 2: 50ms pulse)
    ESC, 0x70, 0x01, 0x19, 0xfa, // ESC p 1 25 250 (Pin 5)
    0x10, 0x14, 0x01, 0x00, 0x01  // DLE DC4 real-time drawer kick
  ]),
};

export interface BluetoothPrinterDevice {
  id: string;
  name: string;
  device: BluetoothDevice;
  server?: BluetoothRemoteGATTServer;
  characteristic?: BluetoothRemoteGATTCharacteristic;
}

export type ConnectionMode = 'escpos_filter' | 'all_devices';

class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  /**
   * Check if Web Bluetooth API is supported by the current browser environment
   */
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator && !!navigator.bluetooth;
  }

  /**
   * Returns current connection state
   */
  public isConnected(): boolean {
    return !!(this.server && this.server.connected && this.writeCharacteristic);
  }

  /**
   * Get connected device details
   */
  public getConnectedDeviceInfo(): { name: string; id: string } | null {
    if (!this.device) return null;
    return {
      name: this.device.name || 'Printer Bluetooth',
      id: this.device.id,
    };
  }

  /**
   * Set callback when printer disconnects unexpectedly
   */
  public setDisconnectHandler(callback: () => void) {
    this.onDisconnectCallback = callback;
  }

  /**
   * Request Bluetooth device and connect
   * Triggers navigator.bluetooth.requestDevice() with ESC/POS service filter
   */
  public async connectPrinter(mode: ConnectionMode = 'escpos_filter'): Promise<{ name: string; id: string }> {
    if (!this.isSupported()) {
      throw new Error(
        'Web Bluetooth API tidak didukung pada browser ini. Pastikan Anda menggunakan Google Chrome, Microsoft Edge, atau Chrome untuk Android.'
      );
    }

    // Configure request options
    let requestOptions: RequestDeviceOptions;

    if (mode === 'escpos_filter') {
      // Filter for ESC/POS services and common thermal printer name prefixes (Iware RPP02N, POS, etc.)
      requestOptions = {
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
          { services: ['0000ffe0-0000-1000-8000-00805f9b34fb'] },
          { namePrefix: 'RPP' },
          { namePrefix: 'Iware' },
          { namePrefix: 'POS' },
          { namePrefix: 'MPT' },
          { namePrefix: 'ZJ' },
          { namePrefix: 'Printer' },
          { namePrefix: 'Bluetooth' },
        ],
        optionalServices: ESCPOS_SERVICES,
      };
    } else {
      // Broad discovery mode allowing any nearby Bluetooth device with ESC/POS optional services
      requestOptions = {
        acceptAllDevices: true,
        optionalServices: ESCPOS_SERVICES,
      };
    }

    try {
      console.log('[Web Bluetooth] Requesting device with options:', requestOptions);
      const selectedDevice = await navigator.bluetooth.requestDevice(requestOptions);

      if (!selectedDevice) {
        throw new Error('Tidak ada perangkat printer yang dipilih.');
      }

      this.device = selectedDevice;

      // Handle spontaneous disconnection event
      this.device.onadvertisementreceived = null;
      this.device.addEventListener('gattserverdisconnected', () => {
        console.warn('[Web Bluetooth] Printer terputus (gattserverdisconnected).');
        this.server = null;
        this.writeCharacteristic = null;
        if (this.onDisconnectCallback) {
          this.onDisconnectCallback();
        }
      });

      console.log(`[Web Bluetooth] Menghubungkan ke GATT Server: ${this.device.name || this.device.id}...`);
      if (!this.device.gatt) {
        throw new Error('Perangkat tidak memiliki antarmuka GATT Bluetooth.');
      }

      this.server = await this.device.gatt.connect();
      console.log('[Web Bluetooth] GATT Server terhubung. Mencari karakteristik tulis printer...');

      // Locate the writable characteristic for ESC/POS
      this.writeCharacteristic = await this.findWriteCharacteristic(this.server);

      console.log('[Web Bluetooth] Berhasil terhubung ke printer:', {
        name: this.device.name,
        charUuid: this.writeCharacteristic.uuid,
      });

      // Send initial reset command to prepare printer
      await this.sendRaw(COMMANDS.INIT);

      return {
        name: this.device.name || 'Printer Bluetooth ESC/POS',
        id: this.device.id,
      };
    } catch (err: any) {
      this.disconnect();
      console.error('[Web Bluetooth Error]:', err);
      if (err.name === 'NotFoundError' || err.message?.includes('User cancelled')) {
        throw new Error('Pemilihan printer Bluetooth dibatalkan oleh pengguna.');
      }
      if (err.name === 'SecurityError') {
        throw new Error('Izin Bluetooth dibatasi oleh browser atau kebijakan privasi.');
      }
      throw new Error(err.message || 'Gagal menghubungkan ke printer Bluetooth.');
    }
  }

  /**
   * Disconnect from current Bluetooth printer
   */
  public disconnect() {
    try {
      if (this.device && this.device.gatt && this.device.gatt.connected) {
        this.device.gatt.disconnect();
      }
    } catch (e) {
      console.warn('[Web Bluetooth] Disconnect warning:', e);
    } finally {
      this.device = null;
      this.server = null;
      this.writeCharacteristic = null;
    }
  }

  /**
   * Search for writable characteristic across known and discovered services
   */
  private async findWriteCharacteristic(
    server: BluetoothRemoteGATTServer
  ): Promise<BluetoothRemoteGATTCharacteristic> {
    // 1. Try known ESC/POS services first
    for (const serviceUuid of ESCPOS_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            return char;
          }
        }
      } catch {
        // Continue searching other services
      }
    }

    // 2. Discover all primary services if specific ones were not matched
    try {
      const allServices = await server.getPrimaryServices();
      for (const service of allServices) {
        try {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              return char;
            }
          }
        } catch {
          // Ignore service read error
        }
      }
    } catch (e) {
      console.warn('[Web Bluetooth] Error during all-services traversal:', e);
    }

    throw new Error(
      'Karakteristik penulisan data (Write Characteristic) tidak ditemukan pada printer ini. Pastikan printer mendukung profil ESC/POS Bluetooth.'
    );
  }

  /**
   * Send binary byte buffer in chunks (safeguarding BLE MTU of 20-50 bytes for Iware RPP02N)
   */
  public async sendRaw(data: Uint8Array): Promise<void> {
    if (!this.isConnected() || !this.writeCharacteristic) {
      throw new Error('Printer Bluetooth belum terhubung. Silakan klik tombol "Hubungkan Printer" terlebih dahulu.');
    }

    // Typical 58mm BLE thermal printers handle ~40 to 64 bytes per packet safely
    const CHUNK_SIZE = 48;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      if (this.writeCharacteristic.properties.writeWithoutResponse) {
        await this.writeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.writeCharacteristic.writeValue(chunk);
      }
      // Small pause between chunks to avoid buffer overflow on micro-controllers
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  /**
   * Send raw formatted text string directly to the printer
   * Satisfies: "fungsi untuk mengirim teks format struk sederhana ke printer"
   */
  public async sendSimpleText(text: string): Promise<void> {
    const encoder = new TextEncoder();
    // Prepend init command and append linefeeds
    const initBytes = COMMANDS.INIT;
    const textBytes = encoder.encode(text + '\n\n\n\n');
    const cutBytes = COMMANDS.CUT_PARTIAL;

    const merged = new Uint8Array(initBytes.length + textBytes.length + cutBytes.length);
    merged.set(initBytes, 0);
    merged.set(textBytes, initBytes.length);
    merged.set(cutBytes, initBytes.length + textBytes.length);

    await this.sendRaw(merged);
  }

  /**
   * Generate simple formatted text for a 32-column 58mm thermal receipt
   */
  public generateSimpleReceiptText(transaction: Transaction, colWidth: number = 32): string {
    const lines: string[] = [];
    const div = '='.repeat(colWidth);
    const subDiv = '-'.repeat(colWidth);

    const padCenter = (str: string) => {
      const text = str.trim();
      if (text.length >= colWidth) return text.substring(0, colWidth);
      const remaining = colWidth - text.length;
      const left = Math.floor(remaining / 2);
      return ' '.repeat(left) + text;
    };

    const padTwoCol = (left: string, right: string) => {
      const l = left.trim();
      const r = right.trim();
      const available = colWidth - r.length;
      if (l.length >= available) {
        return l.substring(0, Math.max(0, available - 1)) + ' ' + r;
      }
      return l + ' '.repeat(colWidth - l.length - r.length) + r;
    };

    const formatIDR = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

    // Header
    lines.push(div);
    lines.push(padCenter("PUDAN'S COFFEE"));
    lines.push(padCenter('Kopi Premium, Cemilan & Kuliner'));
    lines.push(padCenter('Jl. Terompet No. 69, Medan Baru'));
    lines.push(padCenter('IG: @pudanscoffee'));
    lines.push(subDiv);

    // Meta details
    lines.push(padTwoCol('No. Struk', transaction.id));
    const txDate = transaction.timestamp ? transaction.timestamp.replace('T', ' ').substring(0, 16) : '-';
    lines.push(padTwoCol('Tanggal', txDate));
    lines.push(padTwoCol('Pelanggan', transaction.customerName || 'Walk-In'));
    lines.push(padTwoCol('Kasir', "Pudan's POS"));
    lines.push(subDiv);

    // Items Header
    lines.push(padTwoCol('ITEM', 'TOTAL'));
    lines.push(subDiv);

    // Items List
    transaction.items.forEach((item) => {
      lines.push(item.name.substring(0, colWidth));
      const qtyPrice = `  ${item.quantity} x ${formatIDR(item.price)}`;
      const itemTotal = formatIDR(item.price * item.quantity);
      lines.push(padTwoCol(qtyPrice, itemTotal));
    });

    lines.push(subDiv);

    // Totals
    lines.push(padTwoCol('Subtotal', formatIDR(transaction.subtotal)));
    if (transaction.tax > 0) {
      lines.push(padTwoCol('Pajak PB1 (10%)', formatIDR(transaction.tax)));
    }
    if (transaction.discount > 0) {
      lines.push(padTwoCol('Diskon Promo', `-${formatIDR(transaction.discount)}`));
    }
    lines.push(padTwoCol('TOTAL AKHIR', formatIDR(transaction.total)));
    lines.push(subDiv);

    // Payment Info
    lines.push(padTwoCol('Metode Pembayaran', transaction.paymentMethod || 'CASH'));
    if (transaction.amountPaid) {
      lines.push(padTwoCol('Nominal Bayar', formatIDR(transaction.amountPaid)));
    }
    if (transaction.changeAmount !== undefined) {
      lines.push(padTwoCol('Kembalian', formatIDR(transaction.changeAmount)));
    }

    lines.push(div);
    lines.push(padCenter('TERIMA KASIH ATAS KUNJUNGAN ANDA!'));
    lines.push(padCenter('Silakan Datang Kembali'));
    lines.push(padCenter("Pudan's POS Master v1.0"));
    lines.push(div);

    return lines.join('\n');
  }

  /**
   * Send ESC/POS pulse to open RJ11/RJ12 Cash Drawer connected to the printer
   */
  public async openCashDrawer(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Printer Bluetooth belum terhubung.');
    }
    console.log('[Web Bluetooth ESC/POS] Mengirim pulsa elektrik pembuka Cash Drawer RJ11...');
    await this.sendRaw(COMMANDS.DRAWER_KICK);
  }

  /**
   * Print a complete transaction receipt with styled ESC/POS commands
   * @param openDrawer If true, triggers RJ11 cash drawer kick (only for payment bill, NOT for kitchen queue slips)
   */
  public async printReceipt(
    transaction: Transaction,
    colWidth: number = 32,
    openDrawer: boolean = true
  ): Promise<void> {
    const rawText = this.generateSimpleReceiptText(transaction, colWidth);
    const encoder = new TextEncoder();
    const initBytes = COMMANDS.INIT;
    const kickBytes = openDrawer ? COMMANDS.DRAWER_KICK : new Uint8Array(0);
    const textBytes = encoder.encode(rawText + '\n\n\n\n');
    const cutBytes = COMMANDS.CUT_PARTIAL;

    const totalLength = initBytes.length + kickBytes.length + textBytes.length + cutBytes.length;
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    merged.set(initBytes, offset); offset += initBytes.length;
    if (openDrawer) {
      merged.set(kickBytes, offset); offset += kickBytes.length;
    }
    merged.set(textBytes, offset); offset += textBytes.length;
    merged.set(cutBytes, offset); offset += cutBytes.length;

    await this.sendRaw(merged);
  }

  /**
   * Generate clean formatted text for Kitchen Order Ticket (KOT / Struk Dapur)
   */
  public generateKitchenTicketText(transaction: Transaction, colWidth: number = 32): string {
    const lines: string[] = [];
    const div = '='.repeat(colWidth);
    const subDiv = '-'.repeat(colWidth);

    const padCenter = (str: string) => {
      const text = str.trim();
      if (text.length >= colWidth) return text.substring(0, colWidth);
      const remaining = colWidth - text.length;
      const left = Math.floor(remaining / 2);
      return ' '.repeat(left) + text;
    };

    const padTwoCol = (left: string, right: string) => {
      const l = left.trim();
      const r = right.trim();
      const available = colWidth - r.length;
      if (l.length >= available) {
        return l.substring(0, Math.max(0, available - 1)) + ' ' + r;
      }
      return l + ' '.repeat(colWidth - l.length - r.length) + r;
    };

    // Extract queue index or sequence from invoice ID
    const parts = transaction.id.split('-');
    const queueNo = parts.length >= 3 ? parts[2] : transaction.id.slice(-4);

    lines.push(div);
    lines.push(padCenter('*** STRUK DAPUR / KITCHEN ***'));
    lines.push(padCenter("PUDAN'S COFFEE"));
    lines.push(div);
    lines.push(padTwoCol('NO. ANTRIAN', `#${queueNo}`));
    lines.push(padTwoCol('PELANGGAN', transaction.customerName || 'Walk-In'));
    const txTime = transaction.timestamp ? transaction.timestamp.replace('T', ' ').substring(0, 16) : '-';
    lines.push(padTwoCol('WAKTU', txTime));
    lines.push(padTwoCol('ID PESANAN', transaction.id));
    lines.push(subDiv);
    lines.push(padTwoCol('QTY  MENU PESANAN', 'CEK'));
    lines.push(subDiv);

    let totalQty = 0;
    transaction.items.forEach((item) => {
      totalQty += item.quantity;
      lines.push(`[ ] ${item.quantity}x ${item.name.substring(0, colWidth - 8)}`);
    });

    lines.push(subDiv);
    if (transaction.notes) {
      lines.push(`Catatan: ${transaction.notes}`);
      lines.push(subDiv);
    }
    lines.push(padTwoCol('TOTAL PESANAN', `${totalQty} Porsi`));
    lines.push(div);
    lines.push(padCenter('MOHON SEGERA DISIAPKAN'));
    lines.push(padCenter("Barista & Kitchen Team"));
    lines.push(div);

    return lines.join('\n');
  }

  /**
   * Print a kitchen order ticket
   */
  public async printKitchenTicket(transaction: Transaction, colWidth: number = 32): Promise<void> {
    const rawText = this.generateKitchenTicketText(transaction, colWidth);
    await this.sendSimpleText(rawText);
  }

  /**
   * Print a test slip to confirm printer communication
   */
  public async printTestSlip(): Promise<void> {
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const deviceName = this.device?.name || 'Iware RPP02N (Bluetooth)';

    const text = [
      '================================',
      '     TES PRINTER BLUETOOTH      ',
      `      ${deviceName.substring(0, 26)}      `,
      '--------------------------------',
      `Status : BERHASIL TERHUBUNG`,
      `Waktu  : ${dateStr} ${timeStr}`,
      `Sistem : Pudan's Coffee POS`,
      '--------------------------------',
      'Format Struk Thermal 58mm / 32 Kolom',
      '12345678901234567890123456789012',
      '--------------------------------',
      '  PRINTER SIAP MENCETAK STRUK!  ',
      '================================',
    ].join('\n');

    await this.sendSimpleText(text);
  }
}

// Singleton instance
export const bluetoothPrinter = new BluetoothPrinterService();
