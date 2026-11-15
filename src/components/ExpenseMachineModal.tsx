import { useState, useMemo, FormEvent } from 'react';
import { Transaction, Expense, ExpenseCategory, ExpenseItem } from '../types';
import {
  X,
  Wallet,
  ShoppingBag,
  Users,
  Zap,
  Wifi,
  Plus,
  Trash2,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Droplets,
} from 'lucide-react';

interface ExpenseMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteExpense: (expenseId: string) => Promise<void>;
}

interface DetailRow {
  id: string;
  name: string;
  qty: string;
  amount: string;
}

const createEmptyRow = (): DetailRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  qty: '',
  amount: '',
});

const EXPENSE_CATEGORIES: {
  value: ExpenseCategory;
  label: string;
  placeholder: string;
  icon: typeof ShoppingBag;
  badgeClass: string;
}[] = [
  {
    value: 'BELANJA',
    label: 'Belanja',
    placeholder: 'Contoh: Belanja harian dapur / Supplier kopi',
    icon: ShoppingBag,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    value: 'GAJI_KARYAWAN',
    label: 'Gaji Karyawan',
    placeholder: 'Contoh: Gaji karyawan periode bulan ini',
    icon: Users,
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  {
    value: 'TOKEN_LISTRIK',
    label: 'Token',
    placeholder: 'Contoh: Token listrik PLN 200.000',
    icon: Zap,
    badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  {
    value: 'TAGIHAN_WIFI',
    label: 'WiFi',
    placeholder: 'Contoh: Tagihan internet bulanan kedai',
    icon: Wifi,
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  {
    value: 'TAGIHAN_PDAM',
    label: 'PDAM',
    placeholder: 'Contoh: Tagihan air PDAM bulan ini',
    icon: Droplets,
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
];

export default function ExpenseMachineModal({
  isOpen,
  onClose,
  transactions,
  expenses,
  onAddExpense,
  onDeleteExpense,
}: ExpenseMachineModalProps) {
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getCurrentMonthStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const todayStr = getTodayStr();

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr);
  const [selectedBelanjaDate, setSelectedBelanjaDate] = useState<string>(getTodayStr);
  const [showBelanjaDetail, setShowBelanjaDetail] = useState<boolean>(false);

  const [category, setCategory] = useState<ExpenseCategory>('BELANJA');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayStr);
  const [description, setDescription] = useState<string>('');
  const [shoppingRows, setShoppingRows] = useState<DetailRow[]>(() => [createEmptyRow()]);
  const [salaryRows, setSalaryRows] = useState<DetailRow[]>(() => [createEmptyRow()]);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const formatIDR = (num: number) => {
    const sign = num < 0 ? '-' : '';
    return `${sign}Rp ${Math.abs(num).toLocaleString('id-ID')}`;
  };

  const formatMonthLabel = (ym: string) => {
    try {
      const [y, m] = ym.split('-').map(Number);
      const d = new Date(y, (m || 1) - 1, 1);
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch {
      return ym;
    }
  };

  const formatDateIndo = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatShortDateIndo = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const isMultiRowCategory = category === 'BELANJA' || category === 'GAJI_KARYAWAN';
  const activeRows = category === 'GAJI_KARYAWAN' ? salaryRows : shoppingRows;

  const activeRowsTotal = useMemo(() => {
    return activeRows.reduce((sum, row) => {
      const val = parseFloat(row.amount);
      return sum + (isNaN(val) || val <= 0 ? 0 : val);
    }, 0);
  }, [activeRows]);

  // Monthly POS revenue & expense metrics for selectedMonth
  const monthlySummary = useMemo(() => {
    let grossRevenue = 0;
    let paidTxCount = 0;

    transactions.forEach((t) => {
      if (t.paymentStatus === 'Belum Bayar' || t.paymentStatus === 'Belum Dibayar') return;
      const txDateStr = t.transaction_date || t.timestamp.split('T')[0];
      if (txDateStr.startsWith(selectedMonth)) {
        grossRevenue += t.total;
        paidTxCount += 1;
      }
    });

    const monthExpenses = expenses.filter((e) => e.date.startsWith(selectedMonth));

    let belanjaTotal = 0;
    let gajiTotal = 0;
    let listrikTotal = 0;
    let wifiTotal = 0;
    let pdamTotal = 0;

    monthExpenses.forEach((e) => {
      if (e.category === 'BELANJA') belanjaTotal += e.amount;
      else if (e.category === 'GAJI_KARYAWAN') gajiTotal += e.amount;
      else if (e.category === 'TOKEN_LISTRIK') listrikTotal += e.amount;
      else if (e.category === 'TAGIHAN_WIFI') wifiTotal += e.amount;
      else if (e.category === 'TAGIHAN_PDAM') pdamTotal += e.amount;
    });

    const totalExpenses = belanjaTotal + gajiTotal + listrikTotal + wifiTotal + pdamTotal;
    const netRevenue = grossRevenue - totalExpenses;

    return {
      grossRevenue,
      paidTxCount,
      monthExpenses,
      belanjaTotal,
      gajiTotal,
      listrikTotal,
      wifiTotal,
      pdamTotal,
      totalExpenses,
      netRevenue,
    };
  }, [transactions, expenses, selectedMonth]);

  // Daily shopping expense metrics for selectedBelanjaDate + quick history jump list
  const dailyBelanjaSummary = useMemo(() => {
    const allBelanja = expenses.filter((e) => e.category === 'BELANJA');
    const dayEntries = allBelanja.filter((e) => e.date === selectedBelanjaDate);
    const dayTotal = dayEntries.reduce((sum, e) => sum + e.amount, 0);
    const dayItemCount = dayEntries.reduce(
      (count, e) => count + (e.items && e.items.length > 0 ? e.items.length : 1),
      0
    );

    const dateMap = new Map<string, number>();
    allBelanja.forEach((e) => {
      dateMap.set(e.date, (dateMap.get(e.date) || 0) + e.amount);
    });

    const recentDates = Array.from(dateMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 8)
      .map(([d, total]) => ({ date: d, total }));

    return {
      dayEntries,
      dayTotal,
      dayItemCount,
      recentDates,
    };
  }, [expenses, selectedBelanjaDate]);

  if (!isOpen) return null;

  const activeCategoryMeta = EXPENSE_CATEGORIES.find((c) => c.value === category)!;

  const shiftBelanjaDate = (deltaDays: number) => {
    const [y, m, d] = selectedBelanjaDate.split('-').map(Number);
    const base = new Date(y, (m || 1) - 1, d || 1);
    base.setDate(base.getDate() + deltaDays);
    const ny = base.getFullYear();
    const nm = String(base.getMonth() + 1).padStart(2, '0');
    const nd = String(base.getDate()).padStart(2, '0');
    const nextStr = `${ny}-${nm}-${nd}`;
    if (nextStr <= todayStr) {
      setSelectedBelanjaDate(nextStr);
    }
  };

  const sanitizeDigits = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    return digits.replace(/^0+/, '');
  };

  const formatThousands = (digits: string) => {
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleFormattedAmountChange = (
    inputEl: HTMLInputElement,
    applyRawDigits: (rawDigits: string) => void
  ) => {
    const rawInput = inputEl.value;
    const cursorPos = inputEl.selectionStart ?? rawInput.length;
    const digitsBeforeRawCursor = rawInput.slice(0, cursorPos).replace(/\D/g, '').length;
    const leadingZerosRemoved =
      rawInput.slice(0, cursorPos).replace(/\D/g, '').match(/^0+/)?.[0]?.length ?? 0;
    const digitsBeforeCursor = Math.max(0, digitsBeforeRawCursor - leadingZerosRemoved);

    const cleanDigits = sanitizeDigits(rawInput);
    applyRawDigits(cleanDigits);

    const formatted = formatThousands(cleanDigits);
    let targetCursor = 0;
    let seenDigits = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (seenDigits >= digitsBeforeCursor) break;
      targetCursor = i + 1;
      if (/\d/.test(formatted[i])) {
        seenDigits++;
      }
    }

    requestAnimationFrame(() => {
      if (document.activeElement === inputEl) {
        inputEl.setSelectionRange(targetCursor, targetCursor);
      }
    });
  };

  const setActiveRows = (updater: (prev: DetailRow[]) => DetailRow[]) => {
    if (category === 'GAJI_KARYAWAN') {
      setSalaryRows(updater);
    } else {
      setShoppingRows(updater);
    }
  };

  const handleAddRow = () => {
    setActiveRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (rowId: string) => {
    setActiveRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== rowId) : prev));
  };

  const handleUpdateRow = (
    rowId: string,
    field: 'name' | 'qty' | 'amount',
    value: string
  ) => {
    setActiveRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!date) {
      setFormError('Tanggal pengeluaran wajib dipilih.');
      return;
    }

    let finalAmount = 0;
    let parsedItems: ExpenseItem[] | undefined;

    if (isMultiRowCategory) {
      const isSalary = category === 'GAJI_KARYAWAN';
      const normalizedRows = activeRows.map((r) => ({
        name: r.name.trim(),
        qty: r.qty.trim(),
        amountNum: parseFloat(r.amount),
      }));

      const nonEmptyRows = normalizedRows.filter(
        (r) => r.name.length > 0 || r.qty.length > 0 || !isNaN(r.amountNum)
      );

      if (nonEmptyRows.length === 0) {
        setFormError(
          isSalary
            ? 'Tambahkan minimal 1 karyawan beserta nominal gajinya.'
            : 'Tambahkan minimal 1 item belanja beserta nominalnya.'
        );
        return;
      }

      for (let i = 0; i < nonEmptyRows.length; i++) {
        const row = nonEmptyRows[i];
        if (!row.name) {
          setFormError(
            isSalary
              ? `Nama karyawan pada baris ke-${i + 1} wajib diisi.`
              : `Nama barang pada baris belanja ke-${i + 1} wajib diisi.`
          );
          return;
        }
        if (isNaN(row.amountNum) || row.amountNum <= 0) {
          setFormError(
            isSalary
              ? `Nominal gaji untuk "${row.name}" harus lebih besar dari Rp 0.`
              : `Nominal barang "${row.name}" harus lebih besar dari Rp 0.`
          );
          return;
        }
      }

      parsedItems = nonEmptyRows.map((r) => ({
        name: r.name,
        ...(r.qty ? { qty: r.qty } : {}),
        amount: r.amountNum,
      }));

      finalAmount = parsedItems.reduce((sum, item) => sum + item.amount, 0);
    } else {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setFormError('Nominal pengeluaran harus lebih besar dari Rp 0.');
        return;
      }
      finalAmount = parsedAmount;
    }

    setIsSaving(true);
    try {
      await onAddExpense({
        category,
        amount: finalAmount,
        date,
        description: description.trim() || undefined,
        ...(parsedItems ? { items: parsedItems } : {}),
      });

      const inputtedMonth = date.slice(0, 7);
      if (inputtedMonth && inputtedMonth !== selectedMonth) {
        setSelectedMonth(inputtedMonth);
      }

      if (category === 'BELANJA') {
        setSelectedBelanjaDate(date);
        setShoppingRows([createEmptyRow()]);
      } else if (category === 'GAJI_KARYAWAN') {
        setSalaryRows([createEmptyRow()]);
      }

      setAmount('');
      setDescription('');
      setSuccessMsg(
        `Pengeluaran ${activeCategoryMeta.label} (${formatIDR(finalAmount)}) tersimpan.`
      );
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch {
      setFormError('Gagal menyimpan data pengeluaran ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteExpense(id);
    } catch {
      setFormError('Gagal menghapus data pengeluaran.');
    } finally {
      setDeletingId(null);
    }
  };

  const isViewingTodayBelanja = selectedBelanjaDate === todayStr;

  return (
    <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-[#FAF7F2] rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl border border-black/10 flex flex-col max-h-[94vh] animate-scale-in">
        {/* Header */}
        <div className="bg-[#3C2A21] text-white px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#D4A373]/25 border border-[#D4A373]/30 flex items-center justify-center text-[#D4A373]">
              <Wallet size={22} />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#FBF9F6]">
                Mesin Pengeluaran &amp; Omzet Bersih
              </h2>
              <p className="text-xs text-stone-300">
                Catat detail Belanja, Gaji Karyawan, Token Listrik, Tagihan WiFi, &amp; PDAM serta hitung omzet bersih bulanan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <div className="flex items-center gap-2 bg-black/25 px-3 py-2 rounded-xl border border-white/10">
              <Calendar size={14} className="text-[#D4A373]" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) setSelectedMonth(e.target.value);
                }}
                aria-label="Pilih Bulan"
                className="bg-transparent text-xs sm:text-sm font-mono font-bold text-white focus:outline-none cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Mesin Pengeluaran"
              className="p-2.5 hover:bg-white/10 rounded-full text-stone-300 hover:text-white transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
          {/* Monthly Revenue vs Expense Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Rekap Periode:{' '}
                <strong className="text-[#3C2A21]">{formatMonthLabel(selectedMonth)}</strong>
              </span>
              <span className="text-xs text-stone-400 font-mono">
                {monthlySummary.paidTxCount} transaksi lunas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Omzet Kasir POS */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Omzet Kasir POS
                  </span>
                  <TrendingUp size={16} className="text-emerald-600" />
                </div>
                <p className="text-lg sm:text-xl font-black font-mono text-stone-900">
                  {formatIDR(monthlySummary.grossRevenue)}
                </p>
                <p className="text-[11px] text-stone-400">
                  Total pemasukan kasir bulan ini
                </p>
              </div>

              {/* Total Pengeluaran */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Total Pengeluaran
                  </span>
                  <TrendingDown size={16} className="text-rose-600" />
                </div>
                <p className="text-lg sm:text-xl font-black font-mono text-rose-700">
                  {formatIDR(monthlySummary.totalExpenses)}
                </p>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-stone-500 font-mono pt-0.5">
                  <span>Belanja: {(monthlySummary.belanjaTotal / 1000).toFixed(0)}k</span>
                  <span>• Gaji: {(monthlySummary.gajiTotal / 1000).toFixed(0)}k</span>
                  <span>• Listrik: {(monthlySummary.listrikTotal / 1000).toFixed(0)}k</span>
                  <span>• WiFi: {(monthlySummary.wifiTotal / 1000).toFixed(0)}k</span>
                  <span>• PDAM: {(monthlySummary.pdamTotal / 1000).toFixed(0)}k</span>
                </div>
              </div>

              {/* Pengeluaran Belanja Hari Ini (Clickable + Jump to Previous Dates) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowBelanjaDetail((prev) => !prev)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowBelanjaDetail((prev) => !prev);
                  }
                }}
                title="Klik untuk melihat rincian belanja & lompat ke tanggal sebelumnya"
                className={`bg-white p-4 sm:p-5 rounded-2xl border shadow-2xs space-y-1.5 text-left transition cursor-pointer select-none ${
                  showBelanjaDetail
                    ? 'border-[#D4A373] ring-2 ring-[#D4A373]/40'
                    : 'border-amber-200/90 hover:border-amber-400 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 truncate">
                    <ShoppingBag size={13} className="text-amber-600 flex-shrink-0" />
                    <span className="truncate">
                      {isViewingTodayBelanja
                        ? 'Belanja Hari Ini'
                        : `Belanja ${formatShortDateIndo(selectedBelanjaDate)}`}
                    </span>
                  </span>
                  <div
                    className="flex items-center gap-0.5 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        shiftBelanjaDate(-1);
                        setShowBelanjaDetail(true);
                      }}
                      title="Lihat tanggal sebelumnya"
                      aria-label="Tanggal belanja sebelumnya"
                      className="p-1 rounded-lg text-stone-500 hover:text-[#3C2A21] hover:bg-amber-100/70 transition cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={selectedBelanjaDate >= todayStr}
                      onClick={() => {
                        shiftBelanjaDate(1);
                        setShowBelanjaDetail(true);
                      }}
                      title="Lihat tanggal berikutnya"
                      aria-label="Tanggal belanja berikutnya"
                      className="p-1 rounded-lg text-stone-500 hover:text-[#3C2A21] hover:bg-amber-100/70 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-lg sm:text-xl font-black font-mono text-amber-800">
                  {formatIDR(dailyBelanjaSummary.dayTotal)}
                </p>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-stone-500 font-medium truncate">
                    {dailyBelanjaSummary.dayEntries.length > 0
                      ? `${dailyBelanjaSummary.dayItemCount} item • Klik detail`
                      : 'Klik cek tanggal lain'}
                  </span>
                  {!isViewingTodayBelanja && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBelanjaDate(todayStr);
                      }}
                      className="text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer flex-shrink-0"
                    >
                      Hari ini
                    </button>
                  )}
                </div>
              </div>

              {/* Omzet Bersih */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border shadow-2xs space-y-1.5 ${
                  monthlySummary.netRevenue >= 0
                    ? 'bg-[#3C2A21] text-white border-[#3C2A21]'
                    : 'bg-rose-950 text-white border-rose-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4A373]">
                    Omzet Bersih (Netto)
                  </span>
                  <Wallet size={16} className="text-[#D4A373]" />
                </div>
                <p
                  className={`text-lg sm:text-xl font-black font-mono ${
                    monthlySummary.netRevenue >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {formatIDR(monthlySummary.netRevenue)}
                </p>
                <p className="text-[11px] text-stone-300/80">
                  Omzet POS − Total Pengeluaran
                </p>
              </div>
            </div>

            {/* Expandable Daily Shopping History Inspector */}
            {showBelanjaDetail && (
              <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4 sm:p-5 space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                      <ShoppingBag size={17} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif text-sm sm:text-base font-bold text-[#3C2A21]">
                          Rincian Belanja — {formatDateIndo(selectedBelanjaDate)}
                        </h4>
                        {isViewingTodayBelanja && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Hari Ini
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500">
                        Total belanja tanggal ini:{' '}
                        <strong className="font-mono text-amber-800">
                          {formatIDR(dailyBelanjaSummary.dayTotal)}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {/* Date Jump Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => shiftBelanjaDate(-1)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
                    >
                      <ChevronLeft size={14} /> Sebelumnya
                    </button>
                    <input
                      type="date"
                      max={todayStr}
                      value={selectedBelanjaDate}
                      onChange={(e) => {
                        if (e.target.value) setSelectedBelanjaDate(e.target.value);
                      }}
                      aria-label="Lompat ke tanggal belanja"
                      className="px-3 py-1.5 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#D4A373]"
                    />
                    <button
                      type="button"
                      disabled={selectedBelanjaDate >= todayStr}
                      onClick={() => shiftBelanjaDate(1)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                    >
                      Berikutnya <ChevronRight size={14} />
                    </button>
                    {!isViewingTodayBelanja && (
                      <button
                        type="button"
                        onClick={() => setSelectedBelanjaDate(todayStr)}
                        className="px-3 py-1.5 rounded-xl bg-[#3C2A21] hover:bg-stone-800 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Hari Ini
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowBelanjaDetail(false)}
                      aria-label="Tutup rincian belanja harian"
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Quick Jump Chips for Recent Dates That Have Belanja Records */}
                {dailyBelanjaSummary.recentDates.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mr-1">
                      Lompat cepat tanggal belanja:
                    </span>
                    {dailyBelanjaSummary.recentDates.map((d) => {
                      const active = d.date === selectedBelanjaDate;
                      return (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => setSelectedBelanjaDate(d.date)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition cursor-pointer ${
                            active
                              ? 'bg-[#3C2A21] text-white border-[#3C2A21]'
                              : 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {d.date === todayStr ? 'Hari Ini' : formatShortDateIndo(d.date)} ·{' '}
                          {formatIDR(d.total)}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Belanja Records for Selected Date */}
                {dailyBelanjaSummary.dayEntries.length === 0 ? (
                  <div className="py-5 text-center text-xs sm:text-sm text-stone-400 bg-stone-50/70 rounded-xl border border-dashed border-stone-200">
                    Tidak ada pengeluaran belanja pada tanggal{' '}
                    <strong className="text-stone-600">
                      {formatDateIndo(selectedBelanjaDate)}
                    </strong>
                    .
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {dailyBelanjaSummary.dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/70 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-bold text-[#3C2A21]">
                            {entry.description ||
                              `Belanja (${entry.items?.length || 1} item)`}
                          </span>
                          <span className="text-xs sm:text-sm font-black font-mono text-amber-800">
                            {formatIDR(entry.amount)}
                          </span>
                        </div>

                        {entry.items && entry.items.length > 0 && (
                          <div className="pl-3 border-l-2 border-amber-300 space-y-1">
                            {entry.items.map((item, idx) => (
                              <div
                                key={`${entry.id}-daily-${idx}`}
                                className="flex items-center justify-between gap-3 text-xs text-stone-600"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                  <span className="truncate font-medium text-stone-700">
                                    {item.name}
                                  </span>
                                  {item.qty && (
                                    <span className="text-[10px] font-mono bg-white border border-stone-200 text-stone-500 px-1.5 py-0.5 rounded">
                                      {item.qty}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono font-semibold text-stone-700 flex-shrink-0">
                                  {formatIDR(item.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expense Input Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-[#3C2A21] flex items-center gap-2">
                <Plus size={17} className="text-[#D4A373]" /> Input Pengeluaran Baru
              </h3>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
                <AlertCircle size={15} /> {formError}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 size={15} /> {successMsg}
              </div>
            )}

            {/* 5 Expense Category Selector Buttons */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                Jenis Pengeluaran
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {EXPENSE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const active = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setCategory(cat.value);
                        setFormError(null);
                      }}
                      className={`py-3 px-3.5 rounded-xl text-xs sm:text-sm font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                        active
                          ? 'bg-[#3C2A21] text-white border-[#3C2A21] shadow-sm'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <Icon size={16} className={active ? 'text-[#D4A373]' : 'text-stone-500'} />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isMultiRowCategory ? (
              <div className="space-y-4">
                {/* Date & General Note */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                      {category === 'GAJI_KARYAWAN'
                        ? 'Tanggal Pembayaran Gaji *'
                        : 'Tanggal Belanja *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-xs sm:text-sm font-mono bg-stone-50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                      {category === 'GAJI_KARYAWAN'
                        ? 'Judul / Keterangan Gaji (Opsional)'
                        : 'Judul / Keterangan Belanja (Opsional)'}
                    </label>
                    <input
                      type="text"
                      maxLength={120}
                      placeholder={activeCategoryMeta.placeholder}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-xs sm:text-sm bg-stone-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Multi-row Detail Builder (Belanja / Gaji Karyawan) */}
                <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ListChecks size={16} className="text-[#D4A373]" />
                      <span className="text-xs sm:text-sm font-bold text-[#3C2A21]">
                        {category === 'GAJI_KARYAWAN'
                          ? 'Daftar Gaji Karyawan'
                          : 'Daftar Barang Belanjaan'}
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">
                        ({activeRows.length}{' '}
                        {category === 'GAJI_KARYAWAN' ? 'orang' : 'baris'})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3C2A21] hover:bg-stone-800 text-white text-xs font-bold transition cursor-pointer"
                    >
                      <Plus size={14} />{' '}
                      {category === 'GAJI_KARYAWAN' ? 'Tambah Karyawan' : 'Tambah Barang'}
                    </button>
                  </div>

                  {/* Header labels for desktop */}
                  <div className="hidden sm:grid sm:grid-cols-12 gap-2.5 px-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    <span className="col-span-5">
                      {category === 'GAJI_KARYAWAN'
                        ? 'Nama Karyawan *'
                        : 'Nama Barang / Keperluan *'}
                    </span>
                    <span className="col-span-3">
                      {category === 'GAJI_KARYAWAN'
                        ? 'Posisi / Shift (Opsional)'
                        : 'Qty / Satuan (Opsional)'}
                    </span>
                    <span className="col-span-3">
                      {category === 'GAJI_KARYAWAN' ? 'Nominal Gaji (Rp) *' : 'Nominal (Rp) *'}
                    </span>
                    <span className="col-span-1 text-center">Hapus</span>
                  </div>

                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {activeRows.map((row, idx) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center bg-white p-2.5 sm:p-2 rounded-xl border border-stone-200/80"
                      >
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            maxLength={80}
                            placeholder={
                              category === 'GAJI_KARYAWAN'
                                ? `Karyawan ${idx + 1} (misal: Si A / Si B)`
                                : `Item ${idx + 1} (misal: Susu UHT / Biji Kopi)`
                            }
                            value={row.name}
                            onChange={(e) => handleUpdateRow(row.id, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-xs sm:text-sm bg-stone-50 focus:bg-white"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            maxLength={30}
                            placeholder={
                              category === 'GAJI_KARYAWAN'
                                ? 'Posisi (misal: Barista / Kasir)'
                                : 'Qty (misal: 2 dus / 1 kg)'
                            }
                            value={row.qty}
                            onChange={(e) => handleUpdateRow(row.id, 'qty', e.target.value)}
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-xs sm:text-sm bg-stone-50 focus:bg-white"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={
                              category === 'GAJI_KARYAWAN'
                                ? 'Contoh: 1.500.000'
                                : 'Contoh: 50.000'
                            }
                            value={formatThousands(row.amount)}
                            onChange={(e) =>
                              handleFormattedAmountChange(e.currentTarget, (digits) =>
                                handleUpdateRow(row.id, 'amount', digits)
                              )
                            }
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-xs sm:text-sm font-mono font-bold bg-stone-50 focus:bg-white"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end sm:justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            disabled={activeRows.length <= 1}
                            title={
                              category === 'GAJI_KARYAWAN'
                                ? 'Hapus baris karyawan'
                                : 'Hapus baris barang'
                            }
                            className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Summary Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-stone-200">
                    <span className="text-xs font-semibold text-stone-500">
                      {category === 'GAJI_KARYAWAN'
                        ? 'Total gaji otomatis dijumlahkan dari seluruh karyawan di atas'
                        : 'Total otomatis dijumlahkan dari daftar barang di atas'}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        {category === 'GAJI_KARYAWAN' ? 'Total Gaji:' : 'Total Belanja:'}
                      </span>
                      <span className="text-base sm:text-lg font-black font-mono text-[#3C2A21]">
                        {formatIDR(activeRowsTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                    Nominal (Rp) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="Contoh: 150.000"
                    value={formatThousands(amount)}
                    onChange={(e) =>
                      handleFormattedAmountChange(e.currentTarget, (digits) =>
                        setAmount(digits)
                      )
                    }
                    className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-xs sm:text-sm font-mono font-bold bg-stone-50 focus:bg-white"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                    Tanggal *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-xs sm:text-sm font-mono bg-stone-50 focus:bg-white"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                    Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder={activeCategoryMeta.placeholder}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A373] text-xs sm:text-sm bg-stone-50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-[#D4A373] hover:bg-[#C29262] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Plus size={16} />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengeluaran'}</span>
              </button>
            </div>
          </form>

          {/* Monthly Expense History List */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-150 flex justify-between items-center">
              <h4 className="font-serif text-sm font-bold text-stone-800">
                Daftar Pengeluaran — {formatMonthLabel(selectedMonth)}
              </h4>
              <span className="text-xs font-mono font-bold text-stone-500">
                {monthlySummary.monthExpenses.length} catatan
              </span>
            </div>

            {monthlySummary.monthExpenses.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs sm:text-sm">
                Belum ada pengeluaran yang dicatat pada bulan {formatMonthLabel(selectedMonth)}.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto">
                {monthlySummary.monthExpenses.map((exp) => {
                  const meta =
                    EXPENSE_CATEGORIES.find((c) => c.value === exp.category) ||
                    EXPENSE_CATEGORIES[0];
                  const Icon = meta.icon;
                  const hasItems = exp.items && exp.items.length > 0;
                  const isSalary = exp.category === 'GAJI_KARYAWAN';

                  return (
                    <div
                      key={exp.id}
                      className="px-5 py-3.5 hover:bg-stone-50/70 transition space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap ${meta.badgeClass}`}
                          >
                            <Icon size={12} />
                            {meta.label}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-stone-800 truncate">
                              {exp.description ||
                                (hasItems
                                  ? isSalary
                                    ? `Gaji Karyawan (${exp.items!.length} orang)`
                                    : `Belanja (${exp.items!.length} item)`
                                  : meta.label)}
                            </p>
                            <span className="text-[11px] text-stone-400 font-mono">
                              {formatDateIndo(exp.date)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs sm:text-sm font-bold font-mono text-rose-700">
                            -{formatIDR(exp.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(exp.id)}
                            disabled={deletingId === exp.id}
                            title="Hapus catatan pengeluaran"
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {hasItems && (
                        <div
                          className={`ml-1 sm:ml-4 pl-3 border-l-2 space-y-1 ${
                            isSalary ? 'border-sky-200/80' : 'border-amber-200/80'
                          }`}
                        >
                          {exp.items!.map((item, idx) => (
                            <div
                              key={`${exp.id}-item-${idx}`}
                              className="flex items-center justify-between gap-3 text-xs text-stone-600"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    isSalary ? 'bg-sky-400' : 'bg-amber-400'
                                  }`}
                                />
                                <span className="truncate font-medium text-stone-700">
                                  {item.name}
                                </span>
                                {item.qty && (
                                  <span className="text-[10px] font-mono bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">
                                    {item.qty}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-stone-700 font-semibold flex-shrink-0">
                                {formatIDR(item.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
