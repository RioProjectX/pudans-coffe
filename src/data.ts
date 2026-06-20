import { Product, Transaction, Category } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Espresso Double',
    category: 'KOPI',
    price: 20000,
    description: 'Double shot espresso murni dari biji kopi arabika pilihan dengan crema tebal dan rasa intens.',
    image: 'https://images.unsplash.com/photo-151097252790b-af4f42df8e40?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-2',
    name: 'Cappuccino Warm',
    category: 'KOPI',
    price: 28000,
    description: 'Keseimbangan sempurna espresso, susu kukus (steamed milk), dan foam lembut di atasnya.',
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-3',
    name: "Signature Pudan's Latte",
    category: 'KOPI',
    price: 32000,
    description: "Es kopi susu khas Pudan's dengan racikan pandan segar, krim kelapa lembut, dan gula aren organik.",
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-4',
    name: 'Iced Caramel Macchiato',
    category: 'KOPI',
    price: 34000,
    description: 'Espresso dipadukan dengan sirup vanilla, susu segar dingin, dan siraman saus karamel premium di atasnya.',
    image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-5',
    name: 'Spanish Cafe Latte',
    category: 'KOPI',
    price: 28000,
    description: 'Espresso dengan susu segar yang dimaniskan dengan sedikit susu kental manis premium.',
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-6',
    name: 'Iced Matcha Espresso',
    category: 'KOPI',
    price: 32000,
    description: 'Gradasi 3 lapis estetik antara espresso arabika, susu segar, dan bubuk matcha premium Uji, Jepang.',
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-7',
    name: 'Kyoto Matcha Latte',
    category: 'NON_KOPI',
    price: 30000,
    description: 'Bubuk green tea murni Uji, Kyoto yang di-whisk dengan susu cair segar hangat atau dingin.',
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-8',
    name: 'Belgian Dark Chocolate',
    category: 'NON_KOPI',
    price: 30000,
    description: 'Cokelat hitam Belgia murni 70% dilelehkan bersama susu segar hangat, kaya rasa dan manis seimbang.',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-9',
    name: 'Wild Strawberry Iced Tea',
    category: 'NON_KOPI',
    price: 26000,
    description: 'Teh hitam premium diseduh dingin dengan potongan buah stroberi liar segar dan daun mint aromatik.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-10',
    name: "Pudan's Fried Rice (Nasi Goreng)",
    category: 'MAKANAN',
    price: 35000,
    description: 'Nasi goreng bumbu tradisional dengan telur mata sapi, sate ayam, acar segar, dan kerupuk udang renyah.',
    image: 'https://images.unsplash.com/photo-1603133872878-685519c77420?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-11',
    name: 'Spaghetti Carbonara',
    category: 'MAKANAN',
    price: 36000,
    description: 'Spaghetti pasta dimasak creamy kaya telur, keju parmesan, bawang putih, dan dihiasi smoked beef renyah.',
    image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-12',
    name: 'Club Sandwich Supreme',
    category: 'MAKANAN',
    price: 38000,
    description: 'Tumpukan roti panggang gandum diisi dada ayam panggang juicy, bacon sapi, telur mata sapi, selada, dan mayo.',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-13',
    name: 'Butter Almond Croissant',
    category: 'CEMILAN',
    price: 26000,
    description: 'Pastry mentega renyah berlapis-lapis khas Perancis dengan isian krim almond manis dan taburan kacang garing.',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-14',
    name: 'Gourmet Cinnamon Roll',
    category: 'CEMILAN',
    price: 24000,
    description: 'Roti gulung rasa kayu manis yang lembut dengan lelehan cream cheese gurih di atasnya.',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    id: 'prod-15',
    name: 'Truffle Shoestring Fries',
    category: 'CEMILAN',
    price: 25000,
    description: 'Kentang goreng renyah dibumbui minyak jamur truffle hitam alami, garam laut halus, dan daun rosemary.',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  }
];

// Helper to generate a date relative to now in ISO format (Y_M_D H_M_S)
function getDateOffset(daysAgo: number, hour: number, minute: number): string {
  const date = new Date('2026-06-17T10:41:00-07:00'); // Consistent baseline matching current time
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export const INITIAL_TRANSACTIONS: Transaction[] = [];
