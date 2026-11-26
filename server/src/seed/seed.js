import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import MenuItem from '../features/menu/menuItem.model.js';

import Table from '../features/reservations/table.model.js';
import Banner from '../features/banners/banner.model.js';
import Coupon from '../features/coupons/coupon.model.js';
import Order from '../features/orders/order.model.js';
import User from '../features/auth/user.model.js';

import { ROLES } from '../utils/roles.js';

// Sample menu data for local development. Run with: npm run seed -w server
// Items are upserted by slug, so re-running the seed is safe and never
// creates duplicates.

const hotCoffee = { slug: 'hot-coffee', name: { ar: 'قهوة ساخنة', en: 'Hot Coffee' } };
const icedCoffee = { slug: 'iced-coffee', name: { ar: 'قهوة مثلجة', en: 'Iced Coffee' } };
const specialty = { slug: 'specialty-drinks', name: { ar: 'مشروبات خاصة', en: 'Specialty Drinks' } };
const tea = { slug: 'tea', name: { ar: 'شاي', en: 'Tea' } };
const desserts = { slug: 'desserts', name: { ar: 'حلويات', en: 'Desserts' } };
const snacks = { slug: 'snacks', name: { ar: 'سناكس', en: 'Snacks' } };

const sizes = [
  { label: { ar: 'صغير', en: 'Small' }, price: 0 },
  { label: { ar: 'وسط', en: 'Medium' }, price: 10 },
  { label: { ar: 'كبير', en: 'Large' }, price: 20 },
];

const coffeeAddOns = [
  { name: { ar: 'شوت إضافي', en: 'Extra shot' }, price: 15 },
  { name: { ar: 'سيرب فانيليا', en: 'Vanilla syrup' }, price: 10 },
  { name: { ar: 'حليب شوفان', en: 'Oat milk' }, price: 12 },
];

const items = [
  {
    slug: 'espresso',
    name: { ar: 'إسبريسو', en: 'Espresso' },
    description: {
      ar: 'شوت مركّز من بن فريدو المحمص، طعمه قوي وريحته بتصحّي.',
      en: 'A concentrated shot of Freddo roast, bold and aromatic.',
    },
    category: hotCoffee,
    basePrice: 45,
    variants: [
      { label: { ar: 'سنجل', en: 'Single' }, price: 45 },
      { label: { ar: 'دبل', en: 'Double' }, price: 60 },
    ],
    addOns: coffeeAddOns,
    isAvailable: true,
    sortOrder: 1,
    rating: { average: 4.7, count: 132 },
    recipe: {
      ingredients: [
        { name: { ar: 'بن فريدو المحمص', en: 'Freddo roast beans' }, quantity: 18, unit: 'g' },
      ],
      steps: [
        { ar: 'اطحن البن طحن ناعم ووزن ١٨ جرام.', en: 'Grind fine and dose 18 g.' },
        { ar: 'اضغط البن بشكل مستوي وثبّت البورتافلتر.', en: 'Tamp evenly and lock the portafilter.' },
        { ar: 'استخلص ٢٥-٣٠ ثانية. السنجل شوت واحد والدبل شوتين.', en: 'Extract 25-30 s. Single is one shot, double is two.' },
      ],
      notes: { ar: 'الدبل بياخد شوتين - زوّد البن لـ ٣٦ جرام.', en: 'Double takes two shots - up the dose to 36 g.' },
    },
  },
  {
    slug: 'spanish-latte',
    name: { ar: 'سبانيش لاتيه', en: 'Spanish Latte' },
    description: {
      ar: 'إسبريسو مع لبن مكثف محلى، أشهر مشروب في فريدو.',
      en: 'Espresso with sweet condensed milk, our signature best seller.',
    },
    category: hotCoffee,
    basePrice: 75,
    variants: sizes.map((v) => ({ ...v, price: 75 + v.price })),
    addOns: coffeeAddOns,
    isFeatured: true,
    isBestSeller: true,
    isAvailable: true,
    sortOrder: 2,
    rating: { average: 4.9, count: 318 },
    recipe: {
      ingredients: [
        { name: { ar: 'إسبريسو', en: 'Espresso' }, quantity: 2, unit: 'shot' },
        { name: { ar: 'حليب', en: 'Milk' }, quantity: 100, unit: 'ml' },
        { name: { ar: 'حليب مكثف محلى', en: 'Sweetened condensed milk' }, quantity: 30, unit: 'ml' },
      ],
      steps: [
        { ar: 'حط الحليب المكثف في الكوب الأول.', en: 'Add the condensed milk to the cup first.' },
        { ar: 'اسحب شوتين إسبريسو فوقه.', en: 'Pull two espresso shots over it.' },
        { ar: 'بخّر الحليب واسكبه ببطء.', en: 'Steam the milk and pour slowly.' },
      ],
      notes: { ar: 'المقاس الوسط هو المعيار. الكبير: شوت إضافي و٥٠ مل حليب زيادة.', en: 'Medium is the standard. Large: one extra shot and 50 ml more milk.' },
    },
  },
  {
    slug: 'cappuccino',
    name: { ar: 'كابتشينو', en: 'Cappuccino' },
    description: {
      ar: 'إسبريسو ولبن مبخر بطبقة فوم سميكة.',
      en: 'Espresso, steamed milk and a thick foam cap.',
    },
    category: hotCoffee,
    basePrice: 65,
    variants: sizes.map((v) => ({ ...v, price: 65 + v.price })),
    addOns: coffeeAddOns,
    isAvailable: true,
    sortOrder: 3,
    rating: { average: 4.5, count: 96 },
  },
  {
    slug: 'freddo-iced-latte',
    name: { ar: 'فريدو آيس لاتيه', en: 'Freddo Iced Latte' },
    description: {
      ar: 'إسبريسو على تلج مع لبن بارد، على اسم المحل وعلى ذوقنا.',
      en: 'Espresso over ice with cold milk, named after the house.',
    },
    category: icedCoffee,
    basePrice: 80,
    variants: sizes.map((v) => ({ ...v, price: 80 + v.price })),
    addOns: coffeeAddOns,
    isFeatured: true,
    isAvailable: true,
    sortOrder: 1,
    rating: { average: 4.8, count: 204 },
  },
  {
    slug: 'iced-spanish-latte',
    name: { ar: 'سبانيش لاتيه آيس', en: 'Iced Spanish Latte' },
    description: {
      ar: 'السبانيش لاتيه المفضل عندك، بارد للسهرات الصيفية.',
      en: 'Your favourite Spanish Latte, iced for summer nights.',
    },
    category: icedCoffee,
    basePrice: 85,
    variants: sizes.map((v) => ({ ...v, price: 85 + v.price })),
    addOns: coffeeAddOns,
    isBestSeller: true,
    isAvailable: true,
    sortOrder: 2,
    rating: { average: 4.8, count: 176 },
  },
  {
    slug: 'sahlab',
    name: { ar: 'سحلب', en: 'Sahlab' },
    description: {
      ar: 'سحلب سخن بالمكسرات والقرفة، دفا الشتا في كوباية.',
      en: 'Warm sahlab with nuts and cinnamon, winter in a cup.',
    },
    category: specialty,
    basePrice: 55,
    isAvailable: true,
    sortOrder: 1,
    rating: { average: 4.6, count: 88 },
  },
  {
    slug: 'matcha-latte',
    name: { ar: 'ماتشا لاتيه', en: 'Matcha Latte' },
    description: {
      ar: 'ماتشا يابانية مضروبة باللبن، ساخنة أو مثلجة.',
      en: 'Japanese matcha whisked with milk, hot or iced.',
    },
    category: specialty,
    basePrice: 95,
    variants: sizes.map((v) => ({ ...v, price: 95 + v.price })),
    addOns: [{ name: { ar: 'حليب شوفان', en: 'Oat milk' }, price: 12 }],
    isAvailable: true,
    sortOrder: 2,
    rating: { average: 4.4, count: 52 },
  },
  {
    slug: 'karkade',
    name: { ar: 'كركديه مثلج', en: 'Iced Karkade' },
    description: {
      ar: 'كركديه بارد منعش، من غير سكر لو تحب.',
      en: 'Refreshing iced hibiscus, sugar-free if you like.',
    },
    category: tea,
    basePrice: 35,
    isAvailable: true,
    sortOrder: 1,
    rating: { average: 4.3, count: 41 },
  },
  {
    slug: 'basbousa',
    name: { ar: 'بسبوسة', en: 'Basbousa' },
    description: {
      ar: 'بسبوسة بالقشطة، بتتعمل طازة كل يوم.',
      en: 'Basbousa with clotted cream, made fresh daily.',
    },
    category: desserts,
    basePrice: 50,
    isBestSeller: true,
    isAvailable: true,
    sortOrder: 1,
    rating: { average: 4.7, count: 143 },
  },
  {
    slug: 'halloumi-croissant',
    name: { ar: 'كرواسون حلومي', en: 'Halloumi Croissant' },
    description: {
      ar: 'كرواسون محشي جبنة حلومي مشوية وعسل.',
      en: 'Croissant stuffed with grilled halloumi and honey.',
    },
    category: snacks,
    basePrice: 70,
    isAvailable: true,
    sortOrder: 1,
    rating: { average: 4.5, count: 67 },
  },
  {
    // One unavailable item on purpose: proves the API hides what the admin
    // switched off, without touching any customer data.
    slug: 'turkish-coffee',
    name: { ar: 'قهوة تركي', en: 'Turkish Coffee' },
    description: {
      ar: 'قهوة تركي على الفحم، راجعة قريب.',
      en: 'Charcoal-brewed Turkish coffee, coming back soon.',
    },
    category: hotCoffee,
    basePrice: 40,
    isAvailable: false,
    sortOrder: 9,
    rating: { average: 4.2, count: 58 },
  },
  {
    slug: 'cafe-latte',
    name: { ar: 'كافيه لاتيه', en: 'Café Latte' },
    description: {
      ar: 'إسبريسو ولبن مبخر بفوم خفيف، ناعم ومتزن.',
      en: 'Espresso with steamed milk and light foam, smooth and balanced.',
    },
    category: hotCoffee,
    basePrice: 65,
    variants: sizes.map((v) => ({ ...v, price: 65 + v.price })),
    addOns: coffeeAddOns,
    isAvailable: true,
    sortOrder: 3,
    rating: { average: 4.6, count: 210 },
  },
  {
    slug: 'flat-white',
    name: { ar: 'فلات وايت', en: 'Flat White' },
    description: {
      ar: 'دبل إسبريسو مع لبن مايكروفوم، أقوى من اللاتيه وأخف من الكابتشينو.',
      en: 'Double espresso with micro-foamed milk, stronger than a latte.',
    },
    category: hotCoffee,
    basePrice: 70,
    addOns: coffeeAddOns,
    isAvailable: true,
    sortOrder: 4,
    rating: { average: 4.7, count: 96 },
  },
  {
    slug: 'mocha',
    name: { ar: 'موكا', en: 'Mocha' },
    description: {
      ar: 'إسبريسو وشوكولاتة بلجيكية ولبن مبخر، للي بيحب الحاجة الحلوة.',
      en: 'Espresso, Belgian chocolate and steamed milk for sweet tooths.',
    },
    category: hotCoffee,
    basePrice: 80,
    variants: sizes.map((v) => ({ ...v, price: 80 + v.price })),
    addOns: coffeeAddOns,
    isBestSeller: true,
    isAvailable: true,
    sortOrder: 5,
    rating: { average: 4.8, count: 154 },
  },
  {
    slug: 'cortado',
    name: { ar: 'كورتادو', en: 'Cortado' },
    description: {
      ar: 'إسبريسو ولبن دافي بنسبة واحد لواحد في كوب صغير.',
      en: 'Equal parts espresso and warm milk in a small glass.',
    },
    category: hotCoffee,
    basePrice: 55,
    isAvailable: true,
    sortOrder: 6,
    rating: { average: 4.4, count: 41 },
  },
  {
    slug: 'iced-americano',
    name: { ar: 'آيسد أمريكانو', en: 'Iced Americano' },
    description: {
      ar: 'دبل إسبريسو على تلج ومية ساقعة، منعش وصافي.',
      en: 'Double espresso over ice and cold water, crisp and clean.',
    },
    category: icedCoffee,
    basePrice: 55,
    variants: sizes.map((v) => ({ ...v, price: 55 + v.price })),
    isAvailable: true,
    sortOrder: 3,
    rating: { average: 4.3, count: 88 },
  },
  {
    slug: 'iced-mocha',
    name: { ar: 'آيسد موكا', en: 'Iced Mocha' },
    description: {
      ar: 'موكا ساقعة مع كريمة مخفوقة ورشة كاكاو.',
      en: 'Chilled mocha topped with whipped cream and cocoa dust.',
    },
    category: icedCoffee,
    basePrice: 85,
    addOns: coffeeAddOns,
    isAvailable: true,
    sortOrder: 4,
    rating: { average: 4.6, count: 73 },
  },
  {
    slug: 'caramel-frappe',
    name: { ar: 'كراميل فرابيه', en: 'Caramel Frappe' },
    description: {
      ar: 'قهوة مثلجة مخفوقة بالكراميل والتلج، سميكة وحلوة.',
      en: 'Blended iced coffee with caramel, thick and sweet.',
    },
    category: icedCoffee,
    basePrice: 90,
    isFeatured: true,
    isAvailable: true,
    sortOrder: 5,
    rating: { average: 4.7, count: 129 },
  },
  {
    slug: 'hot-chocolate',
    name: { ar: 'هوت شوكليت', en: 'Hot Chocolate' },
    description: {
      ar: 'شوكولاتة سايحة باللبن، تقيلة ودافية.',
      en: 'Melted chocolate with milk, rich and warming.',
    },
    category: specialty,
    basePrice: 65,
    isAvailable: true,
    sortOrder: 4,
    rating: { average: 4.5, count: 92 },
  },
  {
    slug: 'mint-lemonade',
    name: { ar: 'ليمون بالنعناع', en: 'Mint Lemonade' },
    description: {
      ar: 'ليمون طازة مع نعناع وسكر خفيف، تلج مجروش.',
      en: 'Fresh lemon with mint over crushed ice.',
    },
    category: specialty,
    basePrice: 45,
    isBestSeller: true,
    isAvailable: true,
    sortOrder: 5,
    rating: { average: 4.6, count: 187 },
  },
  {
    slug: 'green-tea',
    name: { ar: 'شاي أخضر', en: 'Green Tea' },
    description: {
      ar: 'شاي أخضر على البخار، خفيف ومهدي.',
      en: 'Steamed green tea, light and calming.',
    },
    category: tea,
    basePrice: 35,
    isAvailable: true,
    sortOrder: 1,
    rating: { average: 4.2, count: 54 },
  },
  {
    slug: 'chai-latte',
    name: { ar: 'شاي لاتيه', en: 'Chai Latte' },
    description: {
      ar: 'شاي أسود بالبهارات واللبن المبخر وعسل.',
      en: 'Spiced black tea with steamed milk and honey.',
    },
    category: tea,
    basePrice: 55,
    isAvailable: true,
    sortOrder: 2,
    rating: { average: 4.4, count: 63 },
  },
  {
    slug: 'cheesecake-lotus',
    name: { ar: 'تشيز كيك لوتس', en: 'Lotus Cheesecake' },
    description: {
      ar: 'تشيز كيك بارد بطبقة بسكويت لوتس وكريمة الكراميل.',
      en: 'Chilled cheesecake with a Lotus biscuit layer and caramel cream.',
    },
    category: desserts,
    basePrice: 95,
    isFeatured: true,
    isAvailable: true,
    sortOrder: 2,
    rating: { average: 4.9, count: 176 },
  },
  {
    slug: 'fudge-cake',
    name: { ar: 'فدج كيك', en: 'Fudge Cake' },
    description: {
      ar: 'كيك شوكولاتة ساخن بقلب سايح، بيتقدم مع سكر بودرة.',
      en: 'Warm chocolate cake with a molten center.',
    },
    category: desserts,
    basePrice: 85,
    isAvailable: true,
    sortOrder: 3,
    rating: { average: 4.7, count: 118 },
  },
  {
    slug: 'kunafa-nutella',
    name: { ar: 'كنافة نوتيلا', en: 'Kunafa Nutella' },
    description: {
      ar: 'كنافة محشوة نوتيلا ومكسرات، بتتعمل طازة.',
      en: 'Kunafa stuffed with Nutella and nuts, made fresh.',
    },
    category: desserts,
    basePrice: 90,
    isBestSeller: true,
    isAvailable: true,
    sortOrder: 4,
    rating: { average: 4.8, count: 203 },
  },
  {
    slug: 'turkey-toast',
    name: { ar: 'توست تركي وجبنة', en: 'Turkey & Cheese Toast' },
    description: {
      ar: 'توست محمص بشرائح التركي والجبنة الشيدر.',
      en: 'Toasted sandwich with turkey slices and cheddar.',
    },
    category: snacks,
    basePrice: 65,
    isAvailable: true,
    sortOrder: 2,
    rating: { average: 4.3, count: 45 },
  },
  {
    slug: 'feteer-honey',
    name: { ar: 'فطير مشلتت بالعسل', en: 'Feteer with Honey' },
    description: {
      ar: 'فطير مشلتت طازة بيتقدم مع عسل نحل وقشطة.',
      en: 'Fresh layered pastry served with honey and cream.',
    },
    category: snacks,
    basePrice: 75,
    isAvailable: true,
    sortOrder: 3,
    rating: { average: 4.6, count: 84 },
  },
];

async function seed() {
  await connectDB();
  let upserted = 0;
  // Tables (doc 10.1): upserted by number like the menu items.
  const tables = [
    { number: 'T1', capacity: 2, zone: 'indoor' },
    { number: 'T2', capacity: 2, zone: 'indoor' },
    { number: 'T3', capacity: 4, zone: 'indoor' },
    { number: 'T4', capacity: 4, zone: 'outdoor' },
    { number: 'T5', capacity: 6, zone: 'indoor' },
    { number: 'T6', capacity: 8, zone: 'outdoor' },
  ];
  for (const table of tables) {
    await Table.updateOne({ number: table.number }, { $set: table }, { upsert: true });
  }

  for (const item of items) {
    // Images are seeded separately and only when the item has none, so an
    // image the admin replaced through Cloudinary survives a re-seed.
    const { slug } = item;
    await MenuItem.updateOne({ slug }, { $set: item }, { upsert: true });
    await MenuItem.updateOne(
      { slug, $or: [{ images: { $exists: false } }, { images: { $size: 0 } }] },
      { $set: { images: [{ url: `/menu/${slug}.svg`, alt: item.name }] } }
    );
    upserted += 1;
  }

  // Sample homepage banners so the slider/secondary slots are visible on a
  // fresh setup. Upserted by English title; the admin can edit or delete
  // them like any banner (Sprint 13/16).
  const sampleBanners = [
    { placement: 'main', title: { ar: 'عرض الأسبوع', en: 'Deal of the week' }, description: { ar: 'خصم ٢٥٪ على السبانش لاتيه', en: '25% off Spanish Latte' }, imageUrl: '/banners/offer-main.svg', ctaText: { ar: 'اطلب دلوقتي', en: 'Order now' }, ctaLink: '/item/spanish-latte', sortOrder: 0 },
    { placement: 'main', title: { ar: 'وصل جديد', en: 'Just landed' }, description: { ar: 'تسوية فريدو الخاصة', en: 'The Freddo house roast' }, imageUrl: '/banners/new-roast-main.svg', sortOrder: 1 },
    { placement: 'secondary_left', title: { ar: 'احجز ترابيزتك', en: 'Book your table' }, description: { ar: 'مكانك جاهز على مدار اليوم', en: 'Your spot is ready all day' }, imageUrl: '/banners/book-secondary.svg', ctaLink: '/reservations', sortOrder: 0 },
    { placement: 'secondary_right', title: { ar: 'نقاط الولاء', en: 'Loyalty points' }, description: { ar: 'اكسب نقطة مع كل طلب مكتمل', en: 'Earn a point with every completed order' }, imageUrl: '/banners/loyalty-secondary.svg', ctaLink: '/account', sortOrder: 0 },
  ];
  // A welcome coupon so the checkout discount flow (Sprint 10) is visible
  // on first run. Upserted by code; admin edits survive re-seeds.
  await Coupon.updateOne(
    { code: 'WELCOME10' },
    { $setOnInsert: {
      code: 'WELCOME10',
      description: 'خصم ترحيبي ١٠٪ على أول طلب / 10% welcome discount',
      discountType: 'percentage',
      value: 10,
      minOrderAmount: 100,
      maxDiscountAmount: 50,
      usageLimitPerUser: 1,
    } },
    { upsert: true }
  );

  // Demo customer + ~6 weeks of sample orders across every status, so the
  // analytics dashboard (Sprint 22) has a real revenue series, status mix
  // and top-sellers on first run. Upserted by order number, so re-seeds
  // never duplicate. The pattern is deterministic (no RNG) for stable demos.
  const demoEmail = 'demo.customer@freddo.cafe';
  let demo = await User.findOne({ email: demoEmail });
  if (!demo) {
    const passwordHash = await User.hashPassword('demo12345');
    demo = await User.create({ name: 'ضيف فريدو', email: demoEmail, passwordHash, role: 'customer' });
  }
  const orderableSlugs = items.filter((i) => i.isAvailable).map((i) => i.slug);
  const orderableDocs = await MenuItem.find({ slug: { $in: orderableSlugs } }).select('_id slug name basePrice');
  const statuses = ['completed', 'completed', 'completed', 'completed', 'preparing', 'ready', 'confirmed', 'pending', 'cancelled'];
  let seq = 0;
  for (let day = 45; day >= 0; day -= 1) {
    const perDay = (day % 3) + (day % 7 === 0 ? 1 : 0); // 0..3 orders/day
    for (let k = 0; k < perDay; k += 1) {
      seq += 1;
      const item = orderableDocs[(day + k) % orderableDocs.length];
      const qty = ((day + k) % 2) + 1;
      const lineTotal = item.basePrice * qty;
      const createdAt = new Date(Date.now() - day * 86400000 - k * 3600000);
      await Order.updateOne(
        { orderNumber: `FR-SEED-${String(seq).padStart(4, '0')}` },
        { $setOnInsert: {
          orderNumber: `FR-SEED-${String(seq).padStart(4, '0')}`,
          user: demo._id,
          items: [{ product: item._id, name: item.name, unitPrice: item.basePrice, qty, lineTotal }],
          subtotal: lineTotal,
          total: lineTotal,
          customer: { name: demo.name, phone: '01000000000' },
          status: statuses[(day + k) % statuses.length],
          createdAt,
        } },
        { upsert: true }
      );
    }
  }
  console.log(`Seed: ${seq} sample orders checked / طلبات تجريبية`);

  for (const banner of sampleBanners) {
    await Banner.updateOne(
      { placement: banner.placement, 'title.en': banner.title.en },
      { $setOnInsert: banner },
      { upsert: true }
    );
  }
  const total = await MenuItem.countDocuments();
  console.log(`Seed done: ${upserted} items upserted, ${total} total in menuitems / تم تحميل المنيو`);

  // First admin account (doc 3.7): created from the environment, never
  // from committed values. Set ADMIN_EMAIL + ADMIN_PASSWORD (+ optional
  // ADMIN_NAME) in server/.env and re-run the seed. The password is hashed
  // like any other and only ever lives in your .env.
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
    const passwordHash = await User.hashPassword(process.env.ADMIN_PASSWORD);
    await User.updateOne(
      { email },
      {
        $set: {
          name: process.env.ADMIN_NAME || 'Freddo Admin',
          passwordHash,
          role: ROLES.ADMIN,
          isActive: true,
        },
      },
      { upsert: true }
    );
    console.log(`Admin account ready: ${email} / حساب الأدمن جاهز`);
  } else {
    console.log('No ADMIN_EMAIL/ADMIN_PASSWORD in .env - skipped admin creation / مفيش بيانات أدمن في .env');
  }
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
