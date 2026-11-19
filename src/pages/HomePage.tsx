import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, MapPin, ShieldCheck, Star } from 'lucide-react';
import { useRental } from '../context/RentalContext';
import { SearchWidget } from '../components/SearchWidget';
import { CarCard } from '../components/CarCard';
import { buildWhatsAppUrl, trackEvent } from '../lib/format';

export function HomePage() {
  const { data, navigate } = useRental();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const models = data?.models || [];
  const categories = data?.categories || [];
  const reviews = data?.reviews || [];
  const socialPosts = data?.socialPosts || [];
  const faqs = (data?.faqs || []).slice(0, 4);
  const settings = data?.settings;

  const filteredModels =
    activeCategory === 'all'
      ? models
      : models.filter((m) => m.category_slug === activeCategory);

  const whatsappUrl = buildWhatsAppUrl(
    settings?.whatsapp || '+393400000000',
    'Ciao! Vorrei verificare la disponibilità di un’auto a Catania.',
  );

  return (
    <div>
      {/* Hero Section with Catania Coastal Backdrop & Search Bar */}
      <section className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/src/assets/images/hero_catania_coastal_1795112356471.jpg"
            alt="Auto a noleggio sulla costa di Catania con vista sull’Etna"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/35"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-12 sm:pt-16 sm:pb-16">
          <div className="max-w-2xl">
            <p className="text-xs sm:text-sm font-medium text-sky-300 tracking-wide">
              Catania · Noleggio breve e lungo termine
            </p>
            <h1 className="mt-2 text-3xl sm:text-5xl font-display font-extrabold tracking-tight text-white [text-wrap:balance] leading-[1.1]">
              Noleggio auto a Catania, semplice e senza sorprese.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl">
              Prezzo finale con tutto incluso. Niente costi nascosti, check-in fotografico condiviso e 30 minuti di tolleranza al rientro.
            </p>
          </div>

          <div className="mt-8">
            <SearchWidget />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-200">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              IVA 22% inclusa nel preventivo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              Cancellazione gratuita fino a {settings?.free_cancellation_hours ?? 24}h prima
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              Assistenza diretta su WhatsApp
            </span>
          </div>
        </div>
      </section>

      {/* Featured Fleet */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
              La nostra flotta a Catania
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-600">
              City car agili per il centro, SUV per l’Etna e minivan 9 posti per gruppi.
            </p>
          </div>

          {/* Interactive category filter bar */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tutte
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.slug)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeCategory === cat.slug
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.name_it}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map((model) => (
            <CarCard key={model.id} model={model} />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => navigate('/auto')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <span>Esplora catalogo e disponibilità</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Transparency & 3-Step Process */}
      <section className="bg-white border-y border-slate-200 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold text-sky-700">Perché sceglierci</p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight [text-wrap:balance]">
                Zero costi nascosti e nessuna sorpresa al desk.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                Sappiamo cosa frustra chi noleggia un’auto a Catania: extra imposti all’ultimo minuto, penali per pochi minuti di ritardo o contestazioni su vecchi graffi. Abbiamo progettato tutto al contrario.
              </p>
              <div className="mt-6 space-y-3 text-sm text-slate-700">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-semibold text-slate-900">Dettaglio prezzi trasparente:</strong>{' '}
                    tariffa, deposito cauzionale, extra e IVA mostrati prima di confermare.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-semibold text-slate-900">Check-in fotografico datato:</strong>{' '}
                    scattiamo insieme le foto dell’auto alla consegna e le salviamo sulla tua pratica.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-semibold text-slate-900">30 minuti di tolleranza:</strong>{' '}
                    il traffico catanese non ti costa una giornata extra.
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-sm font-mono font-semibold text-sky-700">01.</p>
                <h3 className="mt-2 text-base font-display font-bold text-slate-900">
                  Cerca e blocca l’auto
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Inserisci date e orari: vedi solo i modelli realmente liberi in flotta con il prezzo finale già calcolato.
                </p>
              </div>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-sm font-mono font-semibold text-sky-700">02.</p>
                <h3 className="mt-2 text-base font-display font-bold text-slate-900">
                  Ritiro rapido con foto
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Carica i documenti online per saltare la coda. Al ritiro verifichiamo l’auto insieme in 3 minuti.
                </p>
              </div>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-sm font-mono font-semibold text-sky-700">03.</p>
                <h3 className="mt-2 text-base font-display font-bold text-slate-900">
                  Guida e rientra sereno
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Assistenza diretta su WhatsApp durante tutto il viaggio e controllo finale trasparente al rientro.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews & Curated Social Feed */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
              Cosa dicono i nostri clienti
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Esperienze reali tra Catania, l’Etna e la costa orientale.
            </p>
          </div>
          <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="font-mono tabular-nums font-bold">5,0 / 5</span>
            <span className="text-slate-500">· Recensioni verificate</span>
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 bg-white border border-slate-200 rounded-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-0.5 text-amber-500" aria-label={`${rev.rating} su 5 stelle`}>
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-amber-500" />
                    ))}
                  </span>
                  <span>{rev.source}</span>
                </div>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">“{rev.text_it}”</p>
              </div>
              <p className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-900">
                {rev.author_name}
              </p>
            </div>
          ))}
        </div>

        {/* Social Feed */}
        {socialPosts.length > 0 && (
          <div className="mt-14">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-display font-bold text-slate-900">
                  Dalla nostra community su Instagram e TikTok
                </h3>
                <p className="text-sm text-slate-600">
                  Consigli di guida in Sicilia, nuovi arrivi in flotta e dietro le quinte.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 hidden sm:inline">
                {settings?.instagram_handle || '@smartrentcarcatania'}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {socialPosts.map((post) => (
                <a
                  key={post.id}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                    <img
                      src={post.thumbnail_url}
                      alt={post.caption}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                      <span>{post.platform}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                    <p className="mt-1 text-xs text-slate-800 line-clamp-2 leading-snug">
                      {post.caption}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* FAQ Preview & Catania Map Strip */}
      <section className="bg-white border-t border-slate-200 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <h2 className="text-2xl font-display font-bold text-slate-900">
              Domande frequenti prima di partire
            </h2>
            <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
              {faqs.map((faq) => (
                <details key={faq.id} className="group py-4">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer text-sm sm:text-base font-semibold text-slate-900 list-none">
                    <span>{faq.question_it}</span>
                    <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg">+</span>
                  </summary>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{faq.answer_it}</p>
                </details>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/faq')}
              className="mt-4 text-sm font-semibold text-sky-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Leggi tutte le FAQ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-sky-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Catania · Coordinate 37.5158, 15.0781
              </p>
              <h3 className="mt-2 text-xl font-display font-bold text-slate-900">
                Ritiro in sede o supporto dedicato
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {settings?.address_it || 'Via Etnea 412, Catania [DA CONFERMARE]'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {settings?.opening_hours_it}
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate('/dove-siamo')}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Mappa e indicazioni
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('whatsapp_click', { location: 'home_map_card' })}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-center text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                Scrivici su WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
