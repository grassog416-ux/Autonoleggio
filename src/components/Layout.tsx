import React, { useEffect, useState } from 'react';
import { Menu, MessageCircle, Phone, X } from 'lucide-react';
import { useRental } from '../context/RentalContext';
import { useI18n } from '../i18n';
import { buildWhatsAppUrl, trackEvent } from '../lib/format';

export function Layout({ children }: { children: React.ReactNode }) {
  const { data, route, navigate } = useRental();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(true);

  const pathname = route.split('?')[0];
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('src_cookie_consent');
      if (!saved) {
        setCookieOpen(true);
      }
    } catch {
      setCookieOpen(true);
    }
  }, []);

  const saveConsent = (analytics: boolean) => {
    try {
      localStorage.setItem(
        'src_cookie_consent',
        JSON.stringify({ necessary: true, analytics, savedAt: new Date().toISOString() }),
      );
    } catch {
      // ignore storage errors
    }
    setCookieOpen(false);
  };

  const settings = data?.settings;
  const whatsappUrl = buildWhatsAppUrl(
    settings?.whatsapp || '+393400000000',
    'Ciao Smart Rent Car Catania, vorrei informazioni per un noleggio auto.',
  );

  const go = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  const navItems = [
    { label: t.nav.fleet, path: '/auto' },
    { label: t.nav.howItWorks, path: '/come-funziona' },
    { label: t.nav.locations, path: '/dove-siamo' },
    { label: t.nav.offers, path: '/offerte' },
    { label: t.nav.customerArea, path: '/area-clienti' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar adhering strictly to 3-zone contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => go('/')}
            className="text-lg font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded"
          >
            Smart Rent Car
          </button>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav aria-label="Navigazione principale" className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const active = pathname === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => go(item.path)}
                  className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded px-1 py-1 ${
                    active ? 'text-sky-700 underline' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => go('/prenota')}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-600"
            >
              {t.nav.bookNow}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Chiudi menu' : 'Apri menu'}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => go(item.path)}
                className="block w-full text-left px-3 py-2.5 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => go('/noleggio-lungo-termine')}
              className="block w-full text-left px-3 py-2.5 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              {t.nav.longTerm}
            </button>
            <button
              type="button"
              onClick={() => go('/faq')}
              className="block w-full text-left px-3 py-2.5 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              {t.nav.faq}
            </button>
            <button
              type="button"
              onClick={() => go('/contatti')}
              className="block w-full text-left px-3 py-2.5 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              {t.nav.contacts}
            </button>
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => go('/prenota')}
                className="w-full py-3 px-4 text-center text-sm font-semibold text-white bg-sky-600 rounded-lg"
              >
                {t.nav.bookNow}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Quiet Editorial Footer */}
      {!isAdminRoute && (
        <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <p className="font-display font-bold text-white text-lg">Smart Rent Car Catania</p>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                {settings?.address_it || 'Via Etnea 412, Catania [DA CONFERMARE]'}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {settings?.opening_hours_it || 'Lun–Sab 08:30–20:00'}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {settings?.vat_number || 'P.IVA 00000000000 [DA CONFERMARE]'}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-3">Noleggio</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <button type="button" onClick={() => go('/auto')} className="hover:text-white">
                    Catalogo flotta
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => go('/prenota')} className="hover:text-white">
                    Prenota online
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => go('/offerte')} className="hover:text-white">
                    Offerte e codici promo
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => go('/noleggio-lungo-termine')}
                    className="hover:text-white"
                  >
                    Noleggio lungo termine
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-3">Informazioni</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <button type="button" onClick={() => go('/come-funziona')} className="hover:text-white">
                    Come funziona e check-in
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => go('/dove-siamo')} className="hover:text-white">
                    Dove siamo a Catania
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => go('/faq')} className="hover:text-white">
                    Domande frequenti (FAQ)
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => go('/contatti')} className="hover:text-white">
                    Contatti e assistenza
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-3">Contatti rapidi & Legale</p>
              <div className="space-y-2 text-sm">
                <a
                  href={`tel:${(settings?.phone || '').replace(/[^\d+]/g, '')}`}
                  onClick={() => trackEvent('phone_click')}
                  className="flex items-center gap-2 hover:text-white"
                >
                  <Phone className="w-4 h-4 text-sky-400" />
                  <span>{settings?.phone || '+39 095 000 0000'}</span>
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('whatsapp_click')}
                  className="flex items-center gap-2 hover:text-white"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Scrivici su WhatsApp</span>
                </a>
              </div>
              <ul className="mt-4 pt-4 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
                <li>
                  <button type="button" onClick={() => go('/privacy')} className="hover:text-white">
                    Informativa Privacy
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => go('/cookie')} className="hover:text-white">
                    Cookie Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => go('/condizioni-di-noleggio')}
                    className="hover:text-white"
                  >
                    Condizioni generali di noleggio
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => go('/admin')} className="hover:text-white">
                    Pannello Gestione Titolare
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 py-4 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <span>© {new Date().getFullYear()} Smart Rent Car Autonoleggio Catania</span>
              <span>Coord. sede Catania: 37.5158, 15.0781</span>
            </div>
          </div>
        </footer>
      )}

      {/* Desktop Floating WhatsApp Button */}
      {!isAdminRoute && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('whatsapp_click', { location: 'floating' })}
          aria-label="Scrivici su WhatsApp"
          className="hidden md:inline-flex fixed bottom-6 right-6 z-40 items-center gap-2 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <MessageCircle className="w-4 h-4" />
          <span>WhatsApp</span>
        </a>
      )}

      {/* Mobile Sticky Bottom Bar (<= 56px, well under 15% mobile viewport cap) */}
      {!isAdminRoute && pathname !== '/prenota' && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-white border-t border-slate-200 px-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => go('/prenota')}
            className="flex-1 h-10 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg"
          >
            Prenota ora
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('whatsapp_click', { location: 'mobile_sticky' })}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        </div>
      )}

      {/* Granular Italian Cookie Banner */}
      {cookieOpen && (
        <div
          role="dialog"
          aria-label="Preferenze cookie"
          className="fixed bottom-16 md:bottom-6 left-4 right-4 md:right-auto md:max-w-md z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-4"
        >
          <p className="text-sm font-semibold text-slate-900">Preferenze privacy e cookie</p>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Usiamo cookie tecnici essenziali per gestire la prenotazione. Puoi scegliere se attivare i cookie analitici per aiutarci a migliorare il servizio.
          </p>
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={analyticsConsent}
              onChange={(e) => setAnalyticsConsent(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-600"
            />
            <span>Attiva cookie analitici (GA4 / statistiche anonime)</span>
          </label>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => saveConsent(false)}
              className="flex-1 py-2 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Solo essenziali
            </button>
            <button
              type="button"
              onClick={() => saveConsent(analyticsConsent)}
              className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
            >
              Salva preferenze
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
