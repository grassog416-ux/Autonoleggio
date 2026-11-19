import React from 'react';
import { Calendar, MapPin, Search, UserCheck } from 'lucide-react';
import { useRental } from '../context/RentalContext';
import { useI18n } from '../i18n';
import { trackEvent } from '../lib/format';

interface SearchWidgetProps {
  onSubmit?: () => void;
  compact?: boolean;
}

const TIME_OPTIONS = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];

export function SearchWidget({ onSubmit, compact = false }: SearchWidgetProps) {
  const { data, search, setSearch, navigate } = useRental();
  const { t } = useI18n();

  const locations = data?.locations || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('search', {
      pickupLocationId: search.pickupLocationId,
      pickupDate: search.pickupDate,
      dropoffDate: search.dropoffDate,
      driverAge: search.driverAge,
    });
    if (onSubmit) {
      onSubmit();
    } else {
      navigate('/auto?cerca=1');
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className={`bg-white border border-slate-200 rounded-xl shadow-sm ${
        compact ? 'p-4' : 'p-4 sm:p-6'
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-end">
        {/* Luogo ritiro */}
        <div className={search.sameLocation ? 'lg:col-span-3' : 'lg:col-span-2'}>
          <label
            htmlFor="search-pickup-loc"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            {t.search.pickupLocation}
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="search-pickup-loc"
              value={search.pickupLocationId}
              onChange={(e) => {
                const val = e.target.value;
                setSearch((prev) => ({
                  ...prev,
                  pickupLocationId: val,
                  dropoffLocationId: prev.sameLocation ? val : prev.dropoffLocationId,
                }));
              }}
              className="w-full h-11 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name.replace(' [DA CONFERMARE]', '')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!search.sameLocation && (
          <div className="lg:col-span-2">
            <label
              htmlFor="search-dropoff-loc"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              {t.search.dropoffLocation}
            </label>
            <select
              id="search-dropoff-loc"
              value={search.dropoffLocationId}
              onChange={(e) => setSearch((prev) => ({ ...prev, dropoffLocationId: e.target.value }))}
              className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name.replace(' [DA CONFERMARE]', '')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Data & Ora ritiro */}
        <div className="lg:col-span-3 grid grid-cols-5 gap-2">
          <div className="col-span-3">
            <label
              htmlFor="search-pickup-date"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              {t.search.pickupDate}
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block" />
              <input
                id="search-pickup-date"
                type="date"
                required
                value={search.pickupDate}
                onChange={(e) => setSearch((prev) => ({ ...prev, pickupDate: e.target.value }))}
                className="w-full h-11 sm:pl-8 px-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
          </div>
          <div className="col-span-2">
            <label
              htmlFor="search-pickup-time"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              {t.search.pickupTime}
            </label>
            <select
              id="search-pickup-time"
              value={search.pickupTime}
              onChange={(e) => setSearch((prev) => ({ ...prev, pickupTime: e.target.value }))}
              className="w-full h-11 px-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              {TIME_OPTIONS.map((tm) => (
                <option key={tm} value={tm}>
                  {tm}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data & Ora riconsegna */}
        <div className="lg:col-span-3 grid grid-cols-5 gap-2">
          <div className="col-span-3">
            <label
              htmlFor="search-dropoff-date"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              {t.search.dropoffDate}
            </label>
            <input
              id="search-dropoff-date"
              type="date"
              required
              value={search.dropoffDate}
              min={search.pickupDate}
              onChange={(e) => setSearch((prev) => ({ ...prev, dropoffDate: e.target.value }))}
              className="w-full h-11 px-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>
          <div className="col-span-2">
            <label
              htmlFor="search-dropoff-time"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              {t.search.dropoffTime}
            </label>
            <select
              id="search-dropoff-time"
              value={search.dropoffTime}
              onChange={(e) => setSearch((prev) => ({ ...prev, dropoffTime: e.target.value }))}
              className="w-full h-11 px-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              {TIME_OPTIONS.map((tm) => (
                <option key={tm} value={tm}>
                  {tm}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Età + CTA */}
        <div
          className={`${
            search.sameLocation ? 'lg:col-span-3' : 'lg:col-span-2'
          } flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2`}
        >
          <div className="flex-1">
            <label
              htmlFor="search-driver-age"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              {t.search.driverAge}
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="search-driver-age"
                value={search.driverAge >= 25 ? '28' : '22'}
                onChange={(e) =>
                  setSearch((prev) => ({ ...prev, driverAge: Number(e.target.value) }))
                }
                className="w-full h-11 pl-8 pr-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              >
                <option value="28">25+ anni</option>
                <option value="22">21–24 anni</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="h-11 px-5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 self-end transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-600"
          >
            <Search className="w-4 h-4" />
            <span>{t.hero.searchCta}</span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={search.sameLocation}
            onChange={(e) =>
              setSearch((prev) => ({
                ...prev,
                sameLocation: e.target.checked,
                dropoffLocationId: e.target.checked ? prev.pickupLocationId : prev.dropoffLocationId,
              }))
            }
            className="rounded border-slate-300 text-sky-600 focus:ring-sky-600"
          />
          <span>{t.search.sameLocation}</span>
        </label>
        <span className="text-slate-500">
          30 min di tolleranza al rientro · IVA 22% sempre inclusa
        </span>
      </div>
    </form>
  );
}
