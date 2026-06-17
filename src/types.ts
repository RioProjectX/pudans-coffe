export type Category = 'KOPI' | 'NON_KOPI' | 'MAKANAN' | 'CEMILAN';

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  description: string;
  image: string;
  isAvailable: boolean;
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
}

export interface DayReport {
  date: string;
  revenue: number;
  transactionsCount: number;
}
