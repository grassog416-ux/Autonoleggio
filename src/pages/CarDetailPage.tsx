import React, { useEffect, useState } from 'react';
import { ArrowLeft, Car, Check, Shield } from 'lucide-react';
import { useRental } from '../context/RentalContext';
import { formatEUR, trackEvent } from '../lib/format';
import type { PriceQuote } from '../types/rental';
import { CarCard } from '../components/CarCard';

export function CarDetailPage({ slug }: { slug: string }) {
  const { data, search, pickupAtIso, dropoffAtIso, navigate } = useRental();
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [imgError, setImgError] = useState(false);

  const model = data?.models.find((m) => m.slug === slug);
  const modelRates = (data?.rates || []).filter(
    (r) => r.model_id === model?.id && !r.season_start,
  );
  const similarModels = (data?.models || [])
    .filter((m) => m.id !== model?.id)
    .slice(0, 3);

  useEffect(() => {
    if (!model) return;
    trackEvent('car_view', { modelId: model.id, name: model.name });
    fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: model.id,
        pickupAt: pickupAtIso,
        dropoffAt: dropoffAtIso,
        pickupLocationId: search.pickupLocationId,
        dropoffLocationId: search.dropoffLocationId,
        driverAge: search.driverAge,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.quote) setQuote(j.quote);
      })
      .catch(() => {});
  }, [model, pickupAtIso, dropoffAtIso, search.pickupLocationId, search.dropoffLocationId, search.driverAge]);

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-96 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-bold text-slate-900">Veicolo non trovato</h1>
        <p className="mt-2 text-sm text-slate-600">
          Il modello richiesto non è più disponibile in catalogo.
        </p>
        <button
          type="button"
          onClick={() => navigate('/auto')}
          className="mt-6 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg"
        >
          Torna alla flotta
        </button>
      </div>
    );
  }

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${model.brand} ${model.name}`,
    description: model.description_it,
    brand: { '@type': 'Brand', name: model.brand },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: ((model.min_daily_price_cents || 3000) / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <button
        type="button"
        onClick={() => navigate('/auto')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Torna al catalogo</span>
      </button>

      {/* Contiguous PDP Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Gallery & Specs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="aspect-[4/3] bg-white border border-slate-200 rounded-xl overflow-hidden">
            {model.images?.[0] && !imgError ? (
              <img
                src={model.images[0]}
                alt={`${model.brand} ${model.name}`}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
                <Car className="w-12 h-12 mb-2" />
                <span className="text-sm">{model.brand} {model.name}</span>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-display font-bold text-slate-900">
              Specifiche e dotazioni incluse
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{model.description_it}</p>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-y border-slate-100 text-sm">
              <div>
                <p className="text-xs text-slate-500">Posti</p>
                <p className="font-semibold text-slate-900 tabular-nums">{model.seats} posti</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Bagagli</p>
                <p className="font-semibold text-slate-900 tabular-nums">{model.bags} valigie</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Porte</p>
                <p className="font-semibold text-slate-900 tabular-nums">{model.doors} porte</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cambio</p>
                <p className="font-semibold text-slate-900">{model.transmission}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Carburante</p>
                <p className="font-semibold text-slate-900">{model.fuel}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Politica carburante</p>
                <p className="font-semibold text-slate-900">{model.fuel_policy_it}</p>
              </div>
            </div>

            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {model.features.map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Duration-based rate table */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-display font-bold text-slate-900">
              Tariffe per durata (IVA 22% inclusa)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Più giorni noleggi, più scende la tariffa giornaliera.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 font-medium">Durata</th>
                    <th className="py-2 font-medium">Tariffa / giorno</th>
                    <th className="py-2 font-medium">Chilometri inclusi</th>
                    <th className="py-2 font-medium text-right">Deposito base</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modelRates.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 font-medium text-slate-900 tabular-nums">
                        {r.max_days >= 365 ? '30+ giorni' : `${r.min_days}–${r.max_days} giorni`}
                      </td>
                      <td className="py-2.5 font-mono font-semibold text-slate-900 tabular-nums">
                        {formatEUR(r.daily_price_cents)}
                      </td>
                      <td className="py-2.5 text-slate-600">{r.km_included}</td>
                      <td className="py-2.5 text-right font-mono text-slate-700 tabular-nums">
                        {formatEUR(r.deposit_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insurance comparison table */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-sky-600" />
              <span>Confronto pacchetti assicurativi</span>
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 font-medium">Copertura</th>
                    <th className="py-2 font-medium">Supplemento</th>
                    <th className="py-2 font-medium">Deposito</th>
                    <th className="py-2 font-medium">Cosa include</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  <tr>
                    <td className="py-3 font-semibold text-slate-900">Base (inclusa)</td>
                    <td className="py-3 font-mono tabular-nums">€0,00/gg</td>
                    <td className="py-3 font-mono tabular-nums">Standard</td>
                    <td className="py-3 text-slate-600">RCA, furto e danni con franchigia contrattuale.</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold text-slate-900">Smart</td>
                    <td className="py-3 font-mono tabular-nums">€12,00/gg</td>
                    <td className="py-3 font-mono tabular-nums">-50%</td>
                    <td className="py-3 text-slate-600">Dimezza deposito e franchigia danni, cristalli inclusi.</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-semibold text-slate-900">Kasko Zero</td>
                    <td className="py-3 font-mono tabular-nums">€22,00/gg</td>
                    <td className="py-3 font-mono tabular-nums">€0,00</td>
                    <td className="py-3 text-slate-600">Zero franchigia su danni/furto e zero deposito cauzionale.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Sticky Purchase / Quote Module */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {model.category_name_it} · {model.fuel}
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-slate-900">
              {model.brand} {model.name}
            </h1>
          </div>

          {quote ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-600">
                  Preventivo per {quote.days} {quote.days === 1 ? 'giorno' : 'giorni'}
                </span>
                <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {formatEUR(quote.total_cents)}
                </span>
              </div>
              <div className="text-xs text-slate-600 flex justify-between">
                <span>Tariffa giornaliera</span>
                <span className="font-mono tabular-nums">{formatEUR(quote.daily_price_cents)}/gg</span>
              </div>
              <div className="text-xs text-slate-600 flex justify-between">
                <span>Chilometraggio</span>
                <span>{quote.km_included}</span>
              </div>
              <div className="text-xs text-slate-600 flex justify-between">
                <span>Deposito base (azzerabile con Kasko)</span>
                <span className="font-mono tabular-nums">{formatEUR(quote.deposit_cents)}</span>
              </div>
              <p className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                IVA 22% inclusa ({formatEUR(quote.vat_included_cents)}) · Cancellazione gratuita fino a 24h prima.
              </p>
            </div>
          ) : (
            <div className="h-28 bg-slate-100 rounded-lg animate-pulse" />
          )}

          <button
            type="button"
            onClick={() => navigate(`/prenota?modelId=${model.id}&step=3`)}
            className="w-full py-3.5 px-5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Prenota questa auto
          </button>

          <p className="text-xs text-center text-slate-500">
            Nessun costo addebitato prima del riepilogo finale.
          </p>
        </aside>
      </div>

      {/* Similar Vehicles */}
      {similarModels.length > 0 && (
        <section className="mt-14 pt-10 border-t border-slate-200">
          <h2 className="text-xl font-display font-bold text-slate-900">Modelli simili in flotta</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {similarModels.map((m) => (
              <CarCard key={m.id} model={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
