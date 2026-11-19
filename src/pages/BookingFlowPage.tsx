import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, CreditCard, Lock, Shield, Upload } from 'lucide-react';
import { useRental } from '../context/RentalContext';
import { SearchWidget } from '../components/SearchWidget';
import { formatDateTimeIT, formatEUR, trackEvent } from '../lib/format';
import type { AvailableModelResult, InsurancePlan, PriceQuote } from '../types/rental';

const STEPS = [
  { num: 1, label: 'Date e luoghi' },
  { num: 2, label: 'Scegli l’auto' },
  { num: 3, label: 'Extra e coperture' },
  { num: 4, label: 'Dati conducente' },
  { num: 5, label: 'Riepilogo e conferma' },
];

export function BookingFlowPage() {
  const { data, search, pickupAtIso, dropoffAtIso, navigate } = useRental();

  const urlParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : '',
  );
  const initialModelId = urlParams.get('modelId') || '';
  const initialStep = Number(urlParams.get('step') || (initialModelId ? 3 : 1));

  const [step, setStep] = useState<number>(Math.min(5, Math.max(1, initialStep)));
  const [availableModels, setAvailableModels] = useState<AvailableModelResult[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);

  const [selectedModelId, setSelectedModelId] = useState<string>(initialModelId);
  const [insurancePlan, setInsurancePlan] = useState<InsurancePlan>('base');
  const [extraQuantities, setExtraQuantities] = useState<Record<string, number>>({});
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Step 4 driver form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('1992-06-15');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [licenceIssueDate, setLicenceIssueDate] = useState('2015-04-10');
  const [licenceDocName, setLicenceDocName] = useState('');
  const [licenceDocData, setLicenceDocData] = useState('');
  const [idDocName, setIdDocName] = useState('');
  const [idDocData, setIdDocData] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [notes, setNotes] = useState('');

  // Step 5 confirmation
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent('begin_booking', { initialModelId });
  }, [initialModelId]);

  const loadAvailability = async () => {
    setLoadingAvail(true);
    try {
      const qs = new URLSearchParams({
        pickupAt: pickupAtIso,
        dropoffAt: dropoffAtIso,
        pickupLocationId: search.pickupLocationId,
        dropoffLocationId: search.dropoffLocationId,
        driverAge: String(search.driverAge),
      });
      const res = await fetch(`/api/availability?${qs.toString()}`);
      const json = await res.json();
      if (res.ok && json.available) {
        setAvailableModels(json.available);
        if (
          selectedModelId &&
          !json.available.some((a: AvailableModelResult) => a.model.id === selectedModelId)
        ) {
          setSelectedModelId('');
          if (step > 2) setStep(2);
        }
      }
    } finally {
      setLoadingAvail(false);
    }
  };

  useEffect(() => {
    if (data) {
      loadAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pickupAtIso, dropoffAtIso, search.pickupLocationId, search.dropoffLocationId, search.driverAge]);

  const extrasSelection = Object.entries(extraQuantities)
    .filter(([, qty]) => qty > 0)
    .map(([extraId, quantity]) => ({ extraId, quantity }));

  useEffect(() => {
    if (!selectedModelId) {
      setQuote(null);
      return;
    }
    setQuoteError(null);
    fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: selectedModelId,
        pickupAt: pickupAtIso,
        dropoffAt: dropoffAtIso,
        pickupLocationId: search.pickupLocationId,
        dropoffLocationId: search.dropoffLocationId,
        driverAge: search.driverAge,
        extrasSelection,
        insurancePlan,
        promoCode: appliedPromo || undefined,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.quote) setQuote(j.quote);
        else setQuoteError(j.error || 'Errore preventivo');
      })
      .catch(() => setQuoteError('Errore di rete nel calcolo preventivo.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedModelId,
    pickupAtIso,
    dropoffAtIso,
    search.pickupLocationId,
    search.dropoffLocationId,
    search.driverAge,
    insurancePlan,
    appliedPromo,
    JSON.stringify(extrasSelection),
  ]);

  const selectedModel = data?.models.find((m) => m.id === selectedModelId);
  const settings = data?.settings;
  const extrasList = data?.extras || [];

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'licence' | 'id',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setSubmitError('Il file caricato supera il limite di 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (target === 'licence') {
        setLicenceDocName(file.name);
        setLicenceDocData(result);
      } else {
        setIdDocName(file.name);
        setIdDocData(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const goStep = (next: number) => {
    trackEvent('booking_step_completed', { from: step, to: next });
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    goStep(5);
  };

  const handleConfirmBooking = async (simulateStripePay = false) => {
    if (!acceptTerms) {
      setSubmitError('Accetta le condizioni di noleggio e l’informativa privacy per proseguire.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: selectedModelId,
          pickupLocationId: search.pickupLocationId,
          dropoffLocationId: search.dropoffLocationId,
          pickupAt: pickupAtIso,
          dropoffAt: dropoffAtIso,
          driverAge: search.driverAge,
          insurancePlan,
          extrasSelection,
          promoCode: appliedPromo || undefined,
          simulateOnlinePaymentSuccess: simulateStripePay,
          notes,
          customer: {
            firstName,
            lastName,
            email,
            phone,
            birthDate,
            licenceNumber,
            licenceIssueDate,
            licenceDocData: licenceDocData || undefined,
            idDocData: idDocData || undefined,
            marketingConsent,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Impossibile completare la prenotazione.');
      }
      trackEvent('purchase', {
        code: json.booking.code,
        value: json.booking.total_cents / 100,
        currency: 'EUR',
      });
      navigate(`/prenota/conferma/${json.booking.code}`);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isOnlinePayment =
    settings?.payment_mode === 'full_online' || settings?.payment_mode === 'deposit_online';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
          Prenota la tua auto a Catania
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Procedura trasparente in 5 passaggi · Prezzo finale prima di confermare.
        </p>
      </div>

      {/* Progress Bar */}
      <nav aria-label="Avanzamento prenotazione" className="mb-8">
        <ol className="grid grid-cols-5 gap-2">
          {STEPS.map((s) => {
            const done = step > s.num;
            const current = step === s.num;
            const clickable = s.num < step || (s.num === 2 && availableModels.length > 0);
            return (
              <li key={s.num}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && setStep(s.num)}
                  className={`w-full text-left p-2.5 sm:p-3 rounded-lg border transition-colors ${
                    current
                      ? 'bg-sky-50 border-sky-600 text-sky-900'
                      : done
                      ? 'bg-white border-emerald-200 text-slate-800 hover:bg-slate-50'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <span>0{s.num}.</span>
                    )}
                    <span className="hidden sm:inline truncate font-sans">{s.label}</span>
                  </div>
                  <p className="sm:hidden text-[11px] font-medium truncate mt-0.5">{s.label}</p>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Step Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: Dates & Locations */}
          {step === 1 && (
            <section className="space-y-4">
              <h2 className="text-xl font-display font-bold text-slate-900">
                1. Scegli date, orari e sede di ritiro
              </h2>
              <SearchWidget onSubmit={() => goStep(2)} />
            </section>
          )}

          {/* STEP 2: Choose Car */}
          {step === 2 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-slate-900">
                  2. Scegli il veicolo disponibile
                </h2>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Modifica date
                </button>
              </div>

              {loadingAvail && (
                <div className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-36 bg-white border border-slate-200 rounded-xl animate-pulse" />
                  ))}
                </div>
              )}

              {!loadingAvail && availableModels.length === 0 && (
                <div className="p-6 bg-white border border-slate-200 rounded-xl">
                  <p className="text-sm font-semibold text-slate-900">
                    Nessuna auto disponibile per queste date. Prova a cambiare giorno o contattaci.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg"
                  >
                    Cambia date
                  </button>
                </div>
              )}

              {!loadingAvail &&
                availableModels.map(({ model, free_units_count, quote: mQuote }) => {
                  const isSelected = selectedModelId === model.id;
                  return (
                    <div
                      key={model.id}
                      className={`bg-white border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-center transition-colors ${
                        isSelected ? 'border-sky-600 ring-1 ring-sky-600' : 'border-slate-200'
                      }`}
                    >
                      <img
                        src={model.images[0]}
                        alt={`${model.brand} ${model.name}`}
                        referrerPolicy="no-referrer"
                        className="w-full sm:w-44 aspect-[4/3] object-cover rounded-lg bg-slate-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0 w-full">
                        <p className="text-xs text-slate-500">
                          {model.category_name_it} · {model.fuel} ·{' '}
                          <span className="text-emerald-700 font-semibold">
                            {free_units_count} {free_units_count === 1 ? 'unità libera' : 'unità libere'}
                          </span>
                        </p>
                        <h3 className="text-lg font-display font-bold text-slate-900">
                          {model.brand} {model.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-600">
                          {model.seats} posti · {model.bags} valigie · {model.transmission} ·{' '}
                          {mQuote.km_included}
                        </p>
                      </div>
                      <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <p className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                            {formatEUR(mQuote.total_cents)}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatEUR(mQuote.daily_price_cents)}/gg · IVA incl.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedModelId(model.id);
                            goStep(3);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg whitespace-nowrap"
                        >
                          Scegli questa auto
                        </button>
                      </div>
                    </div>
                  );
                })}
            </section>
          )}

          {/* STEP 3: Extras & Insurance */}
          {step === 3 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-slate-900">
                  3. Copertura assicurativa ed extra
                </h2>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Cambia auto
                </button>
              </div>

              {/* Insurance selection */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-display font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-600" />
                  Scegli la protezione
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'base' as InsurancePlan,
                      name: 'Base',
                      price: 'Inclusa',
                      desc: 'RCA + furto e danni con franchigia e deposito standard.',
                    },
                    {
                      id: 'smart' as InsurancePlan,
                      name: 'Smart',
                      price: '+€12,00 / giorno',
                      desc: 'Dimezza il deposito cauzionale e copre cristalli e pneumatici.',
                    },
                    {
                      id: 'kasko_zero' as InsurancePlan,
                      name: 'Kasko Zero',
                      price: '+€22,00 / giorno',
                      desc: 'Zero franchigia e €0 deposito cauzionale al ritiro.',
                    },
                  ].map((opt) => {
                    const active = insurancePlan === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setInsurancePlan(opt.id)}
                        className={`text-left p-4 rounded-xl border transition-colors ${
                          active
                            ? 'bg-sky-50 border-sky-600 ring-1 ring-sky-600'
                            : 'bg-slate-50 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">{opt.name}</span>
                          {active && <Check className="w-4 h-4 text-sky-600" />}
                        </div>
                        <p className="mt-1 text-xs font-mono font-semibold text-sky-700">
                          {opt.price}
                        </p>
                        <p className="mt-2 text-xs text-slate-600 leading-relaxed">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Extras list */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-display font-bold text-slate-900">
                  Accessori e servizi opzionali
                </h3>
                <div className="divide-y divide-slate-100">
                  {extrasList.map((ex) => {
                    const qty = extraQuantities[ex.id] || 0;
                    return (
                      <div
                        key={ex.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{ex.name_it}</p>
                          <p className="text-xs text-slate-600">{ex.description_it}</p>
                          <p className="mt-0.5 text-xs font-mono text-sky-700 tabular-nums">
                            {formatEUR(ex.price_cents)}{' '}
                            {ex.pricing_type === 'per_day' ? '/ giorno' : 'una tantum'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setExtraQuantities((p) => ({
                                ...p,
                                [ex.id]: Math.max(0, (p[ex.id] || 0) - 1),
                              }))
                            }
                            aria-label={`Rimuovi ${ex.name_it}`}
                            className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-semibold text-slate-800"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-mono font-semibold tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setExtraQuantities((p) => ({
                                ...p,
                                [ex.id]: Math.min(ex.max_qty, (p[ex.id] || 0) + 1),
                              }))
                            }
                            aria-label={`Aggiungi ${ex.name_it}`}
                            className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-semibold text-slate-800"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
                >
                  Indietro
                </button>
                <button
                  type="button"
                  onClick={() => goStep(4)}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
                >
                  Continua ai dati conducente
                </button>
              </div>
            </section>
          )}

          {/* STEP 4: Driver Details */}
          {step === 4 && (
            <form
              onSubmit={handleDriverSubmit}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-slate-900">
                  4. Dati del conducente principale
                </h2>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Torna agli extra
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="drv-first" className="block text-xs font-medium text-slate-700 mb-1">
                    Nome *
                  </label>
                  <input
                    id="drv-first"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Es. Mario"
                    className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="drv-last" className="block text-xs font-medium text-slate-700 mb-1">
                    Cognome *
                  </label>
                  <input
                    id="drv-last"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Es. Rossi"
                    className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="drv-email" className="block text-xs font-medium text-slate-700 mb-1">
                    Email (per ricevere la conferma) *
                  </label>
                  <input
                    id="drv-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mario.rossi@email.it"
                    className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="drv-phone" className="block text-xs font-medium text-slate-700 mb-1">
                    Telefono / WhatsApp *
                  </label>
                  <input
                    id="drv-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+39 340 123 4567"
                    className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="drv-birth" className="block text-xs font-medium text-slate-700 mb-1">
                    Data di nascita *
                  </label>
                  <input
                    id="drv-birth"
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="drv-lic" className="block text-xs font-medium text-slate-700 mb-1">
                    Numero patente B *
                  </label>
                  <input
                    id="drv-lic"
                    required
                    value={licenceNumber}
                    onChange={(e) => setLicenceNumber(e.target.value)}
                    placeholder="Es. U1234567X"
                    className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label htmlFor="drv-lic-date" className="block text-xs font-medium text-slate-700 mb-1">
                    Data conseguimento patente *
                  </label>
                  <input
                    id="drv-lic-date"
                    type="date"
                    required
                    value={licenceIssueDate}
                    onChange={(e) => setLicenceIssueDate(e.target.value)}
                    className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg tabular-nums"
                  />
                </div>
              </div>

              {/* Optional document upload for fast check-in */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-sky-600" />
                  Check-in veloce (opzionale): carica foto patente e documento d’identità
                </p>
                <p className="text-xs text-slate-500">
                  I documenti sono archiviati in modo privato e utilizzati solo per velocizzare la consegna dell’auto.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 text-xs text-slate-700">
                    <Upload className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">
                      {licenceDocName ? `Patente: ${licenceDocName}` : 'Carica foto patente'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, 'licence')}
                      className="sr-only"
                    />
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 text-xs text-slate-700">
                    <Upload className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">
                      {idDocName ? `Documento: ${idDocName}` : 'Carica carta d’identità'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, 'id')}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="drv-notes" className="block text-xs font-medium text-slate-700 mb-1">
                  Note o numero volo (opzionale)
                </label>
                <textarea
                  id="drv-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Es. Arrivo con volo Ryanair FR1234 alle 09:45"
                  className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600"
                />
                <span>Desidero ricevere offerte stagionali e codici sconto (facoltativo)</span>
              </label>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
                >
                  Vai al riepilogo finale
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: Final Review & Confirm */}
          {step === 5 && quote && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-slate-900">
                  5. Riepilogo finale trasparente
                </h2>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Modifica dati
                </button>
              </div>

              {/* Driver & Dates Recap */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                <div>
                  <p className="font-semibold text-slate-900">Conducente</p>
                  <p className="mt-1">
                    {firstName} {lastName}
                  </p>
                  <p>{email}</p>
                  <p>{phone} · Patente {licenceNumber.toUpperCase()}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Noleggio</p>
                  <p className="mt-1">Ritiro: {formatDateTimeIT(pickupAtIso)}</p>
                  <p>Riconsegna: {formatDateTimeIT(dropoffAtIso)}</p>
                  <p>
                    {selectedModel?.brand} {selectedModel?.name} · {quote.km_included}
                  </p>
                </div>
              </div>

              {/* Promo Code */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Hai un codice promo? Es. CATANIA10"
                  aria-label="Codice promozionale"
                  className="flex-1 h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={() => setAppliedPromo(promoInput.trim().toUpperCase())}
                  className="h-10 px-4 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Applica codice
                </button>
              </div>
              {appliedPromo && !quote.promo_applied && (
                <p className="text-xs text-amber-700">
                  Codice “{appliedPromo}” non valido o scaduto.
                </p>
              )}

              {/* Full Itemized Breakdown */}
              <div className="border-t border-slate-200 pt-4 space-y-2.5 text-sm">
                {quote.breakdown_lines.map((line, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <span className="text-slate-700">{line.label}</span>
                    <span
                      className={`font-mono tabular-nums ${
                        line.amount_cents < 0 ? 'text-emerald-700 font-semibold' : 'text-slate-900'
                      }`}
                    >
                      {formatEUR(line.amount_cents)}
                    </span>
                  </div>
                ))}

                <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between">
                  <div>
                    <p className="text-base font-display font-bold text-slate-900">
                      Totale noleggio (IVA 22% inclusa)
                    </p>
                    <p className="text-xs text-slate-500">
                      Di cui IVA inclusa: {formatEUR(quote.vat_included_cents)} · Deposito al ritiro:{' '}
                      <strong className="font-mono">{formatEUR(quote.deposit_cents)}</strong>
                    </p>
                  </div>
                  <p className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                    {formatEUR(quote.total_cents)}
                  </p>
                </div>
              </div>

              {/* Payment Mode Banner */}
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-950 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-sky-700" />
                  Modalità di pagamento attiva:{' '}
                  {settings?.payment_mode === 'full_online'
                    ? 'Pagamento completo online'
                    : settings?.payment_mode === 'deposit_online'
                    ? `Acconto ${settings.deposit_percent}% online`
                    : 'Pagamento direttamente al ritiro in sede'}
                </p>
                {isOnlinePayment ? (
                  <p>
                    Adesso paghi{' '}
                    <strong className="font-mono">{formatEUR(quote.amount_due_now_cents)}</strong> e
                    saldi{' '}
                    <strong className="font-mono">
                      {formatEUR(quote.amount_due_at_pickup_cents)}
                    </strong>{' '}
                    al ritiro.
                  </p>
                ) : (
                  <p>
                    Non paghi nulla adesso: blocchi l’auto gratuitamente e saldi{' '}
                    <strong className="font-mono">{formatEUR(quote.total_cents)}</strong> al ritiro.
                    Cancellazione gratuita fino a {settings?.free_cancellation_hours ?? 24}h prima.
                  </p>
                )}
              </div>

              {/* Terms acceptance */}
              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-sky-600"
                />
                <span>
                  Ho letto e accetto le{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/condizioni-di-noleggio')}
                    className="text-sky-700 underline"
                  >
                    condizioni generali di noleggio
                  </button>{' '}
                  e l’{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/privacy')}
                    className="text-sky-700 underline"
                  >
                    informativa sulla privacy
                  </button>
                  .
                </span>
              </label>

              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {submitError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
                >
                  Indietro
                </button>
                {isOnlinePayment ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleConfirmBooking(true)}
                    className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 rounded-lg"
                  >
                    {submitting
                      ? 'Elaborazione in corso...'
                      : `Paga ${formatEUR(quote.amount_due_now_cents)} e conferma`}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleConfirmBooking(false)}
                    className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 rounded-lg"
                  >
                    {submitting ? 'Conferma in corso...' : 'Conferma prenotazione'}
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Sticky Summary Sidebar */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-display font-bold text-slate-900">
            Riepilogo noleggio
          </h3>

          <div className="text-xs text-slate-600 space-y-1 pb-3 border-b border-slate-100">
            <p>
              <strong className="text-slate-800">Ritiro:</strong> {formatDateTimeIT(pickupAtIso)}
            </p>
            <p>
              <strong className="text-slate-800">Riconsegna:</strong>{' '}
              {formatDateTimeIT(dropoffAtIso)}
            </p>
          </div>

          {selectedModel ? (
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <img
                src={selectedModel.images[0]}
                alt={selectedModel.name}
                referrerPolicy="no-referrer"
                className="w-16 h-12 object-cover rounded-md bg-slate-100"
              />
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {selectedModel.brand} {selectedModel.name}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedModel.transmission} · {selectedModel.fuel}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Nessuna auto ancora selezionata.</p>
          )}

          {quoteError && <p className="text-xs text-red-700">{quoteError}</p>}

          {quote && (
            <div className="space-y-2 text-xs">
              {quote.breakdown_lines.map((line, idx) => (
                <div key={idx} className="flex justify-between gap-2 text-slate-600">
                  <span className="truncate">{line.label}</span>
                  <span className="font-mono tabular-nums shrink-0 text-slate-900">
                    {formatEUR(line.amount_cents)}
                  </span>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-900">Totale (IVA incl.)</span>
                <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
                  {formatEUR(quote.total_cents)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Deposito al ritiro: {formatEUR(quote.deposit_cents)}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
