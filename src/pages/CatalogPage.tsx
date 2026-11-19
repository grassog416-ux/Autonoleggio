import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useRental } from '../context/RentalContext';
import { SearchWidget } from '../components/SearchWidget';
import { CarCard } from '../components/CarCard';
import type { AvailableModelResult } from '../types/rental';
import { buildWhatsAppUrl } from '../lib/format';

export function CatalogPage() {
  const { data, search, pickupAtIso, dropoffAtIso, navigate } = useRental();
  const [availability, setAvailability] = useState<AvailableModelResult[] | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);

  // Filters
  const [categorySlug, setCategorySlug] = useState('all');
  const [transmission, setTransmission] = useState('all');
  const [fuel, setFuel] = useState('all');
  const [minSeats, setMinSeats] = useState(0);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc'>('price_asc');

  const fetchAvailability = async () => {
    setLoadingAvail(true);
    setAvailError(null);
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
      if (!res.ok) throw new Error(json.error || 'Errore verifica disponibilità');
      setAvailability(json.available);
    } catch (err: any) {
      setAvailError(err.message);
    } finally {
      setLoadingAvail(false);
    }
  };

  useEffect(() => {
    if (data) {
      fetchAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pickupAtIso, dropoffAtIso, search.pickupLocationId, search.dropoffLocationId, search.driverAge]);

  const categories = data?.categories || [];

  const filteredItems = useMemo(() => {
    if (!availability) return [];
    const list = availability.filter((item) => {
      const m = item.model;
      if (categorySlug !== 'all' && m.category_slug !== categorySlug) return false;
      if (transmission !== 'all' && m.transmission !== transmission) return false;
      if (fuel !== 'all' && m.fuel !== fuel) return false;
      if (minSeats > 0 && m.seats < minSeats) return false;
      return true;
    });

    list.sort((a, b) =>
      sortBy === 'price_asc'
        ? a.quote.total_cents - b.quote.total_cents
        : b.quote.total_cents - a.quote.total_cents,
    );
    return list;
  }, [availability, categorySlug, transmission, fuel, minSeats, sortBy]);

  const whatsappUrl = buildWhatsAppUrl(
    data?.settings.whatsapp || '+393400000000',
    `Ciao, cerco un’auto a Catania dal ${search.pickupDate} al ${search.dropoffDate}.`,
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div>
        <h1 className="text-2xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight">
          Flotta disponibile a Catania
        </h1>
        <p className="mt-1 text-sm sm:text-base text-slate-600">
          Prezzi calcolati sulle date selezionate, con IVA 22% inclusa e zero costi nascosti.
        </p>
      </div>

      <div className="mt-6">
        <SearchWidget onSubmit={fetchAvailability} compact />
      </div>

      {/* Filters Toolbar */}
      <div className="mt-6 bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="flt-cat" className="block text-[11px] font-medium text-slate-500 mb-1">
              Categoria
            </label>
            <select
              id="flt-cat"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="h-9 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="all">Tutte le categorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name_it}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="flt-trans" className="block text-[11px] font-medium text-slate-500 mb-1">
              Cambio
            </label>
            <select
              id="flt-trans"
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              className="h-9 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="all">Manuale e Automatico</option>
              <option value="Manuale">Solo Manuale</option>
              <option value="Automatico">Solo Automatico</option>
            </select>
          </div>

          <div>
            <label htmlFor="flt-fuel" className="block text-[11px] font-medium text-slate-500 mb-1">
              Carburante
            </label>
            <select
              id="flt-fuel"
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              className="h-9 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="all">Tutti</option>
              <option value="Ibrida">Ibrida</option>
              <option value="Diesel">Diesel</option>
              <option value="Benzina">Benzina</option>
            </select>
          </div>

          <div>
            <label htmlFor="flt-seats" className="block text-[11px] font-medium text-slate-500 mb-1">
              Posti minimi
            </label>
            <select
              id="flt-seats"
              value={minSeats}
              onChange={(e) => setMinSeats(Number(e.target.value))}
              className="h-9 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value={0}>Qualsiasi</option>
              <option value={4}>4+ posti</option>
              <option value={5}>5+ posti</option>
              <option value={9}>9 posti (Minivan)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="flt-sort" className="block text-[11px] font-medium text-slate-500 mb-1">
            Ordina per
          </label>
          <select
            id="flt-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'price_asc' | 'price_desc')}
            className="h-9 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          >
            <option value="price_asc">Prezzo più basso</option>
            <option value="price_desc">Prezzo più alto</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loadingAvail && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-96 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loadingAvail && availError && (
        <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
          {availError}
        </div>
      )}

      {!loadingAvail && !availError && filteredItems.length === 0 && (
        <div className="mt-8 p-8 bg-white border border-slate-200 rounded-xl text-center max-w-xl mx-auto">
          <p className="text-base font-semibold text-slate-900">
            Nessuna auto disponibile per queste date. Prova a cambiare giorno o contattaci.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Potremmo avere disponibilità su richiesta o consegne personalizzate in giornata.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCategorySlug('all');
                setTransmission('all');
                setFuel('all');
                setMinSeats(0);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Reimposta filtri
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Scrivici su WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {!loadingAvail && !availError && filteredItems.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <CarCard
              key={item.model.id}
              model={item.model}
              quote={item.quote}
              freeUnitsCount={item.free_units_count}
              onSelectBook={(modelId) => navigate(`/prenota?modelId=${modelId}&step=3`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
