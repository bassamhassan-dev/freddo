import { useCallback, useEffect, useState } from 'react';
import { apiAdminOrders, apiSetOrderStatus, apiAdminMenu, apiSetAvailability, apiSetDrinkFlag } from '@/api/admin.js';
import AdminAccounts from '@/components/AdminAccounts.jsx';
import AdminReviews from '@/components/AdminReviews.jsx';
import AdminCoupons from '@/components/AdminCoupons.jsx';
import AdminReservations from '@/components/AdminReservations.jsx';
import AdminContact from '@/components/AdminContact.jsx';
import { formatPrice } from '@/components/MenuItemCard.jsx';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import AdminBanners from '@/components/AdminBanners.jsx';
import AdminMenuImage from '@/components/AdminMenuImage.jsx';
import AdminRecipeEditor from '@/components/AdminRecipeEditor.jsx';
import AdminAnalytics from '@/components/AdminAnalytics.jsx';
import AdminContent from '@/components/AdminContent.jsx';
import AdminChat from '@/components/AdminChat.jsx';

// What each status can move to. Display-only: the server validates every
// transition again through the one shared machine (order.service).
const NEXT = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
const STATUS_FILTERS = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

export default function AdminPage({ lang }) {
  const [tab, setTab] = useState('orders'); // orders | menu
  const [statusFilter, setStatusFilter] = useState('pending');
  const [orders, setOrders] = useState(null);
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState(null);

  const loadOrders = useCallback(() => {
    setOrders(null);
    apiAdminOrders(statusFilter)
      .then((data) => setOrders(data.orders))
      .catch(() => setError(true));
  }, [statusFilter]);

  const loadMenu = useCallback(() => {
    apiAdminMenu()
      .then((data) => setMenu(data.items))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
    else if (tab === 'menu') loadMenu();
  }, [tab, loadOrders, loadMenu]);

  const move = async (id, to) => {
    await apiSetOrderStatus(id, to);
    loadOrders();
  };

  const toggleDrink = async (id, isDrink) => {
    await apiSetDrinkFlag(id, isDrink);
    await loadMenu();
  };
  const toggle = async (id, isAvailable) => {
    await apiSetAvailability(id, isAvailable);
    loadMenu();
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-5 pb-16">
      <h2 className="mb-6 text-center text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
        {t(lang, 'adminWorkspace')}
      </h2>

      <div className="mb-6 flex justify-center gap-2">
        <Button size="sm" variant={tab === 'orders' ? 'default' : 'ghost'} onClick={() => setTab('orders')}>
          {t(lang, 'adminOrdersTab')}
        </Button>
        <Button size="sm" variant={tab === 'menu' ? 'default' : 'ghost'} onClick={() => setTab('menu')}>
          {t(lang, 'adminMenuTab')}
        </Button>
        <Button size="sm" variant={tab === 'accounts' ? 'default' : 'ghost'} onClick={() => setTab('accounts')}>
          {t(lang, 'adminAccountsTab')}
        </Button>
        <Button size="sm" variant={tab === 'reviews' ? 'default' : 'ghost'} onClick={() => setTab('reviews')}>
          {t(lang, 'adminReviewsTab')}
        </Button>
        <Button size="sm" variant={tab === 'coupons' ? 'default' : 'ghost'} onClick={() => setTab('coupons')}>
          {t(lang, 'adminCouponsTab')}
        </Button>
        <Button size="sm" variant={tab === 'reservations' ? 'default' : 'ghost'} onClick={() => setTab('reservations')}>
          {t(lang, 'adminReservationsTab')}
        </Button>
        <Button size="sm" variant={tab === 'messages' ? 'default' : 'ghost'} onClick={() => setTab('messages')}>
          {t(lang, 'adminMessagesTab')}
        </Button>
        <Button size="sm" variant={tab === 'banners' ? 'default' : 'ghost'} onClick={() => setTab('banners')}>
          {t(lang, 'adminBannersTab')}
        </Button>
        <Button size="sm" variant={tab === 'analytics' ? 'default' : 'ghost'} onClick={() => setTab('analytics')}>
          {t(lang, 'adminAnalyticsTab')}
        </Button>
        <Button size="sm" variant={tab === 'chat' ? 'default' : 'ghost'} onClick={() => setTab('chat')}>
          {t(lang, 'admin.tabs.chat')}
        </Button>
        <Button size="sm" variant={tab === 'content' ? 'default' : 'ghost'} onClick={() => setTab('content')}>
          {t(lang, 'adminContentTab')}
        </Button>
      </div>

      {tab === 'accounts' && <AdminAccounts lang={lang} />}
      {tab === 'reviews' && <AdminReviews lang={lang} />}
      {tab === 'coupons' && <AdminCoupons lang={lang} />}
      {tab === 'reservations' && <AdminReservations lang={lang} />}
      {tab === 'messages' && <AdminContact lang={lang} />}
      {tab === 'chat' && <AdminChat lang={lang} />}
      {tab === 'banners' && <AdminBanners lang={lang} />}
      {tab === 'analytics' && <AdminAnalytics lang={lang} />}
      {tab === 'content' && <AdminContent lang={lang} />}
      {tab !== 'accounts' && tab !== 'reviews' && tab !== 'coupons' && tab !== 'reservations' && tab !== 'messages' && error && <p className="text-center text-secondary">{t(lang, 'orderError')}</p>}

      {tab === 'orders' && (
        <>
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {STATUS_FILTERS.map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'ghost'} onClick={() => setStatusFilter(s)}>
                {t(lang, `status_${s}`)}
              </Button>
            ))}
          </div>
          {!orders && <Skeleton className="h-48 w-full rounded-2xl" />}
          {orders && orders.length === 0 && <p className="text-center text-secondary">{t(lang, 'adminNoOrders')}</p>}
          <div className="flex flex-col gap-3">
            {(orders || []).map((order) => (
              <div key={order._id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-foreground" dir="ltr">{order.orderNumber}</span>
                    <span className="ms-2 text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-EG')}
                    </span>
                  </div>
                  <Badge>{t(lang, `status_${order.status}`)}</Badge>
                </div>
                <p className="mt-1 text-sm text-secondary">
                  {order.customer.name} · <span dir="ltr">{order.customer.phone}</span>
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {order.items.map((item) => `${item.name[lang]}${item.variantLabel ? ` (${item.variantLabel[lang]})` : ''} ×${item.qty}`).join('، ')}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-accent">{formatPrice(lang, order.total)}</span>
                  <div className="flex gap-2">
                    {NEXT[order.status].map((to) => (
                      <Button key={to} size="sm" variant={to === 'cancelled' ? 'ghost' : 'default'} onClick={() => move(order._id, to)}>
                        {t(lang, `move_${to}`)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'menu' && (
        <>
          {!menu && <Skeleton className="h-48 w-full rounded-2xl" />}
          <div className="flex flex-col gap-2">
            {(menu || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
                <div>
                  <span className="font-bold text-foreground">{item.name[lang]}</span>
                  <span className="ms-2 text-xs text-muted-foreground">{item.category.name[lang]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AdminMenuImage lang={lang} item={item} onSaved={loadMenu} />
                  <AdminRecipeEditor lang={lang} item={item} onSaved={loadMenu} />
                  <Button size="sm" variant={item.isDrink ? 'default' : 'ghost'} onClick={() => toggleDrink(item._id, !item.isDrink)} title={t(lang, 'admin.menu.drink')}>
                    {t(lang, 'admin.menu.drink')}
                  </Button>
                  <Button size="sm" variant={item.isAvailable ? 'default' : 'ghost'} onClick={() => toggle(item._id, !item.isAvailable)}>
                    {item.isAvailable ? t(lang, 'available') : t(lang, 'unavailable')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
