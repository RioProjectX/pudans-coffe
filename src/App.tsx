import { useState, useEffect } from 'react';
import { Product, Transaction, Category } from './types';
import { INITIAL_PRODUCTS } from './data';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Catalog from './components/Catalog';
import History from './components/History';
import ReceiptModal from './components/ReceiptModal';
import PendingOrders from './components/PendingOrders';
import { Coffee, LayoutDashboard, ShoppingBag, FolderOpen, Receipt, Clock } from 'lucide-react';
import { collection, onSnapshot, setDoc, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './lib/firebase';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'POS' | 'PENDING' | 'CATALOG' | 'HISTORY'>('DASHBOARD');

  // Core Synchronization States loaded from Firebase Cloud Database
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Struk Receipt Modal Control
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Digital Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live Sync Products from Firestore with first-time automatic seeding
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), async (snapshot) => {
      const prodsList: Product[] = [];
      snapshot.forEach((document) => {
        prodsList.push({ id: document.id, ...document.data() } as Product);
      });

      if (snapshot.empty) {
        // Automatically seed the cloud database with standard items on first run
        try {
          const batch = writeBatch(db);
          INITIAL_PRODUCTS.forEach((p) => {
            const { id, ...data } = p;
            batch.set(doc(db, 'products', id), data);
          });
          await batch.commit();
        } catch (error) {
          console.error('Error seeding initial products to Firestore:', error);
        }
      } else {
        setProducts(prodsList);
      }
    }, (error) => {
      console.error('Firestore products snapshot error:', error);
    });

    return () => unsubscribe();
  }, []);

  // Live Sync Transactions from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const txList: Transaction[] = [];
      snapshot.forEach((document) => {
        txList.push({ id: document.id, ...document.data() } as Transaction);
      });
      // Sort descending based on timestamp
      txList.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setTransactions(txList);
    }, (error) => {
      console.error('Firestore transactions snapshot error:', error);
    });

    return () => unsubscribe();
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClearAllTransactions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'transactions'));
      const batch = writeBatch(db);
      querySnapshot.forEach((document) => {
        batch.delete(doc(db, 'transactions', document.id));
      });
      await batch.commit();
    } catch (error) {
      console.error('Error deleting transactions from Firestore:', error);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', txId));
    } catch (error) {
      console.error('Error deleting transaction from Firestore:', error);
    }
  };

  // 1. Catalog Handlers
  const handleAddProduct = async (newProd: Omit<Product, 'id'>) => {
    const freshProdId = 'prod-' + Date.now();
    try {
      await setDoc(doc(db, 'products', freshProdId), {
        ...newProd,
        isAvailable: newProd.isAvailable ?? true
      });
    } catch (error) {
      console.error('Error adding product to Firestore:', error);
    }
  };

  const handleEditProduct = async (id: string, updated: Partial<Product>) => {
    try {
      await setDoc(doc(db, 'products', id), updated, { merge: true });
    } catch (error) {
      console.error('Error updating product to Firestore:', error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      console.error('Error deleting product from Firestore:', error);
    }
  };

  // 2. POS Handler
  const handleCheckout = async (details: {
    items: { productId: string; name: string; price: number; quantity: number; category: Category }[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: 'CASH' | 'QRIS';
    amountPaid: number;
    changeAmount: number;
    customerName: string;
  }) => {
    const todayStr = currentTime.toISOString().split('T')[0].replace(/-/g, '');
    const dailyTxCount = transactions.filter(t => t.timestamp.startsWith(currentTime.toISOString().split('T')[0])).length + 1;
    
    // Generate unique index sequence
    const invoiceId = `TX-${todayStr}-${String(dailyTxCount).padStart(3, '0')}`;

    const freshTx: Transaction = {
      id: invoiceId,
      timestamp: currentTime.toISOString(),
      ...details,
      paymentStatus: 'Belum Bayar'
    };

    try {
      await setDoc(doc(db, 'transactions', invoiceId), freshTx);
      // Removed instant setActiveReceipt to adhere to new order creation flow
    } catch (error) {
      console.error('Error recording checkout transaction to Firestore:', error);
    }
  };

  const handleConfirmPayment = async (txId: string, paymentDetails: any) => {
    try {
      const baseTx = transactions.find(t => t.id === txId);
      if (!baseTx) throw new Error("Transaction not found");

      const lunasTx: Transaction = {
        ...baseTx,
        ...paymentDetails,
        paymentStatus: 'Lunas',
        status_pembayaran: 'Lunas',
      };

      await setDoc(doc(db, 'transactions', txId), lunasTx);
      setActiveReceipt(lunasTx);
      return lunasTx;
    } catch (error) {
      console.error('Error confirming payment in Firestore:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] font-sans flex flex-col">
      
      {/* Premium Coffee Header Nav bar */}
      <header className="bg-[#3C2A21] text-white sticky top-0 z-40 border-b border-black/5 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo brand and clock */}
          <div className="flex items-center gap-3.5">
            <div className="bg-[#D4A373] p-2.5 rounded-full border border-white/10 shadow-inner flex items-center justify-center text-white transform hover:rotate-12 transition">
              <Coffee size={20} className="fill-[#FBF9F6]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-lg font-bold tracking-tight text-[#FBF9F6]">
                  Pudans Coffee
                </h1>
                <span className="bg-[#D4A373]/30 text-[#F5F2ED] border border-[#D4A373]/20 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                  POS Premium
                </span>
              </div>
              
              {/* WIB clock */}
              <div className="flex items-center gap-1.5 text-[10px] text-[#F5F2ED]/60 font-mono mt-0.5">
                <Clock size={11} className="text-[#D4A373]" />
                <span>
                  {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} • {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                </span>
              </div>
            </div>
          </div>

          {/* Navigation layout items */}
          <nav className="flex bg-black/15 p-1 rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto">
            {([
              { id: 'DASHBOARD', label: 'Monitor', icon: LayoutDashboard },
              { id: 'POS', label: 'Kasir (POS)', icon: ShoppingBag },
              { id: 'PENDING', label: 'Pesanan Diterima', icon: Clock },
              { id: 'CATALOG', label: 'Katalog Menu', icon: FolderOpen },
              { id: 'HISTORY', label: 'Riwayat Struk', icon: Receipt },
            ] as const).map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              const pendingCount = transactions.filter(t => t.paymentStatus === 'Belum Bayar').length;

              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer
                    ${isSelected 
                      ? 'bg-[#D4A373] text-white shadow-sm' 
                      : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                >
                  <TabIcon size={14} />
                  <span>{tab.label}</span>
                  {tab.id === 'PENDING' && pendingCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] rounded-full font-bold font-mono animate-bounce">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main interactive viewport panels */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* State views transitions */}
        <div className="animate-in fade-in duration-300">
          {activeTab === 'DASHBOARD' && (
            <Dashboard 
              transactions={transactions}
              products={products}
              onNavigateToPOS={() => setActiveTab('POS')}
              onClearAllTransactions={handleClearAllTransactions}
            />
          )}

          {activeTab === 'POS' && (
            <POS 
              products={products}
              onCheckout={handleCheckout}
            />
          )}

          {activeTab === 'PENDING' && (
            <PendingOrders 
              transactions={transactions}
              onConfirmPayment={handleConfirmPayment}
            />
          )}

          {activeTab === 'CATALOG' && (
            <Catalog 
              products={products}
              onAddProduct={handleAddProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {activeTab === 'HISTORY' && (
            <History 
              transactions={transactions}
              onSelectTransaction={(tx) => setActiveReceipt(tx)}
              onClearAllTransactions={handleClearAllTransactions}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}
        </div>
      </main>

      {/* Shared Receipt Thermal Print Dialog Modal Overlay */}
      {activeReceipt && (
        <ReceiptModal 
          transaction={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* Minimal responsive Footer credentials */}
      <footer className="bg-[#3C2A21] py-4 border-t border-black/15 text-center text-[10px] text-[#F5F2ED]/60 font-mono flex-shrink-0">
        <p>© 2026 Pudans Coffee Cashier System. Build by RioProjectX</p>
      </footer>

    </div>
  );
}
