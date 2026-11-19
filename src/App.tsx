import React from 'react';
import { I18nProvider } from './i18n';
import { RentalProvider, useRental } from './context/RentalContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { CarDetailPage } from './pages/CarDetailPage';
import { BookingFlowPage } from './pages/BookingFlowPage';
import { BookingConfirmationPage } from './pages/BookingConfirmationPage';
import {
  ContactsPage,
  FaqPage,
  HowItWorksPage,
  LegalPage,
  LocationsPage,
  LongTermPage,
  OffersPage,
} from './pages/InfoPages';
import { CustomerAreaPage } from './pages/CustomerAreaPage';
import { AdminPage } from './pages/AdminPage';

function AppRouter() {
  const { route, loading, error } = useRental();
  const pathname = route.split('?')[0].replace(/\/+$/, '') || '/';

  if (loading && !pathname.startsWith('/admin')) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="h-96 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error && !pathname.startsWith('/admin')) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-base font-semibold text-slate-900">{error}</p>
      </div>
    );
  }

  if (pathname === '/') return <HomePage />;
  if (pathname === '/auto') return <CatalogPage />;
  if (pathname.startsWith('/auto/')) {
    const slug = pathname.slice('/auto/'.length);
    return <CarDetailPage slug={slug} />;
  }
  if (pathname === '/prenota') return <BookingFlowPage />;
  if (pathname.startsWith('/prenota/conferma/')) {
    const codice = pathname.slice('/prenota/conferma/'.length);
    return <BookingConfirmationPage code={codice} />;
  }
  if (pathname === '/offerte') return <OffersPage />;
  if (pathname === '/noleggio-lungo-termine') return <LongTermPage />;
  if (pathname === '/come-funziona') return <HowItWorksPage />;
  if (pathname === '/faq') return <FaqPage />;
  if (pathname === '/dove-siamo') return <LocationsPage />;
  if (pathname === '/contatti') return <ContactsPage />;
  if (pathname === '/area-clienti') return <CustomerAreaPage />;
  if (pathname === '/admin') return <AdminPage />;
  if (pathname === '/privacy') return <LegalPage type="privacy" />;
  if (pathname === '/cookie') return <LegalPage type="cookie" />;
  if (pathname === '/condizioni-di-noleggio') return <LegalPage type="terms" />;

  return <HomePage />;
}

export default function App() {
  return (
    <I18nProvider>
      <RentalProvider>
        <Layout>
          <AppRouter />
        </Layout>
      </RentalProvider>
    </I18nProvider>
  );
}
