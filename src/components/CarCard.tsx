import React, { useState } from 'react';
import { Car } from 'lucide-react';
import type { PriceQuote, VehicleModel } from '../types/rental';
import { formatEUR } from '../lib/format';
import { useRental } from '../context/RentalContext';

interface CarCardProps {
  model: VehicleModel;
  quote?: PriceQuote;
  freeUnitsCount?: number;
  onSelectBook?: (modelId: string) => void;
}

export function CarCard({ model, quote, freeUnitsCount, onSelectBook }: CarCardProps) {
  const { navigate } = useRental();
  const [imgError, setImgError] = useState(false);

  const imageSrc = model.images?.[0];
  const dailyCents = quote ? quote.daily_price_cents : model.min_daily_price_cents || 3000;

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* 4:3 Media Container with zero-broken-image fallback */}
      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
        {imageSrc && !imgError ? (
          <img
            src={imageSrc}
            alt={`${model.brand} ${model.name}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4">
            <Car className="w-10 h-10 mb-2" />
            <span className="text-xs font-medium text-slate-500">
              {model.brand} {model.name}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Clean unboxed metadata (Zero-Pill rule) */}
        <p className="text-xs text-slate-500 font-medium">
          {model.category_name_it || 'Auto'}
          <span aria-hidden="true"> · </span>
          {model.fuel}
          {typeof freeUnitsCount === 'number' && (
            <>
              <span aria-hidden="true"> · </span>
              <span className="text-emerald-700 font-semibold">
                {freeUnitsCount} {freeUnitsCount === 1 ? 'disponibile' : 'disponibili'}
              </span>
            </>
          )}
        </p>

        <h3 className="mt-1 text-lg font-display font-bold text-slate-900">
          {model.brand} {model.name}
        </h3>

        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
          {model.seats} posti · {model.bags} valigie · {model.doors} porte · {model.transmission}
          {model.has_ac ? ' · Clima' : ''}
        </p>

        <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">
              {quote ? `Totale ${quote.days} ${quote.days === 1 ? 'giorno' : 'giorni'}` : 'Tariffa a partire da'}
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {quote ? formatEUR(quote.total_cents) : `${formatEUR(dailyCents)}/gg`}
            </p>
            <p className="text-[11px] text-slate-500">
              {quote
                ? `${formatEUR(quote.daily_price_cents)}/gg · ${quote.km_included} · IVA incl.`
                : 'IVA inclusa · Cancellazione gratuita 24h'}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                onSelectBook ? onSelectBook(model.id) : navigate(`/prenota?modelId=${model.id}`)
              }
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors whitespace-nowrap"
            >
              Prenota
            </button>
            <button
              type="button"
              onClick={() => navigate(`/auto/${model.slug}`)}
              className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 whitespace-nowrap"
            >
              Dettagli
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
