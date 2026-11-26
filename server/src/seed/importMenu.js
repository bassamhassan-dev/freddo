import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { planMenuImport, applyMenuImport } from './menuImport.js';

// npm run import-menu -w server            -> dry run, prints what would change
// npm run import-menu -w server -- --apply -> adds the missing items only
// Safe for a live database: see menuImport.js.
async function main() {
  const apply = process.argv.includes('--apply');
  await connectDB();
  const plan = await planMenuImport();
  console.log(`New categories (${plan.newCategories.length}): ${plan.newCategories.map((c) => c.slug).join(', ') || '-'}`);
  console.log(`New items (${plan.newItems.length}): ${plan.newItems.map((i) => i.slug).join(', ') || '-'}`);
  console.log(`Already in the database, left untouched: ${plan.skipped.length}`);
  for (const d of plan.differs) console.log(`  differs from the printed menu: ${d.slug}  db=[${d.db}]  menu=[${d.menu}]`);
  if (!apply) {
    console.log('\nDry run only, nothing was written. Add --apply to import / ده تجربة بس، مفيش حاجة اتكتبت.');
  } else {
    const done = await applyMenuImport(plan);
    console.log(`\nDone: ${done.categories} categories and ${done.items} items added / تمت الإضافة.`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
