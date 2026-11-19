import React, { useEffect, useState } from 'react';
import { CalendarPlus, CheckCircle2, MessageCircle, Printer } from 'lucide-react';
import { useRental } from '../context/RentalContext';
import type { BookingRecord } from '../types/rental';
import { buildWhatsAppUrl, formatDateTimeIT, formatEUR } from '../lib/format';
import { useI18n } from '../i18n';

export function BookingConfirmationPage({ code }: { code: string }) {
  const { data, navigate } = useRental();
  const { t } = useI18n();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bookings/by-code/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.booking) setBooking(j.booking);
        else setError(j.error || 'Prenotazione non trovata.');
      })
      .catch(() => setError('Errore di rete nel caricamento della conferma.'))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-bold text-slate-900">
          Prenotazione non trovata
        </h1>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg"
        >
          Torna alla Home
        </button>
      </div>
    );
  }

  const whatsappUrl = buildWhatsAppUrl(
    data?.settings.whatsapp || '+393400000000',
    `Ciao Smart Rent Car Catania, ho confermato la prenotazione ${booking.code} (${booking.model_name}) per il ${formatDateTimeIT(booking.pickup_at)}.`,
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-700">
              Stato: {t.statuses[booking.status]}
            </p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
              Prenotazione registrata
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Codice di riferimento:{' '}
              <span className="font-mono font-bold text-slate-900">{booking.code}</span>. Abbiamo
              inviato il riepilogo all’indirizzo {booking.customer_email}.
            </p>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
          <div>
            <p className="text-xs text-slate-500">Veicolo assegnato</p>
            <p className="font-bold text-slate-900">{booking.model_name}</p>
            <p className="text-xs font-mono text-slate-600 mt-0.5">
              Targa assegnata: {booking.vehicle_plate}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Conducente</p>
            <p className="font-bold text-slate-900">{booking.customer_name}</p>
            <p className="text-xs text-slate-600">{booking.customer_phone}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Ritiro</p>
            <p className="font-semibold text-slate-900">{formatDateTimeIT(booking.pickup_at)}</p>
            <p className="text-xs text-slate-600">{booking.pickup_location_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Riconsegna</p>
            <p className="font-semibold text-slate-900">{formatDateTimeIT(booking.dropoff_at)}</p>
            <p className="text-xs text-slate-600">{booking.dropoff_location_name}</p>
          </div>
        </div>

        {/* Financial breakdown */}
        <div className="space-y-2 text-sm border-t border-slate-200 pt-4">
          <div className="flex justify-between">
            <span className="text-slate-600">Tariffa base noleggio</span>
            <span className="font-mono tabular-nums">{formatEUR(booking.subtotal_cents)}</span>
          </div>
          {booking.extras_cents > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Extra selezionati</span>
              <span className="font-mono tabular-nums">{formatEUR(booking.extras_cents)}</span>
            </div>
          )}
          {booking.fees_cents > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Coperture e supplementi</span>
              <span className="font-mono tabular-nums">{formatEUR(booking.fees_cents)}</span>
            </div>
          )}
          {booking.discount_cents > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Sconto applicato</span>
              <span className="font-mono tabular-nums">-{formatEUR(booking.discount_cents)}</span>
            </div>
          )}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
            <span className="font-bold text-slate-900">Totale (IVA 22% inclusa)</span>
            <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
              {formatEUR(booking.total_cents)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Già pagato online</span>
            <span className="font-mono tabular-nums">{formatEUR(booking.amount_paid_cents)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Saldo al ritiro</span>
            <span className="font-mono tabular-nums">
              {formatEUR(Math.max(0, booking.total_cents - booking.amount_paid_cents))}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Deposito cauzionale previsto al ritiro</span>
            <span className="font-mono tabular-nums">{formatEUR(booking.deposit_cents)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-3">
          <a
            href={`/api/bookings/by-code/${encodeURIComponent(booking.code)}/calendar.ics`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Aggiungi al calendario (.ics)</span>
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Invia su WhatsApp</span>
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg"
          >
            <Printer className="w-4 h-4" />
            <span>Stampa ricevuta</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/area-clienti')}
            className="ml-auto text-xs font-semibold text-sky-700 hover:underline"
          >
            Vai all’Area Clienti
          </button>
        </div>
      </div>
    </div>
  );
}
