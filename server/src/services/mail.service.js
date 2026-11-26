import nodemailer from 'nodemailer';

// One tiny mail layer for the whole app (Sprint 33). Two modes:
//  - SMTP configured (SMTP_HOST set): real delivery through nodemailer.
//  - Not configured: dev fallback. The email is logged to the server
//    console and appended to `outbox` so tests and local dev can see
//    exactly what would have been sent. Nothing is lost silently.
// Every send goes through sendMailSafe, which swallows transport errors:
// a broken mail server must never fail a registration or an order.

export const outbox = [];

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

const fromAddress = () => process.env.MAIL_FROM || 'Freddo Cafe <no-reply@freddo.local>';

export function mailConfigured() {
  return Boolean(transporter);
}

async function sendMail({ to, subject, text }) {
  const message = { from: fromAddress(), to, subject, text };
  if (!transporter) {
    outbox.push(message);
    console.log(`[mail:dev] to=${to} subject=${subject}`);
    return { delivered: false, logged: true };
  }
  await transporter.sendMail(message);
  return { delivered: true };
}

export async function sendMailSafe(message) {
  try {
    return await sendMail(message);
  } catch (err) {
    console.error(`[mail] send failed for ${message.to}: ${err.message}`);
    return { delivered: false, error: err.message };
  }
}

const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

// Both emails are plain text, Arabic first with an English line under it.
export async function sendVerificationEmail(user, rawToken) {
  const link = `${clientUrl()}/verify-email?token=${rawToken}`;
  return sendMailSafe({
    to: user.email,
    subject: 'Freddo - أكد إيميلك / Confirm your email',
    text: [
      `أهلاً ${user.name}!`,
      '',
      'دوس على اللينك ده عشان تؤكد إيميلك وتقدر تطلب من فريدو:',
      link,
      '',
      'اللينك صالح لمدة 24 ساعة.',
      '',
      `Hi ${user.name}! Confirm your email to order from Freddo (link valid for 24 hours):`,
      link,
    ].join('\n'),
  });
}

export async function sendOrderConfirmationEmail(user, order) {
  const lines = order.items
    .map((item) => `- ${item.name.ar}${item.variantLabel ? ` (${item.variantLabel.ar})` : ''} × ${item.qty} = ${item.lineTotal} ج.م`)
    .join('\n');
  const fulfillment =
    order.fulfillmentType === 'delivery'
      ? `توصيل للبيت - العنوان: ${order.deliveryAddress}`
      : 'استلام من الفرع';
  return sendMailSafe({
    to: user.email,
    subject: `Freddo - طلبك ${order.orderNumber} وصلنا / Order received`,
    text: [
      `شكراً ${user.name}! طلبك اتسجل.`,
      '',
      `رقم الطلب: ${order.orderNumber}`,
      `طريقة الاستلام: ${fulfillment}`,
      '',
      lines,
      '',
      `الإجمالي: ${order.total} ج.م (الدفع كاش عند ${order.fulfillmentType === 'delivery' ? 'التوصيل' : 'الاستلام'})`,
      '',
      `Thanks ${user.name}! Your order ${order.orderNumber} is in. Total: ${order.total} EGP, cash on ${order.fulfillmentType === 'delivery' ? 'delivery' : 'pickup'}.`,
    ].join('\n'),
  });
}
