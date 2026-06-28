export type Category = 'KOPI' | 'NON_KOPI' | 'MAKANAN' | 'CEMILAN';

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  description: string;
  image: string;
  isAvailable: boolean;
  stock?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'CASH' | 'QRIS';

export interface Transaction {
  id: string; // e.g. "TX-20260617-0001"
  timestamp: string; // ISO String or human readable
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    category: Category;
  }[];
  subtotal: number;
  tax: number; // 10% PB1 usually for premium shops
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeAmount: number;
  customerName?: string;
  notes?: string;
  paymentStatus?: 'Belum Bayar' | 'Sudah Bayar' | 'Belum Dibayar' | 'Lunas';
  status_pembayaran?: string;
  metode_pembayaran?: string;
  nominal_pembayaran?: number;
  nominal_kembalian?: number;
  waktu_pembayaran?: string;

  // Backfill properties
  isBackfill?: boolean;
  created_at?: string; // Actual real-time of manual input
  transaction_date?: string; // Target backfill transaction date (matches timestamp)
  backfilledBy?: string; // Admin / Owner who inputted this
  backfillReason?: string; // Reason for backfill
  adjustStock?: boolean; // Whether stock was adjusted
  stockAdjusted?: boolean; // Track if the stock has been deducted to avoid double deduction
}

export interface DayReport {
  date: string;
  revenue: number;
  transactionsCount: number;
}
