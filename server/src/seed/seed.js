import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import MenuItem from '../features/menu/menuItem.model.js';
import User from '../features/auth/user.model.js';
import Table from '../features/reservations/table.model.js';
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
    await MenuItem.updateOne({ slug: item.slug }, { $set: item }, { upsert: true });
    upserted += 1;
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
