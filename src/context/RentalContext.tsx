import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { BootstrapData } from '../types/rental';
import { combineDateTime, getDefaultSearchDates } from '../lib/format';

export interface SearchState {
  pickupLocationId: string;
  dropoffLocationId: string;
  sameLocation: boolean;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  driverAge: number;
}

interface RentalContextValue {
  data: BootstrapData | null;
  loading: boolean;
  error: string | null;
  refreshBootstrap: () => Promise<void>;
  route: string;
  navigate: (to: string) => void;
  search: SearchState;
  setSearch: React.Dispatch<React.SetStateAction<SearchState>>;
  pickupAtIso: string;
  dropoffAtIso: string;
}

const RentalContext = createContext<RentalContextValue | null>(null);

export function RentalProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/',
  );

  const defaults = getDefaultSearchDates();
  const [search, setSearch] = useState<SearchState>({
    pickupLocationId: 'loc-catania-centro',
    dropoffLocationId: 'loc-catania-centro',
    sameLocation: true,
    pickupDate: defaults.pickupDate,
    pickupTime: defaults.pickupTime,
    dropoffDate: defaults.dropoffDate,
    dropoffTime: defaults.dropoffTime,
    driverAge: 28,
  });

  const refreshBootstrap = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('Errore nel caricamento dati.');
      const json: BootstrapData = await res.json();
      setData(json);
      if (json.locations.length > 0) {
        setSearch((prev) => ({
          ...prev,
          pickupLocationId: json.locations.some((l) => l.id === prev.pickupLocationId)
            ? prev.pickupLocationId
            : json.locations[0].id,
          dropoffLocationId: json.locations.some((l) => l.id === prev.dropoffLocationId)
            ? prev.dropoffLocationId
            : json.locations[0].id,
        }));
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Impossibile connettersi al server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  useEffect(() => {
    const onPop = () => {
      setRoute(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname + window.location.search) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', to);
    setRoute(to);
    window.scrollTo({ top: 0 });
  }, []);

  const pickupAtIso = combineDateTime(search.pickupDate, search.pickupTime);
  const dropoffAtIso = combineDateTime(search.dropoffDate, search.dropoffTime);

  return (
    <RentalContext.Provider
      value={{
        data,
        loading,
        error,
        refreshBootstrap,
        route,
        navigate,
        search,
        setSearch,
        pickupAtIso,
        dropoffAtIso,
      }}
    >
      {children}
    </RentalContext.Provider>
  );
}

export function useRental() {
  const ctx = useContext(RentalContext);
  if (!ctx) throw new Error('useRental must be used inside RentalProvider');
  return ctx;
}
