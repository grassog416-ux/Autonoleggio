export function formatEUR(cents: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export function formatDateTimeIT(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateIT(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function getDefaultSearchDates() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const plus4 = new Date(now.getTime() + 4 * 86400000);
  const toYMD = (d: Date) => d.toISOString().slice(0, 10);
  return {
    pickupDate: toYMD(tomorrow),
    pickupTime: '10:00',
    dropoffDate: toYMD(plus4),
    dropoffTime: '10:00',
  };
}

export function combineDateTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = phone.replace(/[^\d]/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${clean}?text=${encoded}`;
}

export function trackEvent(eventName: string, payload?: Record<string, unknown>) {
  try {
    const consentRaw = localStorage.getItem('src_cookie_consent');
    if (!consentRaw) return;
    const consent = JSON.parse(consentRaw);
    if (!consent.analytics) return;
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, payload || {});
    }
  } catch {
    // Ignore consent parse errors
  }
}
