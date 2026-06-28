import { useState, useMemo, FormEvent } from 'react';
import { Product, Category } from '../types';
import { Search, Plus, Edit, Trash2, Check, X, Camera, Sparkles, Filter, CheckSquare, Square } from 'lucide-react';

interface CatalogProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onEditProduct: (id: string, updatedProduct: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
}

export default function Catalog({ products, onAddProduct, onEditProduct, onDeleteProduct }: CatalogProps) {
  // Filters state
  const [activeCategory, setActiveCategory] = useState<Category | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<Category>('KOPI');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formStock, setFormStock] = useState<string>('');

  // Error messages state
  const [formError, setFormError] = useState('');

  // Delete product modal control
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Curated premium images for easy quick selection!
  const SUGGESTED_IMAGES = [
    { name: 'Kopi Hangat (Latte)', url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400' },
    { name: 'Es Kopi (Iced Latte)', url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=400' },
    { name: 'Cappuccino / Foam', url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=400' },
    { name: 'Matcha / Teh Hijau', url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=400' },
    { name: 'Cokelat Dingin', url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=400' },
    { name: 'Teh Buah / Stroberi', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400' },
    { name: 'Croissant / Roti', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=400' },
    { name: 'Nasi Goreng / Utama', url: 'https://images.unsplash.com/photo-1603133872878-685519c77420?auto=format&fit=crop&q=80&w=400' },
    { name: 'Kentang Goreng (Fries)', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400' },
  ];

  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = activeCategory === 'ALL' || p.category === activeCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // Open Add modal form
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('KOPI');
    setFormPrice('');
    setFormDescription('');
    setFormImage(SUGGESTED_IMAGES[0].url); // pre-select latte
    setFormIsAvailable(true);
    setFormStock('');
    setFormError('');
    setShowFormModal(true);
  };

  // Open Edit modal form
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(product.price.toString());
    setFormDescription(product.description || '');
    setFormImage(product.image || '');
    setFormIsAvailable(product.isAvailable);
    setFormStock(product.stock !== undefined ? product.stock.toString() : '');
    setFormError('');
    setShowFormModal(true);
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      setFormError('Nama menu wajib diisi.');
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Harga wajib diisi dengan angka positif.');
      return;
    }

    const stockNum = formStock.trim() !== '' ? parseInt(formStock, 10) : undefined;
    if (stockNum !== undefined && (isNaN(stockNum) || stockNum < 0)) {
      setFormError('Stok barang wajib diisi dengan angka non-negatif.');
      return;
    }

    const productPayload = {
      name: formName.trim(),
      category: formCategory,
      price: priceNum,
      description: '',
      image: '',
      isAvailable: formIsAvailable,
      stock: stockNum,
    };

    if (editingProduct) {
      onEditProduct(editingProduct.id, productPayload);
    } else {
      onAddProduct(productPayload);
    }

    setShowFormModal(false);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  return (
    <div className="space-y-6">
      
      {/* Catalog Controls Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
        <div className="space-y-1">
          <h2 className="font-serif text-lg font-bold text-[#3C2A21]">Manajemen Katalog Menu</h2>
          <p className="text-xs text-[#8E8D8A]">Tambah menu kopi baru, atur ketersediaan harian, dan ubah harga dengan sekali ketuk.</p>
        </div>
        
        <button
          id="catalog-add-btn"
          onClick={handleOpenAdd}
          className="bg-[#D4A373] hover:bg-[#C29262] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition duration-200 flex items-center gap-2 transform active:scale-95 whitespace-nowrap self-stretch md:self-auto text-center justify-center cursor-pointer"
        >
          <Plus size={16} /> Tambah Menu Baru
        </button>
      </div>

      {/* Advanced search and scroll filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Category horizontal filters */}
        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
          {([
            { label: 'Semua Kategori', value: 'ALL' },
            { label: 'Kopi', value: 'KOPI' },
            { label: 'Non-Kopi', value: 'NON_KOPI' },
            { label: 'Makanan', value: 'MAKANAN' },
            { label: 'Cemilan', value: 'CEMILAN' },
          ] as { label: string; value: Category | 'ALL' }[]).map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`text-xs px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition border ${
                activeCategory === cat.value
                  ? 'bg-[#3C2A21] border-[#3C2A21] text-white'
                  : 'bg-stone-50 border-stone-250 text-[#3C2A21] hover:bg-stone-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input field */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
          <input
            type="text"
            placeholder="Cari menu di katalog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] text-xs transition bg-white"
          />
        </div>
      </div>

      {/* Grid displays items */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-black/5 shadow-sm flex flex-col items-center justify-center">
          <Camera size={44} className="text-stone-300 mb-3" />
          <h3 className="font-serif text-base font-bold text-stone-800">Menu Kosong</h3>
          <p className="text-xs text-[#8E8D8A] max-w-xs mt-1">
            Belum ada menu yang terdaftar atau hasil filter Anda kosong. Tambahkan menu baru sekarang.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => (
            <div 
              key={p.id}
              className={`bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-[#D4A373] p-4
                ${!p.isAvailable ? 'border-dashed opacity-75 bg-stone-50' : ''}
              `}
            >
              {/* Product Info */}
              <div className="space-y-3">
                {/* Available Status and Category Header Line */}
                <div className="flex justify-between items-center gap-1.5">
                  <span className="text-[9px] text-[#3C2A21] bg-[#F5F2ED] border border-black/5 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {p.category.toLowerCase().replace('_', '-')}
                  </span>
                  
                  {/* Available Status Pill Indicator */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide
                    ${p.isAvailable 
                      ? 'bg-emerald-50 text-emerald-800' 
                      : 'bg-rose-50 text-rose-800'
                    }`}
                  >
                    {p.isAvailable ? 'Tersedia' : 'Habis'}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-stone-800 tracking-tight leading-tight">{p.name}</h4>
                <div className="flex justify-between items-center text-[10px] text-stone-500 font-mono mt-1 pt-0.5">
                  <span>Stok:</span>
                  <span className={`font-bold ${p.stock !== undefined && p.stock <= 5 ? 'text-rose-500 font-extrabold animate-pulse' : 'text-[#3C2A21]'}`}>
                    {p.stock !== undefined ? `${p.stock} pcs` : 'Tidak Terbatas'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 mt-4 border-t border-stone-100">
                <span className="text-sm font-black font-mono text-stone-900">{formatIDR(p.price)}</span>
                
                {/* Action items */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-1.5 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-lg transition border border-stone-150 cursor-pointer"
                    title="Edit menu"
                  >
                    <Edit size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(p.id)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition border border-rose-100 cursor-pointer"
                    title="Hapus menu"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Elegant form dialog overlay (Slide-in/Zoom modal) */}
      {showFormModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-stone-100 flex flex-col relative animate-scale-in">
            
            {/* Modal Form header */}
            <div className="p-5 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
              <div>
                <h3 className="font-serif text-base font-bold text-stone-800">
                  {editingProduct ? 'Ubah Detail Menu Kopi' : 'Tambah Menu Baru'}
                </h3>
                <p className="text-[11px] text-stone-400">Sesuaikan data produk dalam katalog Pudan's Coffee</p>
              </div>
              <button 
                onClick={() => setShowFormModal(false)}
                className="p-1.5 hover:bg-stone-200 rounded-full text-stone-400 hover:text-stone-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Core input form handles */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)]">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span> {formError}
                </div>
              )}

              {/* Grid 2 Column */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[11px] text-[#3C2A21] font-bold uppercase">Nama Menu *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sea Salt Caramel Latte"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] text-xs bg-white"
                  />
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <label className="text-[11px] text-[#3C2A21] font-bold uppercase">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 30000"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] text-xs font-mono font-bold bg-white"
                  />
                </div>

                {/* Category select dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] text-[#3C2A21] font-bold uppercase">Kategori Menu</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as Category)}
                    className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] bg-white text-xs"
                  >
                    <option value="KOPI">☕ Kopi (Espresso Base / Signature)</option>
                    <option value="NON_KOPI">🍹 Non-Kopi &amp; Fresh Milk Tea</option>
                    <option value="MAKANAN">🍳 Makanan Utama (Nasi/Pasta/Sandwich)</option>
                    <option value="CEMILAN">🍰 Roti &amp; Kentang Goreng</option>
                  </select>
                </div>

                {/* Stok Barang */}
                <div className="space-y-1">
                  <label className="text-[11px] text-[#3C2A21] font-bold uppercase">Stok Barang (Kosongkan jika tak terbatas)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 50"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D4A373] text-xs font-mono bg-white"
                  />
                </div>

                {/* Status Toggle option */}
                <div className="space-y-1">
                  <label className="text-[11px] text-stone-500 font-bold uppercase block">Status Ketersediaan</label>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormIsAvailable(true)}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition
                        ${formIsAvailable 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                          : 'bg-white text-stone-400 border-stone-200 hover:bg-stone-50'}`}
                    >
                      <Check size={14} /> Tersedia
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormIsAvailable(false)}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition
                        ${!formIsAvailable 
                          ? 'bg-rose-50 text-rose-700 border-rose-300' 
                          : 'bg-white text-stone-400 border-stone-200 hover:bg-stone-50'}`}
                    >
                      <X size={14} /> Habis
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="p-4 bg-[#F5F2ED] rounded-2xl flex justify-end gap-3 mt-4 border border-black/5">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-stone-500 hover:bg-stone-200 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-[#3C2A21] hover:bg-[#2D1F18] text-white text-xs font-bold px-6 py-2 rounded-xl transition shadow-sm cursor-pointer"
                >
                  {editingProduct ? 'Simpan Perubahan' : 'Tambahkan Ke Katalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Minimalist Confirmation Modal for Deletion */}
      {deleteId && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-black/5 p-6 flex flex-col items-center text-center animate-scale-in">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4 border border-rose-100">
              <Trash2 size={20} />
            </div>
            <h3 className="font-serif text-base font-bold text-stone-850">Hapus Menu Kopi?</h3>
            <p className="text-xs text-[#8E8D8A] mt-2 mb-6">
              Apakah Anda yakin ingin menghapus menu ini dari katalog? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold transition border border-stone-250 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (deleteId) {
                    onDeleteProduct(deleteId);
                    setDeleteId(null);
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
