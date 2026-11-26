import Order from '../orders/order.model.js';
import Reservation from '../reservations/reservation.model.js';
import User from '../auth/user.model.js';
import CouponUsage from '../coupons/couponUsage.model.js';
import LoyaltyTransaction from '../loyalty/loyaltyTransaction.model.js';

// Admin analytics (doc 15). Everything is aggregated from the real
// collections - no counters, no AnalyticsEvent model (doc 15.3/15.4 say it
// is not required for the operational dashboard). Definitions:
// - Revenue = total of COMPLETED orders in the range (COD: completed=paid).
// - New customer = account created inside the range. "Returning" stays
//   undefined - the doc leaves that definition open.
// - Date range is inclusive [from, to]; default is the last 30 days.
//   Business-day/timezone handling matches the rest of the project
//   (Africa/Cairo wall-clock; see CONVENTIONS.md).
export async function getDashboard({ from, to } = {}) {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 86400000);
  const range = { createdAt: { $gte: fromDate, $lte: toDate } };

  const [orderAgg] = await Order.aggregate([
    { $match: range },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$total', 0] } },
        completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        discounts: { $sum: '$discount' },
      },
    },
  ]);

  const byStatus = await Order.aggregate([
    { $match: range },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Top and least sellers by quantity sold in completed orders.
  const topProducts = await Order.aggregate([
    { $match: { ...range, status: 'completed' } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name.en',
        nameAr: { $first: '$items.name.ar' },
        qty: { $sum: '$items.qty' },
        revenue: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { qty: -1 } },
  ]);

  const reservationsByStatus = await Reservation.aggregate([
    { $match: range },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const [couponAgg] = await CouponUsage.aggregate([
    { $match: range },
    { $group: { _id: null, uses: { $sum: 1 }, discountTotal: { $sum: '$discountAmount' } } },
  ]);

  const [loyaltyAgg] = await LoyaltyTransaction.aggregate([
    { $match: { ...range, type: 'earn' } },
    { $group: { _id: null, earned: { $sum: '$points' }, customers: { $addToSet: '$user' } } },
  ]);

  // Daily series for the dashboard charts (doc 22): orders and completed
  // revenue grouped by Cairo wall-clock day, zero-filled client-side.
  const daily = await Order.aggregate([
    { $match: range },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Africa/Cairo' } },
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$total', 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const newCustomers = await User.countDocuments({ ...range, role: 'customer' });
  const totalCustomers = await User.countDocuments({ role: 'customer' });

  const statusMap = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  const resMap = Object.fromEntries(reservationsByStatus.map((s) => [s._id, s.count]));

  return {
    from: fromDate,
    to: toDate,
    revenue: orderAgg?.revenue || 0,
    averageOrderValue: orderAgg?.completedOrders ? Math.round(orderAgg.revenue / orderAgg.completedOrders) : 0,
    orders: orderAgg?.orders || 0,
    daily: daily.map((d) => ({ date: d._id, orders: d.orders, revenue: d.revenue })),
    ordersByStatus: statusMap,
    cancelledOrders: orderAgg?.cancelled || 0,
    topProducts: topProducts.slice(0, 5),
    leastProducts: topProducts.slice(-5).reverse(),
    reservationsByStatus: resMap,
    coupons: { uses: couponAgg?.uses || 0, discountTotal: couponAgg?.discountTotal || 0 },
    loyalty: {
      earned: loyaltyAgg?.earned || 0,
      activeCustomers: loyaltyAgg?.customers?.length || 0,
    },
    newCustomers,
    totalCustomers,
  };
}
