// The real printed Freddo menu (Sprint 37). Prices are EGP and copied from
// the photo of the menu. Plain data only; seed.js upserts it by slug.

const cat = (slug, ar, en) => ({ slug, name: { ar, en } });
export const categories = [
  cat('iced-coffee', 'آيس كوفي', 'Iced Coffee'),
  cat('coffee', 'قهوة', 'Coffee'),
  cat('fresh-juice', 'عصائر فريش', 'Fresh Juice'),
  cat('smoothie', 'سموذي', 'Smoothie'),
  cat('milk-shake', 'ميلك شيك', 'Milk Shake'),
  cat('mojito', 'موهيتو', 'Mojito'),
  cat('soft-drinks', 'مشروبات غازية', 'Soft Drinks'),
  cat('hot-drinks', 'مشروبات ساخنة', 'Hot Drinks'),
  cat('additions', 'إضافات', 'Additions'),
];
const C = Object.fromEntries(categories.map((c) => [c.slug, c]));

const flavors = [
  { label: { ar: 'فانيليا', en: 'Vanilla' } },
  { label: { ar: 'كراميل', en: 'Caramel' } },
  { label: { ar: 'موكا', en: 'Mocha' } },
];
const generic = {
  'iced-coffee': ['قهوة مثلجة من بن فريدو.', 'Iced coffee made with Freddo beans.'],
  coffee: ['قهوة طازجة من بن فريدو.', 'Fresh coffee made with Freddo beans.'],
  'fresh-juice': ['عصير فريش.', 'Fresh juice.'],
  smoothie: ['سموذي بارد.', 'Cold smoothie.'],
  'milk-shake': ['ميلك شيك كريمي.', 'Creamy milk shake.'],
  mojito: ['موهيتو منعش.', 'Refreshing mojito.'],
  'soft-drinks': ['مشروب بارد.', 'Cold drink.'],
  'hot-drinks': ['مشروب ساخن.', 'Hot drink.'],
  additions: ['إضافة للمشروبات والحلويات.', 'An extra for drinks and sweets.'],
};

// [category, slug, price, arabic, english, options]
// options.variants: flavour choices at the same price; options.image: false
// keeps the neutral placeholder (third-party trademarks, no price, ...).
const rows = [
  ['iced-coffee', 'freddo-espresso', 50, 'فريدو اسبريسو', 'Freddo Espresso'],
  ['iced-coffee', 'freddo-cappuccino', 60, 'فريدو كابتشينو', 'Freddo Cappuccino'],
  ['iced-coffee', 'iced-cappuccino', 100, 'ايس كابتشينو', 'Iced Cappuccino'],
  ['iced-coffee', 'iced-americano', 60, 'ايس امريكانو', 'Iced Americano'],
  ['iced-coffee', 'iced-latte', 80, 'ايس لاتيه', 'Iced Latte'],
  ['iced-coffee', 'iced-mocha', 100, 'ايس موكا', 'Iced Mocha'],
  ['iced-coffee', 'iced-pistachio', 100, 'ايس بستاشيو', 'Iced Pistachio'],
  ['iced-coffee', 'iced-caramel-latte', 100, 'ايس كراميل لاتيه', 'Iced Caramel Latte'],
  ['iced-coffee', 'iced-spanish-latte', 100, 'ايس سبانيش لاتيه', 'Iced Spanish Latte'],
  ['iced-coffee', 'frappe', 90, 'فرابيه', 'Frappe', { variants: true }],
  ['iced-coffee', 'frappuccino', 100, 'فرابتشينو', 'Frappuccino', { variants: true }],

  ['coffee', 'turkish-coffee', 25, 'قهوة تركي', 'Turkish Coffee'],
  ['coffee', 'single-espresso', 30, 'اسبريسو سنجل', 'Single Espresso'],
  ['coffee', 'double-espresso', 45, 'اسبريسو دبل', 'Double Espresso'],
  ['coffee', 'french-coffee', 55, 'قهوة فرنساوي', 'French Coffee'],
  ['coffee', 'americano', 55, 'امريكانو', 'Americano'],
  ['coffee', 'macchiato', 60, 'ميكاتو', 'Macchiato'],
  ['coffee', 'cortado', 70, 'كورتادو', 'Cortado'],
  ['coffee', 'flat-white', 70, 'فلات وايت', 'Flat White'],
  ['coffee', 'cappuccino', 80, 'كابتشينو', 'Cappuccino'],
  ['coffee', 'latte', 80, 'لاتيه', 'Latte'],
  ['coffee', 'dark-mocha', 85, 'موكا داكنة', 'Dark Mocha'],
  ['coffee', 'white-mocha', 85, 'موكا بيضاء', 'White Mocha'],

  ['fresh-juice', 'strawberry-juice', 75, 'عصير فراولة', 'Strawberry Juice'],
  ['fresh-juice', 'lemon-mint-juice', 50, 'عصير ليمون نعناع', 'Lemon Mint Juice'],
  ['fresh-juice', 'mango-juice', 75, 'عصير مانجو', 'Mango Juice'],
  ['fresh-juice', 'kiwi-juice', 85, 'عصير كيوي', 'Kiwi Juice', { image: 'kiwi-smoothie' }],
  ['fresh-juice', 'avocado-juice', 120, 'عصير افوكادو', 'Avocado Juice'],

  ['smoothie', 'mango-smoothie', 80, 'سموذي مانجو', 'Mango Smoothie'],
  ['smoothie', 'strawberry-smoothie', 80, 'سموذي فراولة', 'Strawberry Smoothie'],
  ['smoothie', 'kiwi-smoothie', 80, 'سموذي كيوي', 'Kiwi Smoothie'],
  ['smoothie', 'blueberry-smoothie', 80, 'سموذي بلو بيري', 'Blueberry Smoothie'],
  ['smoothie', 'passion-smoothie', 80, 'سموذي باشن فروت', 'Passion Fruit Smoothie'],

  ['milk-shake', 'freddo-milkshake', 90, 'ميلك شيك فريدو', 'Freddo Milk Shake', { image: 'vanilla-milkshake' }],
  ['milk-shake', 'vanilla-milkshake', 90, 'ميلك شيك فانيليا', 'Vanilla Milk Shake'],
  ['milk-shake', 'caramel-milkshake', 100, 'ميلك شيك كراميل', 'Caramel Milk Shake'],
  ['milk-shake', 'mango-milkshake', 100, 'ميلك شيك مانجو', 'Mango Milk Shake'],
  ['milk-shake', 'blueberry-milkshake', 100, 'ميلك شيك بلو بيري', 'Blueberry Milk Shake', { image: 'blueberry-smoothie' }],
  ['milk-shake', 'oreo-milkshake', 100, 'ميلك شيك أوريو', 'Oreo Milk Shake'],
  ['milk-shake', 'lotus-milkshake', 100, 'ميلك شيك لوتس', 'Lotus Milk Shake'],
  ['milk-shake', 'nutella-milkshake', 100, 'ميلك شيك نوتيلا', 'Nutella Milk Shake'],

  ['mojito', 'lemon-mint-mojito', 50, 'موهيتو ليمون نعناع', 'Lemon Mint Mojito'],
  ['mojito', 'strawberry-mojito', 60, 'موهيتو فراولة', 'Strawberry Mojito'],
  ['mojito', 'mango-mojito', 60, 'موهيتو مانجو', 'Mango Mojito'],
  ['mojito', 'blueberry-mojito', 60, 'موهيتو بلو بيري', 'Blueberry Mojito'],
  ['mojito', 'kiwi-mojito', 75, 'موهيتو كيوي', 'Kiwi Mojito'],
  ['mojito', 'passion-mojito', 75, 'موهيتو باشن فروت', 'Passion Fruit Mojito', { image: 'mango-mojito' }],

  ['soft-drinks', 'water', 10, 'مياه (صغيرة)', 'Water (Small)'],
  ['soft-drinks', 'pepsi', 25, 'بيبسي', 'Pepsi', { image: false }],
  ['soft-drinks', 'seven-up', 25, 'سفن أب', 'Seven Up', { image: false }],
  ['soft-drinks', 'coca-cola', 25, 'كوكاكولا', 'Coca Cola', { image: false }],
  ['soft-drinks', 'twist', 30, 'تويست', 'Twist', { image: false }],
  ['soft-drinks', 'red-bull', 70, 'ريد بول', 'Red Bull', { image: false }],

  ['hot-drinks', 'tea', 15, 'شاي', 'Tea'],
  ['hot-drinks', 'anise', 15, 'يانسون', 'Anise (Yansoon)'],
  ['hot-drinks', 'helba', 15, 'حلبة', 'Fenugreek (Helba)'],
  ['hot-drinks', 'cinnamon', 15, 'قرفة', 'Cinnamon'],
  ['hot-drinks', 'green-tea', 15, 'شاي أخضر', 'Green Tea'],
  ['hot-drinks', 'ginger-lemon', 15, 'ليمون زنجبيل', 'Ginger Lemon'],
  ['hot-drinks', 'lemon-mint-tea', 15, 'ليمون نعناع', 'Lemon Mint'],
  ['hot-drinks', 'karkade', 15, 'كركديه', 'Karkade (Hibiscus)'],

  // The printed menu lists these without prices: created switched off at 0
  // so nobody can order them until the owner sets a price in the admin.
  ['additions', 'add-nuts', 0, 'مكسرات', 'Nuts', { image: false, off: true }],
  ['additions', 'add-maamoul', 0, 'معمول', 'Maamoul', { image: false, off: true }],
  ['additions', 'add-dates-nuts', 0, 'بلح بالنوز', 'Dates with Nuts', { image: false, off: true }],
  ['additions', 'add-sauces', 0, 'صوصات', 'Sauces', { image: false, off: true }],
  ['additions', 'add-marshmallow', 0, 'مارشميلو', 'Marshmallow', { image: false, off: true }],
];

export const realItems = rows.map(([c, slug, price, ar, en, o = {}], i) => ({
  slug,
  name: { ar, en },
  description: { ar: generic[c][0], en: generic[c][1] },
  category: C[c],
  basePrice: price,
  variants: o.variants ? flavors.map((f) => ({ ...f, price })) : [],
  addOns: [],
  isAvailable: !o.off,
  // Loyalty: free drink is for coffee and made drinks. Soft drinks, bottled
  // water and additions are not eligible by default (admin can toggle).
  isDrink: !['soft-drinks', 'additions'].includes(c),
  sortOrder: 100 + i,
  imageUrl: o.image === false ? '/menu/drink-placeholder.svg' : `/menu/${o.image || slug}.jpg`,
}));
