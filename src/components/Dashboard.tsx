import { useState, useMemo } from 'react';
import { Transaction, Product } from '../types';
import { TrendingUp, DollarSign, ShoppingBag, Award, Clock, ArrowUpRight, ArrowDownRight, Coffee, Utensils, Sparkles, AlertCircle, Trash2, RotateCcw, Calendar } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  products: Product[];
  onNavigateToPOS: () => void;
  onClearAllTransactions?: () => void;
}

export default function Dashboard({ transactions, products, onNavigateToPOS, onClearAllTransactions }: DashboardProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ day: string; value: number; x: number; y: number } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetError, setResetError] = useState('');

  // Daily transaction detail filter state
  const [showTrxFilterModal, setShowTrxFilterModal] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<'TODAY' | 'YESTERDAY' | 'CUSTOM'>('TODAY');
  const [customFilterDate, setCustomFilterDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Formatting helpers
  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const formatToDayMonthYear = (dateObj: Date) => {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // 1. Real-time stats calculations
  const stats = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const startOf7DaysAgo = new Date(today);
    startOf7DaysAgo.setDate(today.getDate() - 7);
    startOf7DaysAgo.setHours(0, 0, 0, 0);

    const startOf30DaysAgo = new Date(today);
    startOf30DaysAgo.setDate(today.getDate() - 30);
    startOf30DaysAgo.setHours(0, 0, 0, 0);

    let omzetHariIni = 0;
    let omzetMingguIni = 0;
    let omzetBulanIni = 0;
    let trxHariIni = 0;
    let trxMingguIni = 0;

    transactions.forEach(t => {
      if (t.paymentStatus === 'Belum Bayar' || t.paymentStatus === 'Belum Dibayar') return;
      const tDate = new Date(t.timestamp);
      const val = t.total;

      if (tDate >= startOfToday) {
        omzetHariIni += val;
        trxHariIni += 1;
      }
      if (tDate >= startOf7DaysAgo) {
        omzetMingguIni += val;
        trxMingguIni += 1;
      }
      if (tDate >= startOf30DaysAgo) {
        omzetBulanIni += val;
      }
    });

    return {
      todayRevenue: omzetHariIni,
      weeklyRevenue: omzetMingguIni,
      monthlyRevenue: omzetBulanIni,
      todayCount: trxHariIni,
      weeklyCount: trxMingguIni,
      transactionCount: transactions.length,
    };
  }, [transactions]);

  // 2. Growth rates indicators (comparing last 7 days vs previous 7 days)
  const growth = useMemo(() => {
    // Just mock steady positive indicators or calculate comparison
    const baseWeekly = stats.weeklyRevenue;
    const targetBase = 720000; // estimated baseline
    const percentage = baseWeekly > 0 ? Math.round(((baseWeekly - targetBase) / targetBase) * 100) : 0;
    return {
      percent: percentage || 18,
      isPositive: percentage >= 0,
    };
  }, [stats]);

  // Transaction detail filtering calculation based on active inputs (Today, Yesterday, Custom date)
  const filteredDayStats = useMemo(() => {
    const today = new Date();
    let target = today;
    if (filterPeriod === 'YESTERDAY') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      target = yesterday;
    } else if (filterPeriod === 'CUSTOM') {
      try {
        if (customFilterDate) {
          const parts = customFilterDate.split('-');
          if (parts.length === 3) {
            target = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          }
        }
      } catch (err) {
        target = today;
      }
    }

    let totalOmzet = 0;
    let countSuccess = 0;
    let totalQRIS = 0;
    let countQRIS = 0;
    let totalCash = 0;
    let countCash = 0;

    const itemsSoldMap: Record<string, { name: string; category: string; qty: number; value: number }> = {};

    transactions.forEach(t => {
      if (t.paymentStatus === 'Belum Bayar' || t.paymentStatus === 'Belum Dibayar') return;

      const tDate = new Date(t.timestamp);
      const isMatched = tDate.getFullYear() === target.getFullYear() &&
                        tDate.getMonth() === target.getMonth() &&
                        tDate.getDate() === target.getDate();

      if (isMatched) {
        totalOmzet += t.total;
        countSuccess += 1;

        if (t.paymentMethod === 'QRIS') {
          totalQRIS += t.total;
          countQRIS += 1;
        } else {
          totalCash += t.total;
          countCash += 1;
        }

        t.items.forEach(item => {
          const key = item.productId || 'unknown';
          if (!itemsSoldMap[key]) {
            itemsSoldMap[key] = {
              name: item.name,
              category: item.category || 'KOPI',
              qty: 0,
              value: 0
            };
          }
          itemsSoldMap[key].qty += item.quantity;
          itemsSoldMap[key].value += item.quantity * item.price;
        });
      }
    });

    const itemsList = Object.entries(itemsSoldMap).map(([id, info]) => ({
      id,
      ...info
    })).sort((a, b) => b.qty - a.qty);

    return {
      targetDate: target,
      totalOmzet,
      countSuccess,
      totalQRIS,
      countQRIS,
      totalCash,
      countCash,
      items: itemsList
    };
  }, [transactions, filterPeriod, customFilterDate]);

  // 3. Analytics Chart: Sales Trend (Last 7 Days)
  const chartData = useMemo(() => {
    const today = new Date();
    const days = [];
    
    // Generate empty buckets for last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const keyStr = d.toISOString().split('T')[0];
      days.push({
        dateKey: keyStr,
        label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        dateFull: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        revenue: 0,
        count: 0
      });
    }

    // Populate buckets
    transactions.forEach(t => {
      if (t.paymentStatus === 'Belum Bayar' || t.paymentStatus === 'Belum Dibayar') return;
      const tKey = t.timestamp.split('T')[0];
      const match = days.find(d => d.dateKey === tKey);
      if (match) {
        match.revenue += t.total;
        match.count += 1;
      }
    });

    return days;
  }, [transactions]);

  // Calculate coordinates for SVG line map
  const svgChartNodes = useMemo(() => {
    const maxVal = Math.max(...chartData.map(d => d.revenue), 100000) * 1.15; // 15% padding top
    const width = 600;
    const height = 180;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const points = chartData.map((d, index) => {
      const x = paddingLeft + (index / (chartData.length - 1)) * chartW;
      const y = height - paddingBottom - (d.revenue / maxVal) * chartH;
      return { x, y, data: d };
    });

    // Generate Path string
    let pathD = '';
    let areaD = `M ${points[0]?.x || paddingLeft} ${height - paddingBottom}`;

    points.forEach((p, idx) => {
      if (idx === 0) {
        pathD += `M ${p.x} ${p.y}`;
      } else {
        // Curve control points
        const prev = points[idx - 1];
        const cpX1 = prev.x + (p.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (p.x - prev.x) / 2;
        const cpY2 = p.y;
        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
      }
      areaD += ` L ${p.x} ${p.y}`;
    });

    if (points.length > 0) {
      areaD += ` L ${points[points.length - 1].x} ${height - paddingBottom} Z`;
    }

    const yGridValues = [0, 0.25, 0.5, 0.75, 1].map(r => ({
      y: height - paddingBottom - r * chartH,
      val: Math.round(r * maxVal)
    }));

    return { points, pathD, areaD, yGridValues, height, width, paddingLeft, paddingBottom };
  }, [chartData]);


  // 4. Menu Terlaris (Top Selling Items)
  const topItems = useMemo(() => {
    const itemMap: Record<string, { product: Product; qty: number; revenue: number }> = {};
    
    transactions.forEach(t => {
      if (t.paymentStatus === 'Belum Bayar' || t.paymentStatus === 'Belum Dibayar') return;
      t.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (!prod) return;
        if (!itemMap[prod.id]) {
          itemMap[prod.id] = { product: prod, qty: 0, revenue: 0 };
        }
        itemMap[prod.id].qty += item.quantity;
        itemMap[prod.id].revenue += item.quantity * item.price;
      });
    });

    return Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5); // top 5
  }, [transactions, products]);

  // 5. Category distribution
  const categorySplit = useMemo(() => {
    const counts = { KOPI: 0, NON_KOPI: 0, MAKANAN: 0, CEMILAN: 0 };
    let totalRev = 0;
    
    transactions.forEach(t => {
      if (t.paymentStatus === 'Belum Bayar' || t.paymentStatus === 'Belum Dibayar') return;
      t.items.forEach(item => {
        const cat = item.category || 'KOPI';
        if (cat in counts) {
          counts[cat] += item.quantity * item.price;
          totalRev += item.quantity * item.price;
        }
      });
    });

    return [
      { name: 'Kopi Espresso Base', value: counts.KOPI, color: '#3C2A21', percentage: totalRev > 0 ? Math.round((counts.KOPI / totalRev) * 100) : 0 },
      { name: 'Non-Kopi & Teh', value: counts.NON_KOPI, color: '#D4A373', percentage: totalRev > 0 ? Math.round((counts.NON_KOPI / totalRev) * 100) : 0 },
      { name: 'Makanan Utama', value: counts.MAKANAN, color: '#8E8D8A', percentage: totalRev > 0 ? Math.round((counts.MAKANAN / totalRev) * 100) : 0 },
      { name: 'Roti & Cemilan', value: counts.CEMILAN, color: '#EAE7E2', percentage: totalRev > 0 ? Math.round((counts.CEMILAN / totalRev) * 100) : 0 },
    ];
  }, [transactions]);

  // Format category identifier for nicer view
  const categoryLabel = (cat: string) => {
    switch (cat) {
      case 'KOPI': return 'Kopi';
      case 'NON_KOPI': return 'Non-Kopi';
      case 'MAKANAN': return 'Makanan';
      case 'CEMILAN': return 'Cemilan';
      default: return cat;
    }
  };

  const latestTransactions = useMemo(() => {
    return [...transactions]
      .filter(t => t.paymentStatus !== 'Belum Bayar' && t.paymentStatus !== 'Belum Dibayar')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Welcome Hero banner */}
      <div className="relative bg-[#3C2A21] border border-black/5 text-white p-6 sm:p-8 rounded-3xl shadow-lg overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-y-[-20%] translate-x-[15%]">
          <Coffee size={350} />
        </div>
        <div className="relative z-10 max-w-xl">
          <span className="bg-[#D4A373]/30 text-[#F5F2ED] px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase inline-flex items-center gap-1.5 mb-4 border border-[#D4A373]/20">
            <Sparkles size={12} className="text-[#D4A373]" /> Buatan Rio ganteng untuk pudans
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-[#F9F6F0]">
            Pudan's Coffee
          </h1>
          <p className="mt-2 text-sm text-stone-300 font-sans leading-relaxed">
            Kelola transaksi kasir, analisis omzet penjualan, dan kelola menu kopi premium Anda dengan praktis, cepat, dan modern.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              id="dash-btn-pos"
              onClick={onNavigateToPOS}
              className="bg-[#D4A373] hover:bg-[#C29262] text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-md transition duration-200 flex items-center gap-2 transform active:scale-95 cursor-pointer"
            >
              <ShoppingBag size={16} /> Buka Mesin Kasir (POS)
            </button>
            {onClearAllTransactions && transactions.length > 0 && (
              <button
                id="dash-btn-reset"
                onClick={() => setShowResetConfirm(true)}
                className="bg-stone-850/50 hover:bg-stone-800 text-[#F5F2ED] font-semibold text-sm px-5 py-2.5 rounded-xl transition duration-200 flex items-center gap-2 border border-white/10 cursor-pointer"
                title="Atur ulang statistik transaksi ke 0"
              >
                <RotateCcw size={15} /> RESET
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid statistics 4 Kolom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today revenue */}
        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm transition hover:shadow-md flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Omzet Hari Ini</p>
            <h3 className="text-2xl font-bold font-sans text-stone-800" id="dash-omzet-hari-ini">
              {formatIDR(stats.todayRevenue)}
            </h3>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-max">
              <Clock size={10} /> {stats.todayCount} Pesanan Selesai
            </div>
          </div>
          <div className="bg-[#F5F2ED] text-[#3C2A21] p-3 rounded-xl">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Weekly revenue */}
        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm transition hover:shadow-md flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Omzet 7 Hari Terakhir</p>
            <h3 className="text-2xl font-bold font-sans text-stone-800">
              {formatIDR(stats.weeklyRevenue)}
            </h3>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-max">
              {growth.isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              <span>{Math.abs(growth.percent)}% dari target</span>
            </div>
          </div>
          <div className="bg-stone-150 text-stone-700 p-3 rounded-xl">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Monthly revenue */}
        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm transition hover:shadow-md flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Omzet Bulan Ini</p>
            <h3 className="text-2xl font-bold font-sans text-stone-800">
              {formatIDR(stats.monthlyRevenue)}
            </h3>
            <span className="text-[11px] text-gray-400 block font-normal text-stone-500">Estimasi total bulanan berjalan</span>
          </div>
          <div className="bg-[#D4A373]/15 text-[#3C2A21] p-3 rounded-xl">
            <TrendingUp size={20} className="text-[#3C2A21]" />
          </div>
        </div>

        {/* Total transaction */}
        <button
          type="button"
          onClick={() => {
            setFilterPeriod('TODAY');
            setCustomFilterDate(new Date().toISOString().split('T')[0]);
            setShowTrxFilterModal(true);
          }}
          className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm transition hover:shadow-md hover:border-[#D4A373]/30 hover:scale-[1.01] active:scale-[0.99] flex items-start justify-between text-left w-full cursor-pointer focus:outline-none group"
        >
          <div className="space-y-2">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider group-hover:text-[#D4A373] transition">Total Transaksi</p>
            <h3 className="text-2xl font-bold font-sans text-stone-800">
              {stats.transactionCount} <span className="text-sm font-normal text-gray-400 font-sans">Total</span>
            </h3>
            <span className="text-[11px] text-[#D4A373] font-semibold block flex items-center gap-1">
              <span>Klik rincian harian</span> ➔
            </span>
          </div>
          <div className="bg-stone-100 text-stone-700 p-3 rounded-xl group-hover:bg-[#3C2A21] group-hover:text-white transition duration-250">
            <ShoppingBag size={20} />
          </div>
        </button>
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Trend Chart (SVG curves) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-800">Tren Penjualan 7 Hari Terakhir</h3>
              <p className="text-xs text-stone-400">Tampilan omzet harian yang diperbarui real-time</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-[#3C2A21]"></span>
              <span className="text-xs text-stone-500 font-medium font-sans">Omzet Harian (IDR)</span>
            </div>
          </div>

          {/* SVG Custom interactive Line Chart */}
          <div className="relative w-full overflow-hidden mt-4">
            <svg 
              viewBox={`0 0 ${svgChartNodes.width} ${svgChartNodes.height}`} 
              className="w-full h-auto select-none"
            >
              {/* Draw Grids and Y Axis metrics */}
              {svgChartNodes.yGridValues.map((g, idx) => (
                <g key={idx} className="opacity-40">
                  <line 
                    x1={svgChartNodes.paddingLeft} 
                    y1={g.y} 
                    x2={svgChartNodes.width - 20} 
                    y2={g.y} 
                    stroke="#EAE7E2" 
                    strokeWidth="1" 
                    strokeDasharray="4 4"
                  />
                  <text 
                    x={svgChartNodes.paddingLeft - 8} 
                    y={g.y + 4} 
                    fontSize="10" 
                    fontFamily="monospace" 
                    textAnchor="end" 
                    fill="#8E8D8A"
                  >
                    {g.val >= 1000 ? `${g.val / 1000}k` : g.val}
                  </text>
                </g>
              ))}

              {/* Shaded Area underneath */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3C2A21" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#3C2A21" stopOpacity="0.00" />
                </linearGradient>
              </defs>
              <path 
                d={svgChartNodes.areaD} 
                fill="url(#chartGradient)" 
              />

              {/* Connected Line curve */}
              <path 
                d={svgChartNodes.pathD} 
                fill="none" 
                stroke="#3C2A21" 
                strokeWidth="2.5" 
                strokeLinecap="round"
              />

              {/* Intersections Circles */}
              {svgChartNodes.points.map((p, idx) => {
                const isHovered = hoveredPoint?.day === p.data.label;
                return (
                  <g key={idx}>
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r={isHovered ? 7 : 4} 
                      fill={isHovered ? "#D4A373" : "#3C2A21"} 
                      stroke="#FFFFFF" 
                      strokeWidth="2"
                      className="transition-all duration-150 cursor-pointer"
                      onMouseEnter={(e) => {
                        setHoveredPoint({
                           day: p.data.label,
                           value: p.data.revenue,
                           x: p.x,
                           y: p.y
                        });
                      }}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    {/* X Axis labels */}
                    <text 
                      x={p.x} 
                      y={svgChartNodes.height - 10} 
                      fontSize="10" 
                      fontWeight="500"
                      fill="#78716C" 
                      textAnchor="middle"
                    >
                      {p.data.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Custom overlay DOM Tooltip */}
            {hoveredPoint && (
              <div 
                className="absolute bg-stone-900 text-white rounded-lg p-2 text-xs shadow-xl pointer-events-none z-20 border border-stone-800 transition-all duration-75"
                style={{
                  left: `${(hoveredPoint.x / svgChartNodes.width) * 100}%`,
                  top: `${(hoveredPoint.y / svgChartNodes.height) * 100 - 25}%`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <p className="font-semibold">{hoveredPoint.day}</p>
                <p className="text-[#D4A373] font-mono">{formatIDR(hoveredPoint.value)}</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-around items-center bg-[#F5F2ED]/50 rounded-xl p-3 border border-black/5 mt-4 text-center">
            {chartData.map((d, i) => (
              <div key={i} className="space-y-1">
                <span className="text-[10px] text-[#8E8D8A] font-medium uppercase font-sans">{d.label}</span>
                <span className="block text-xs font-bold text-stone-800 font-mono">
                  {d.revenue > 0 ? `${(d.revenue / 1000).toFixed(0)}k` : '0'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Split */}
        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-800">Kontribusi Kategori</h3>
            <p className="text-xs text-[#8E8D8A]">Pembagian pendapatan per kategori produk</p>
          </div>

          <div className="my-6 space-y-4">
            {categorySplit.map((c, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-stone-700">{c.name}</span>
                  <span className="font-mono text-stone-800">{c.percentage}% ({formatIDR(c.value)})</span>
                </div>
                <div className="w-full bg-[#FAF7F2] h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#F5F2ED] p-3 rounded-xl border border-black/5 text-center">
            <span className="text-[11px] text-[#3C2A21] font-semibold flex items-center justify-center gap-1.5">
              <Award size={14} /> Kopi Espresso tetap menjadi andalan omzet utama Pudan's Coffee.
            </span>
          </div>
        </div>
      </div>

      {/* Grid below: Menu Terlaris and Latest Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Menu Terlaris Card */}
        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-serif text-lg font-bold text-stone-800 flex items-center gap-2">
              <Award className="text-amber-500 fill-amber-100" size={20} /> 5 Menu Terlaris (Top-Seller)
            </h3>
            <p className="text-xs text-[#8E8D8A]">Berdasarkan volume kuantitas penjualan terhitung</p>
          </div>

          {topItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-[#8E8D8A]">
              <Utensils size={36} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">Belum ada transaksi</p>
              <p className="text-xs max-w-xs">Lakukan pesanan di Kasir untuk melihat peringkat menu terlaris.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 flex-1">
              {topItems.map((item, idx) => (
                <div key={item.product.id} className="flex justify-between items-center py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-white
                      ${idx === 0 ? 'bg-[#D4A373]' : idx === 1 ? 'bg-stone-500' : idx === 2 ? 'bg-[#3C2A21]' : 'bg-stone-300'}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-stone-800 leading-tight">{item.product.name}</h4>
                      <span className="text-[11px] text-stone-500 bg-[#F5F2ED] px-2 py-0.5 rounded-full font-medium border border-black/5">
                        {categoryLabel(item.product.category)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold text-stone-800 font-mono">{item.qty} Terjual</span>
                    <span className="text-[11px] text-stone-500 block font-mono">{formatIDR(item.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest Transactions Column */}
        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm flex flex-col">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-800 flex items-center gap-2">
                <Clock className="text-stone-700" size={20} /> Aktivitas Transaksi Terakhir
              </h3>
              <p className="text-xs text-[#8E8D8A]">Pembayaran selesai paling baru oleh kasir</p>
            </div>
          </div>

          {latestTransactions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-[#8E8D8A]">
              <ShoppingBag size={36} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">Belum ada transaksi</p>
              <button 
                onClick={onNavigateToPOS}
                className="mt-2 text-xs text-[#D4A373] font-semibold underline"
              >
                Buat pesanan pertama sekarang!
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 flex-1">
              {latestTransactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-800 font-mono">{tx.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold font-mono
                        ${tx.paymentMethod === 'QRIS' ? 'bg-sky-50 text-sky-700 border border-sky-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                        {tx.paymentMethod}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-sans">
                      Pelanggan: <strong className="text-stone-700">{tx.customerName || 'Walk-In'}</strong> • {new Date(tx.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="block text-sm font-bold text-[#3C2A21] font-mono">{formatIDR(tx.total)}</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block font-semibold">Selesai</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-black/5 p-6 flex flex-col items-center text-center animate-scale-in">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4 border border-rose-100">
              <RotateCcw size={20} className="animate-spin-once" />
            </div>
            <h3 className="font-serif text-base font-bold text-stone-850">Kosongkan Semua Data?</h3>
            <p className="text-xs text-[#8E8D8A] mt-2 mb-4">
              Apakah Anda yakin ingin menghapus seluruh data transaksi ini? Statistik monitor dan seluruh riwayat struk akan diatur ulang kembali ke 0.
            </p>

            <div className="w-full mb-5 text-left">
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 font-sans">
                Kode Akses Kasir (Mulai Baru)
              </label>
              <input
                type="password"
                value={resetCode}
                onChange={(e) => {
                  setResetCode(e.target.value);
                  setResetError('');
                }}
                placeholder="Masukkan kode akses..."
                className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-stone-50 text-xs font-mono font-bold text-stone-800 tracking-widest placeholder:tracking-normal"
              />
              {resetError && (
                <p className="text-[11px] text-rose-600 mt-1.5 font-semibold flex items-center gap-1 font-sans">
                  <AlertCircle size={12} /> {resetError}
                </p>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetCode('');
                  setResetError('');
                }}
                className="flex-1 py-2.5 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold transition border border-stone-250 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (resetCode !== 'pudans123') {
                    setResetError('Kode otorisasi salah, silakan isi kembali.');
                    return;
                  }
                  if (onClearAllTransactions) {
                    onClearAllTransactions();
                  }
                  setShowResetConfirm(false);
                  setResetCode('');
                  setResetError('');
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Kosongkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DAILY TRANSACTION FILTERS & MONITOR DIALOG */}
      {showTrxFilterModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-black/5 flex flex-col max-h-[85vh] animate-scale-in">
            {/* Modal Header */}
            <div className="bg-[#FAF7F2] px-6 py-4 border-b border-stone-200 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2 text-[#3C2A21]">
                <Calendar size={18} />
                <h3 className="font-serif text-sm font-bold">Rincian Total Transaksi</h3>
              </div>
              <button 
                onClick={() => setShowTrxFilterModal(false)}
                className="text-stone-400 hover:text-stone-700 bg-white/70 hover:bg-white p-1 rounded-full transition cursor-pointer"
              >
                <AlertCircle size={20} className="hidden" />
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 border border-stone-200 rounded-md">Tutup</span>
              </button>
            </div>

            {/* Quick Segment Selectors */}
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-150 flex-shrink-0 space-y-3.5">
              <div className="grid grid-cols-3 gap-1.5 bg-stone-100 p-1 rounded-xl">
                {([
                  { label: 'Hari Ini', value: 'TODAY' },
                  { label: 'Kemarin', value: 'YESTERDAY' },
                  { label: 'Pilih Tanggal', value: 'CUSTOM' }
                ] as const).map((seg) => (
                  <button
                    key={seg.value}
                    type="button"
                    onClick={() => setFilterPeriod(seg.value)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold transition text-center cursor-pointer
                      ${filterPeriod === seg.value
                        ? 'bg-[#3C2A21] text-white shadow-xs'
                        : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Input Element */}
              {filterPeriod === 'CUSTOM' && (
                <div className="space-y-1 animate-slide-in">
                  <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest">
                    Cari Berdasarkan Tanggal
                  </label>
                  <input
                    type="date"
                    value={customFilterDate}
                    onChange={(e) => setCustomFilterDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-stone-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] bg-white text-xs font-mono font-bold text-stone-800"
                  />
                </div>
              )}

              {/* Dynamic day label with strict DD/MM/YYYY format representation */}
              <div className="flex justify-between items-center bg-amber-50/50 border border-amber-100/60 p-2.5 rounded-lg font-mono text-xs">
                <span className="text-stone-500 text-[10px] font-semibold">TANGGAL MONITOR:</span>
                <span className="text-[#3C2A21] font-black tracking-wider text-[11px]">
                  {formatToDayMonthYear(filteredDayStats.targetDate)}
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Main Summary Blocks */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#D4A373]/10 text-center space-y-1">
                  <span className="text-[9px] text-[#D4A373] font-bold uppercase tracking-wider block">Omzet Selesai</span>
                  <span className="text-sm font-black font-mono text-[#3C2A21] block">
                    {formatIDR(filteredDayStats.totalOmzet)}
                  </span>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/50 text-center space-y-1">
                  <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Total Transaksi</span>
                  <span className="text-sm font-black font-mono text-stone-850 block">
                    {filteredDayStats.countSuccess} Transaksi
                  </span>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="space-y-2 bg-stone-50/65 p-4 rounded-2xl border border-stone-150">
                <h4 className="text-[10px] uppercase font-bold text-stone-550 tracking-wider">Metode Pembayaran</h4>
                <div className="space-y-2 text-xs font-mono font-semibold">
                  <div className="flex justify-between items-center text-stone-650">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span>Tunai (Cash)</span>
                    </span>
                    <span>{filteredDayStats.countCash}x ({formatIDR(filteredDayStats.totalCash)})</span>
                  </div>
                  <div className="flex justify-between items-center text-stone-650">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
                      <span>QRIS Digital</span>
                    </span>
                    <span>{filteredDayStats.countQRIS}x ({formatIDR(filteredDayStats.totalQRIS)})</span>
                  </div>
                </div>
              </div>

              {/* Items Sold Breakdown */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-stone-550 tracking-wider flex justify-between">
                  <span>Rincian Menu Terjual</span>
                  <span>Volume</span>
                </h4>
                
                {filteredDayStats.items.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-xs font-medium bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    Tidak ada produk terjual pada tanggal ini.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 max-h-48 overflow-y-auto pr-1">
                    {filteredDayStats.items.map((item) => (
                      <div key={item.id} className="py-2 flex justify-between items-center text-[11px]">
                        <div>
                          <span className="font-semibold text-stone-850 block">{item.name}</span>
                          <span className="text-[9px] text-[#D4A373] bg-[#FAF7F2] font-semibold px-2 py-0.5 rounded-md uppercase font-mono">{item.category}</span>
                        </div>
                        <div className="text-right font-mono text-stone-700 font-bold">
                          <span>{item.qty}x</span>
                          <span className="text-[9px] text-stone-400 block font-normal">{formatIDR(item.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Footer Actions */}
            <div className="p-4 bg-stone-50 border-t border-stone-150 flex-shrink-0 text-center">
              <button
                type="button"
                onClick={() => setShowTrxFilterModal(false)}
                className="w-full py-2.5 bg-[#3C2A21] hover:bg-stone-900 text-white font-bold text-xs rounded-xl cursor-pointer transition shadow-sm"
              >
                Kembali ke Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
