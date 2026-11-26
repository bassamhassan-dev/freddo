import User from '../features/auth/user.model.js';
import Order from '../features/orders/order.model.js';

// The demo seed writes demo users, sample orders and switches menu items
// off. It is for a disposable development database only, so it refuses to
// run in production, or when the database already holds real customers or
// orders, unless --force is passed on purpose.
export async function assertSafeToSeed({ env = process.env, argv = process.argv } = {}) {
  if (argv.includes('--force')) return;
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV=production. Use "npm run import-menu -w server" to add the menu safely. / مينفعش seed على production.');
  }
  const ours = ['demo.customer@freddo.cafe'];
  if (env.ADMIN_EMAIL) ours.push(env.ADMIN_EMAIL.toLowerCase().trim());
  const users = await User.countDocuments({ email: { $nin: ours } });
  const orders = await Order.countDocuments({ orderNumber: { $not: /^FR-SEED-/ } });
  if (users > 0 || orders > 0) {
    throw new Error(
      `Refusing to seed: this database has ${users} non-seed user(s) and ${orders} real order(s). ` +
        'It looks like live data. Use "npm run import-menu -w server" to add the menu safely, or pass --force if this is a throwaway database. / الداتابيز فيها بيانات حقيقية.'
    );
  }
}
