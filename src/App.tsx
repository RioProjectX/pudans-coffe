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
import { collection, onSnapshot, setDoc, deleteDoc, doc, getDocs, writeBatch, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path
  };
  console.error('[DATABASE TELEMENTRY ERROR] Firestore operation failed: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (data instanceof Date) {
    return data as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFirestoreData(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const clean: any = {};
    for (const key of Object.keys(data as any)) {
      const val = (data as any)[key];
      if (val !== undefined) {
        clean[key] = sanitizeFirestoreData(val);
      }
    }
    return clean as T;
  }
  return data;
}

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'POS' | 'PENDING' | 'CATALOG' | 'HISTORY'>('DASHBOARD');

  // User Access Control Role
  const [userRole, setUserRole] = useState<'KASIR' | 'ADMIN' | 'OWNER'>('ADMIN');

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
    console.log('[STAGE 8: LIVE SYNC LISTENER] Attaching live real-time observer to firestore transactions...');
    const unsubscribe = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const txList: Transaction[] = [];
      snapshot.forEach((document) => {
        txList.push({ id: document.id, ...document.data() } as Transaction);
      });
      // Sort descending based on timestamp
      txList.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      
      console.log(`[STAGE 8: LIVE SYNC UPDATED] Real-time Firestore transaction count: ${txList.length}`, {
        total: txList.length,
        pending: txList.filter(t => t.paymentStatus === 'Belum Bayar').length,
        unpaidIds: txList.filter(t => t.paymentStatus === 'Belum Bayar').map(t => t.id),
        latestId: txList.length > 0 ? txList[0].id : 'None'
      });
      
      setTransactions(txList);
    }, (error) => {
      console.error('[STAGE 8: LIVE SYNC ERROR] Snapshot failed:', error);
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });

    return () => {
      console.log('[STAGE 8: LIVE SYNC LISTENER] Detaching observer from firestore transactions');
      unsubscribe();
    };
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

  const handleUpdateTransactionItems = async (
    txId: string, 
    newItems: { productId: string; name: string; price: number; quantity: number; category: Category }[],
    newTotal: number
  ) => {
    try {
      const baseTx = transactions.find(t => t.id === txId);
      if (!baseTx) throw new Error("Transaction not found");

      const updatedTx: Transaction = {
        ...baseTx,
        items: newItems,
        subtotal: newTotal,
        total: newTotal,
      };

      await setDoc(doc(db, 'transactions', txId), sanitizeFirestoreData(updatedTx));
    } catch (error) {
      console.error('Error updating transaction items in Firestore:', error);
      throw error;
    }
  };

  // 1. Catalog Handlers
  const handleAddProduct = async (newProd: Omit<Product, 'id'>) => {
    const freshProdId = 'prod-' + Date.now();
    try {
      await setDoc(doc(db, 'products', freshProdId), sanitizeFirestoreData({
        ...newProd,
        isAvailable: newProd.isAvailable ?? true
      }));
    } catch (error) {
      console.error('Error adding product to Firestore:', error);
    }
  };

  const handleEditProduct = async (id: string, updated: Partial<Product>) => {
    try {
      await setDoc(doc(db, 'products', id), sanitizeFirestoreData(updated), { merge: true });
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

  // Helper to adjust product stock in database
  const adjustProductStock = async (productId: string, quantityToDeduct: number) => {
    try {
      const prodRef = doc(db, 'products', productId);
      const snap = await getDoc(prodRef);
      if (snap.exists()) {
        const prodData = snap.data();
        if (prodData && prodData.stock !== undefined) {
          const newStock = Math.max(0, prodData.stock - quantityToDeduct);
          await setDoc(prodRef, sanitizeFirestoreData({ stock: newStock }), { merge: true });
          console.log(`[STOCK ADJUST] Deducted stock for ${productId} by ${quantityToDeduct}. New stock: ${newStock}`);
        }
      }
    } catch (error) {
      console.error(`[STOCK ADJUST ERROR] Failed to adjust stock for product ${productId}:`, error);
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
    notes?: string;
    paymentStatus?: 'Belum Bayar' | 'Lunas';
    isBackfill?: boolean;
    backfillDate?: string;
    backfillTime?: string;
    backfilledBy?: string;
    backfillReason?: string;
    adjustStock?: boolean;
  }) => {
    let timestampStr = new Date().toISOString();
    let todayStr = timestampStr.split('T')[0].replace(/-/g, '');

    // Chronological routing for backfills
    if (details.isBackfill && details.backfillDate) {
      const selectedDateTime = new Date(`${details.backfillDate}T${details.backfillTime || '12:00'}`);
      if (!isNaN(selectedDateTime.getTime())) {
        timestampStr = selectedDateTime.toISOString();
        todayStr = details.backfillDate.replace(/-/g, '');
      }
    }
    
    console.log(`[STAGE 4: RECEIVE REQUEST] App.tsx handleCheckout received payload:`, {
      timestamp: timestampStr,
      customerName: details.customerName,
      itemsCount: details.items.length,
      total: details.total,
      paymentMethod: details.paymentMethod,
      isBackfill: details.isBackfill,
    });

    // Generate unique index sequence by finding the highest current sequence number for today
    const todayPrefix = `TX-${todayStr}-`;
    const todayTxs = transactions.filter(t => t.id.startsWith(todayPrefix));
    
    let maxNum = 0;
    todayTxs.forEach(t => {
      // id formats can be TX-YYYYMMDD-### or TX-YYYYMMDD-###-RAND
      const parts = t.id.split('-');
      if (parts.length >= 3) {
        const numPart = parseInt(parts[2], 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });

    const nextNum = maxNum + 1;
    let invoiceId = `TX-${todayStr}-${String(nextNum).padStart(3, '0')}`;

    console.log(`[STAGE 5: SERIAL CALCULATION] Base ID calculated:`, {
      todayCountFromState: todayTxs.length,
      maxSeqNumFound: maxNum,
      nextSeqNum: nextNum,
      computedBaseInvoiceId: invoiceId
    });

    // Collision Check: If this ID already exists, append a 3-character random alphanumeric code
    const idExists = transactions.some(t => t.id === invoiceId);
    if (idExists) {
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const collidedId = invoiceId;
      invoiceId = `${invoiceId}-${randomSuffix}`;
      console.warn(`[STAGE 5: ID COLLISION PREVENTED] Invoice ID ${collidedId} already exists! Collided due to concurrency or deletion. Appended suffix: -${randomSuffix}. New Invoice ID: ${invoiceId}`);
    }

    const finalPaymentStatus = details.paymentStatus || 'Belum Bayar';

    const freshTx: Transaction = {
      id: invoiceId,
      timestamp: timestampStr,
      created_at: new Date().toISOString(),
      transaction_date: details.isBackfill && details.backfillDate ? details.backfillDate : timestampStr.split('T')[0],
      isBackfill: details.isBackfill || false,
      backfilledBy: details.backfilledBy || undefined,
      backfillReason: details.backfillReason || undefined,
      adjustStock: details.adjustStock ?? false,
      notes: details.notes || undefined,
      stockAdjusted: false,
      ...details,
      paymentStatus: finalPaymentStatus
    };

    // Auto-adjust stock immediately for direct paid backfills
    if (freshTx.isBackfill && freshTx.paymentStatus === 'Lunas' && freshTx.adjustStock) {
      console.log(`[BACKFILL STOCK ACTION] Direct paid backfill with adjustStock = true. Deducting stock now...`);
      for (const item of freshTx.items) {
        await adjustProductStock(item.productId, item.quantity);
      }
      freshTx.stockAdjusted = true;
    }

    console.log(`[STAGE 6: DATABASE SAVE] Writing transaction document to Firestore. ID: ${invoiceId}`, freshTx);

    try {
      await setDoc(doc(db, 'transactions', invoiceId), sanitizeFirestoreData(freshTx));
      console.log(`[STAGE 7: DATABASE RESPONSE SUCCESS] Document ${invoiceId} successfully written to Firestore.`);
    } catch (error) {
      console.error(`[STAGE 7: DATABASE RESPONSE ERROR] Failed to write ${invoiceId} to Firestore:`, error);
      handleFirestoreError(error, OperationType.WRITE, `transactions/${invoiceId}`);
    }
  };

  const handleConfirmPayment = async (txId: string, paymentDetails: any, fallbackTx?: Transaction) => {
    try {
      const baseTx = transactions.find(t => t.id === txId) || fallbackTx;
      if (!baseTx) throw new Error("Transaction not found");

      const lunasTx: Transaction = {
        ...baseTx,
        ...paymentDetails,
        paymentStatus: 'Lunas',
        status_pembayaran: 'Lunas',
      };

      // Handle stock adjustment upon successful confirmation
      const shouldAdjustStock = baseTx.isBackfill 
        ? (baseTx.adjustStock && !baseTx.stockAdjusted)
        : !baseTx.stockAdjusted;

      if (shouldAdjustStock) {
        console.log(`[PAYMENT CONFIRM STOCK ACTION] Deducting stock for transaction items...`);
        for (const item of baseTx.items) {
          await adjustProductStock(item.productId, item.quantity);
        }
        lunasTx.stockAdjusted = true;
      }

      await setDoc(doc(db, 'transactions', txId), sanitizeFirestoreData(lunasTx));
      setActiveReceipt(lunasTx);
      return lunasTx;
    } catch (error) {
      console.error('Error confirming payment in Firestore:', error);
      throw error;
    }
  };

  const handleRevertToUnpaid = async (txId: string) => {
    try {
      const baseTx = transactions.find(t => t.id === txId);
      if (!baseTx) throw new Error("Transaction not found");

      const unpaidTx: Transaction = {
        ...baseTx,
        paymentStatus: 'Belum Bayar',
        status_pembayaran: 'Belum Bayar',
        amountPaid: 0,
        changeAmount: 0,
      };

      await setDoc(doc(db, 'transactions', txId), sanitizeFirestoreData(unpaidTx));
    } catch (error) {
      console.error('Error reverting transaction to unpaid status in Firestore:', error);
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
                  Pudan's Coffee
                </h1>
                <span className="bg-[#D4A373]/30 text-[#F5F2ED] border border-[#D4A373]/20 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                  POS Premium
                </span>
              </div>
              
              {/* WIB clock */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5 text-[10px] text-[#F5F2ED]/60 font-mono">
                  <Clock size={11} className="text-[#D4A373]" />
                  <span>
                    {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} • {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-lg border border-white/5 text-[9px] font-mono">
                  <span className="text-white/40 px-1 text-[8px] uppercase font-bold">Role:</span>
                  {(['KASIR', 'ADMIN', 'OWNER'] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => setUserRole(role)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition cursor-pointer ${
                        userRole === role
                          ? 'bg-[#D4A373] text-white shadow-sm'
                          : 'text-white/55 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
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
              userRole={userRole}
              onCheckout={handleCheckout}
            />
          )}

          {activeTab === 'PENDING' && (
            <PendingOrders 
              transactions={transactions}
              products={products}
              onConfirmPayment={handleConfirmPayment}
              onUpdateTransactionItems={handleUpdateTransactionItems}
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
              onRevertToUnpaid={handleRevertToUnpaid}
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
        <p>© 2026 Pudan's Coffee Cashier System. Build by RioProjectX</p>
      </footer>

    </div>
  );
}
