import React, { useState } from 'react';
import { CalendarPlus, Search } from 'lucide-react';
import type { BookingRecord } from '../types/rental';
import { formatDateTimeIT, formatEUR } from '../lib/format';
import { useI18n } from '../i18n';
import { useRental } from '../context/RentalContext';

export function CustomerAreaPage() {
  const { navigate } = useRental();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [bookings, setBookings] = useState<BookingRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchBookings = async (targetEmail: string, targetCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/customer/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, code: targetCode }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Errore nella ricerca.');
      setBookings(j.bookings);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchBookings(email, code);
  };

  const handleCancel = async (bCode: string) => {
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(bCode)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Impossibile annullare.');
      setBookings((prev) =>
        prev ? prev.map((item) => (item.code === bCode ? j.booking : item)) : prev,
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      <div>
        <p className="text-xs font-semibold text-sky-700">Area Clienti</p>
        <h1 className="mt-1 text-3xl font-display font-bold text-slate-900">
          Gestisci le tue prenotazioni
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Inserisci l’email utilizzata in fase di prenotazione per visualizzare i dettagli, scaricare il promemoria calendario o richiedere l’annullamento.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cust-email" className="block text-xs font-medium text-slate-700 mb-1">
              Email prenotazione *
            </label>
            <input
              id="cust-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@email.it"
              className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="cust-code" className="block text-xs font-medium text-slate-700 mb-1">
              Codice prenotazione (opzionale)
            </label>
            <input
              id="cust-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Es. SRC-2026-1042"
              className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setEmail('luca.esposito@example.it');
              setCode('');
              searchBookings('luca.esposito@example.it', '');
            }}
            className="text-xs font-medium text-sky-700 hover:underline"
          >
            Carica prenotazione demo (luca.esposito@example.it)
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Ricerca...' : 'Cerca prenotazioni'}</span>
          </button>
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </form>

      {bookings !== null && bookings.length === 0 && (
        <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-sm text-slate-600">
          Nessuna prenotazione trovata per questa email.
        </div>
      )}

      {bookings && bookings.length > 0 && (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <p className="text-xs font-mono text-slate-500">
                  {b.code} · {t.statuses[b.status]}
                </p>
                <h2 className="mt-1 text-lg font-display font-bold text-slate-900">
                  {b.model_name}
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Ritiro: {formatDateTimeIT(b.pickup_at)} · Riconsegna:{' '}
                  {formatDateTimeIT(b.dropoff_at)}
                </p>
                <p className="mt-1 text-xs font-mono font-semibold text-slate-900 tabular-nums">
                  Totale: {formatEUR(b.total_cents)} · Targa: {b.vehicle_plate}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/prenota/conferma/${b.code}`)}
                  className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Apri ricevuta
                </button>
                <a
                  href={`/api/bookings/by-code/${encodeURIComponent(b.code)}/calendar.ics`}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>.ics</span>
                </a>
                {(b.status === 'confirmed' || b.status === 'pending') && (
                  <button
                    type="button"
                    onClick={() => handleCancel(b.code)}
                    className="px-3 py-2 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-lg"
                  >
                    Annulla
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
