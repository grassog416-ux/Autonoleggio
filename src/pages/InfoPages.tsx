import React, { useState } from 'react';
import { Camera, CheckCircle2, Clock, Copy, ExternalLink, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { useRental } from '../context/RentalContext';
import { buildWhatsAppUrl, formatEUR, trackEvent } from '../lib/format';

export function HowItWorksPage() {
  const { data, navigate } = useRental();
  const settings = data?.settings;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold text-sky-700">Come funziona</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight">
          Ritiro veloce, foto condivise e regole chiare.
        </h1>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">
          Abbiamo eliminato i punti critici più segnalati nel noleggio auto a Catania: niente attese interminabili, niente upselling aggressivo al banco e nessuna contestazione sui graffi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <Camera className="w-6 h-6 text-sky-600" />
          <h2 className="mt-4 text-lg font-display font-bold text-slate-900">
            01. Check-in fotografico datato
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Prima di consegnarti le chiavi scattiamo insieme le foto dei 4 lati, dei cerchi e del contachilometri. Le salviamo sulla tua pratica con data e ora.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <Clock className="w-6 h-6 text-sky-600" />
          <h2 className="mt-4 text-lg font-display font-bold text-slate-900">
            02. {settings?.grace_period_minutes ?? 30} minuti di tolleranza
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Sappiamo come può essere il traffico tra tangenziale e centro: hai {settings?.grace_period_minutes ?? 30} minuti di tolleranza gratuita al rientro senza addebiti extra.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <ShieldCheck className="w-6 h-6 text-sky-600" />
          <h2 className="mt-4 text-lg font-display font-bold text-slate-900">
            03. Prezzo bloccato prima di pagare
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Deposito cauzionale, franchigie ed eventuali extra sono esposti prima della conferma. Nessuna sorpresa al desk.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-display font-bold text-slate-900">
            Pronto a verificare le auto disponibili?
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Scegli le tue date e blocca il modello in meno di 3 minuti.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/prenota')}
          className="px-5 py-3 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shrink-0"
        >
          Prenota ora
        </button>
      </div>
    </div>
  );
}

export function OffersPage() {
  const { navigate } = useRental();
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const offers = [
    {
      code: 'CATANIA10',
      title: '10% di sconto su tutta la flotta',
      desc: 'Valido per prenotazioni online su qualsiasi durata e categoria, inclusi weekend e ponti.',
    },
    {
      code: 'BENVENUTO15',
      title: '€15,00 di sconto immediato',
      desc: 'Applicabile sul riepilogo finale al passo 5 della prenotazione online.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
      <div>
        <p className="text-xs font-semibold text-sky-700">Offerte attive</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight">
          Codici promozionali e tariffe settimanali
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Copia il codice promo e inseriscilo nel passaggio finale della prenotazione.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {offers.map((o) => (
          <div
            key={o.code}
            className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4"
          >
            <div>
              <p className="text-xs font-mono font-bold text-sky-700">{o.code}</p>
              <h2 className="mt-1 text-xl font-display font-bold text-slate-900">{o.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{o.desc}</p>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => copyCode(o.code)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied === o.code ? 'Copiato!' : 'Copia codice'}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/prenota')}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
              >
                Usa ora
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-display font-bold">Sconti automatici da 7 a 30+ giorni</h3>
          <p className="mt-1 text-sm text-slate-300">
            Più giorni prenoti, più scende la tariffa giornaliera automaticamente nel preventivo (fino al 35% in meno).
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/auto')}
          className="px-5 py-2.5 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shrink-0"
        >
          Vedi tariffe flotta
        </button>
      </div>
    </div>
  );
}

function LeadForm({ type, title }: { type: 'contact' | 'long_term'; title: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, email, phone, message, honeypot }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Errore nell’invio della richiesta.');
      setSent(true);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-2">
        <p className="font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Richiesta inviata con successo
        </p>
        <p className="text-sm text-emerald-800">
          Ti risponderemo al più presto via telefono, email o WhatsApp.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-2 text-xs font-semibold text-emerald-900 underline"
        >
          Invia un’altra richiesta
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <h2 className="text-xl font-display font-bold text-slate-900">{title}</h2>
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Nome e Cognome *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Es. Laura Bianchi"
          className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@azienda.it"
            className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Telefono / WhatsApp *</label>
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+39 340 000 0000"
            className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          {type === 'long_term'
            ? 'Modello di interesse, durata (mesi) e km stimati *'
            : 'Messaggio *'}
        </label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            type === 'long_term'
              ? 'Es. Fiat Panda o SUV compatto per 3 mesi, circa 2.000 km/mese, con fatturazione aziendale.'
              : 'Scrivi qui la tua domanda o le date desiderate...'
          }
          className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg"
        />
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-60"
      >
        {submitting ? 'Invio in corso...' : 'Invia richiesta'}
      </button>
    </form>
  );
}

export function LongTermPage() {
  const { data } = useRental();
  const monthlyPanda = data?.rates.find((r) => r.model_id === 'mod-panda' && r.min_days >= 30);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      <div className="lg:col-span-6 space-y-5">
        <p className="text-xs font-semibold text-sky-700">Privati, Partite IVA e Aziende</p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight">
          Noleggio mensile e lungo termine a Catania
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          Soluzione flessibile da 1 a 12 mesi senza anticipo vincolante: ideale per professionisti in trasferta, residenti con auto in riparazione o aziende del territorio.
        </p>

        <ul className="space-y-3 text-sm text-slate-700 pt-2">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
            <span>Manutenzione ordinaria, bollo e assicurazione RCA inclusi nel canone.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
            <span>Fatturazione mensile per professionisti e aziende con P.IVA.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
            <span>
              Tariffe mensili indicative da{' '}
              <strong className="font-mono">
                {formatEUR((monthlyPanda?.daily_price_cents || 1900) * 30)}/mese
              </strong>{' '}
              (IVA inclusa).
            </span>
          </li>
        </ul>
      </div>

      <div className="lg:col-span-6">
        <LeadForm type="long_term" title="Richiedi un preventivo personalizzato" />
      </div>
    </div>
  );
}

export function FaqPage() {
  const { data } = useRental();
  const [query, setQuery] = useState('');
  const faqs = (data?.faqs || []).filter(
    (f) =>
      f.question_it.toLowerCase().includes(query.toLowerCase()) ||
      f.answer_it.toLowerCase().includes(query.toLowerCase()),
  );

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (data?.faqs || []).map((f) => ({
      '@type': 'Question',
      name: f.question_it,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer_it,
      },
    })),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900">
          Domande frequenti (FAQ)
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Risposte dirette su documenti, depositi, tolleranza oraria e assicurazione.
        </p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca una parola chiave (es. patente, deposito, Etna)..."
        className="w-full h-11 px-4 text-sm bg-white border border-slate-200 rounded-lg"
      />

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 px-6">
        {faqs.length === 0 ? (
          <p className="py-8 text-sm text-slate-500 text-center">
            Nessuna domanda trovata per questa ricerca.
          </p>
        ) : (
          faqs.map((faq) => (
            <details key={faq.id} className="group py-4" open={Boolean(query)}>
              <summary className="flex items-center justify-between gap-4 cursor-pointer text-base font-semibold text-slate-900 list-none">
                <span>{faq.question_it}</span>
                <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{faq.answer_it}</p>
            </details>
          ))
        )}
      </div>
    </div>
  );
}

export function LocationsPage() {
  const { data } = useRental();
  const locations = data?.locations || [];
  const settings = data?.settings;
  const lat = settings?.lat ?? 37.5158;
  const lng = settings?.lng ?? 15.0781;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
      <div>
        <p className="text-xs font-semibold text-sky-700">Catania · Coordinate {lat}, {lng}</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-display font-bold text-slate-900">
          Dove siamo e istruzioni di ritiro
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Indicazioni chiare per raggiungerci senza perderti, orari di apertura e punti di riconsegna.
        </p>
      </div>

      {/* Map Embed + Primary Address */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 min-h-[320px] bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
          <iframe
            title="Mappa Smart Rent Car Catania"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.015},${lat - 0.01},${lng + 0.015},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`}
            className="w-full h-full min-h-[320px] border-0"
            loading="lazy"
          />
        </div>
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h2 className="text-xl font-display font-bold text-slate-900">
              {settings?.business_name}
            </h2>
            <p className="text-sm text-slate-700 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
              <span>{settings?.address_it}</span>
            </p>
            <p className="text-sm text-slate-700 flex items-start gap-2">
              <Clock className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
              <span>{settings?.opening_hours_it}</span>
            </p>
            <p className="text-sm text-slate-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-sky-600 shrink-0" />
              <span>{settings?.phone}</span>
            </p>
          </div>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
          >
            <span>Apri navigatore Google Maps</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Location Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {locations.map((loc) => (
          <div key={loc.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
            <h3 className="text-lg font-display font-bold text-slate-900">{loc.name}</h3>
            <p className="text-xs text-slate-500">{loc.address}</p>
            <p className="text-xs font-medium text-sky-700">{loc.opening_hours_it}</p>
            <p className="pt-2 text-sm text-slate-700 leading-relaxed">
              {loc.pickup_instructions_it}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactsPage() {
  const { data } = useRental();
  const settings = data?.settings;
  const whatsappUrl = buildWhatsAppUrl(
    settings?.whatsapp || '+393400000000',
    'Ciao Smart Rent Car Catania, ho bisogno di assistenza.',
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      <div className="lg:col-span-5 space-y-5">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900">
          Contatti e assistenza diretta
        </h1>
        <p className="text-base text-slate-600">
          Preferisci scrivere subito? Rispondiamo rapidamente su WhatsApp o al telefono negli orari di apertura.
        </p>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-sm">
          <p>
            <strong className="text-slate-900 block text-xs">Indirizzo sede</strong>
            {settings?.address_it}
          </p>
          <p>
            <strong className="text-slate-900 block text-xs">Telefono</strong>
            <a
              href={`tel:${(settings?.phone || '').replace(/[^\d+]/g, '')}`}
              onClick={() => trackEvent('phone_click', { location: 'contacts' })}
              className="text-sky-700 hover:underline"
            >
              {settings?.phone}
            </a>
          </p>
          <p>
            <strong className="text-slate-900 block text-xs">Email</strong>
            {settings?.email}
          </p>
          <p>
            <strong className="text-slate-900 block text-xs">Orari</strong>
            {settings?.opening_hours_it}
          </p>
          <div className="pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('whatsapp_click', { location: 'contacts' })}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Scrivici su WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      <div className="lg:col-span-7">
        <LeadForm type="contact" title="Scrivici un messaggio" />
      </div>
    </div>
  );
}

export function LegalPage({ type }: { type: 'privacy' | 'cookie' | 'terms' }) {
  const { data } = useRental();
  const settings = data?.settings;

  const titles = {
    privacy: 'Informativa sulla Privacy (GDPR)',
    cookie: 'Cookie Policy',
    terms: 'Condizioni Generali di Noleggio',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
      <h1 className="text-3xl font-display font-bold text-slate-900">{titles[type]}</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4 text-sm text-slate-700 leading-relaxed">
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Nota operativa: questo testo costituisce una struttura informativa di base e va revisionato dal consulente legale del titolare prima della pubblicazione definitiva.
        </p>
        <p>
          <strong>Titolare del servizio:</strong> {settings?.business_name} · {settings?.address_it} ·{' '}
          {settings?.vat_number} · Email: {settings?.email}.
        </p>

        {type === 'privacy' && (
          <>
            <h2 className="text-base font-bold text-slate-900 pt-2">1. Dati raccolti</h2>
            <p>
              Raccogliamo esclusivamente i dati necessari all’esecuzione del contratto di noleggio: dati anagrafici, recapiti, numero e data di conseguimento della patente di guida e copie documentali opzionali per il check-in rapido.
            </p>
            <h2 className="text-base font-bold text-slate-900 pt-2">2. Conservazione e diritti</h2>
            <p>
              I documenti caricati sono archiviati in area privata protetta e cancellati al termine del periodo di conservazione legale o su richiesta dell’interessato scrivendo all’email aziendale.
            </p>
          </>
        )}

        {type === 'cookie' && (
          <>
            <h2 className="text-base font-bold text-slate-900 pt-2">1. Cookie tecnici essenziali</h2>
            <p>
              Necessari per mantenere lo stato della ricerca e della prenotazione in corso. Non richiedono consenso preventivo.
            </p>
            <h2 className="text-base font-bold text-slate-900 pt-2">2. Cookie analitici e marketing</h2>
            <p>
              Attivati esclusivamente dopo consenso esplicito tramite il banner cookie. Puoi revocare il consenso in qualsiasi momento cancellando le preferenze dal browser.
            </p>
          </>
        )}

        {type === 'terms' && (
          <>
            <h2 className="text-base font-bold text-slate-900 pt-2">1. Requisiti conducente</h2>
            <p>
              Età minima {settings?.young_driver_min_age ?? 21} anni con patente B valida da almeno 12 mesi. Per conducenti sotto i {settings?.young_driver_threshold_age ?? 25} anni può essere applicato un supplemento giornaliero mostrato nel preventivo.
            </p>
            <h2 className="text-base font-bold text-slate-900 pt-2">2. Cancellazione e tolleranza</h2>
            <p>
              Cancellazione gratuita fino a {settings?.free_cancellation_hours ?? 24} ore prima del ritiro. Alla riconsegna è prevista una tolleranza gratuita di {settings?.grace_period_minutes ?? 30} minuti.
            </p>
            <h2 className="text-base font-bold text-slate-900 pt-2">3. Ispezione fotografica</h2>
            <p>
              Al ritiro e alla riconsegna viene compilato un verbale fotografico condiviso tra operatore e cliente.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
