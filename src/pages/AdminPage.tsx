import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Camera,
  Car,
  Download,
  FileText,
  LayoutDashboard,
  Lock,
  Plus,
  Settings,
  Tag,
  Trash2,
} from 'lucide-react';
import type {
  BlockedDateItem,
  BookingRecord,
  BookingStatus,
  ExtraItem,
  FaqItem,
  LeadItem,
  LocationItem,
  PaymentMode,
  PaymentStatus,
  PromoCode,
  RateTier,
  ReviewItem,
  SiteSettings,
  VehicleCategory,
  VehicleModel,
  VehicleUnit,
} from '../types/rental';
import { formatDateTimeIT, formatEUR } from '../lib/format';
import { useI18n } from '../i18n';
import { useRental } from '../context/RentalContext';

interface AdminOverviewData {
  settings: SiteSettings;
  locations: LocationItem[];
  categories: VehicleCategory[];
  models: VehicleModel[];
  vehicles: VehicleUnit[];
  rates: RateTier[];
  extras: ExtraItem[];
  promoCodes: PromoCode[];
  bookings: BookingRecord[];
  blockedDates: BlockedDateItem[];
  reviews: ReviewItem[];
  faqs: FaqItem[];
  leads: LeadItem[];
}

type AdminTab = 'overview' | 'bookings' | 'calendar' | 'fleet' | 'promos' | 'settings';

export function AdminPage() {
  const { refreshBootstrap } = useRental();
  const { t } = useI18n();

  const [token, setToken] = useState<string>(() =>
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('src_admin_token') || '' : '',
  );
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Filters & Modals
  const [bookingFilter, setBookingFilter] = useState<string>('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [inspectionTarget, setInspectionTarget] = useState<{
    booking: BookingRecord;
    type: 'checkin' | 'checkout';
  } | null>(null);
  const [insFuel, setInsFuel] = useState('8/8');
  const [insMileage, setInsMileage] = useState(15000);
  const [insNotes, setInsNotes] = useState('');
  const [insPhotos, setInsPhotos] = useState<string[]>([]);

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manModelId, setManModelId] = useState('mod-panda');
  const [manFirst, setManFirst] = useState('');
  const [manLast, setManLast] = useState('');
  const [manPhone, setManPhone] = useState('');
  const [manEmail, setManEmail] = useState('');
  const [manPickup, setManPickup] = useState(() => new Date().toISOString().slice(0, 16));
  const [manDropoff, setManDropoff] = useState(() =>
    new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16),
  );

  // Forms for calendar block, vehicle, model, extra, promo, faq, settings
  const [blkVehicleId, setBlkVehicleId] = useState('');
  const [blkStart, setBlkStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [blkEnd, setBlkEnd] = useState(() =>
    new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
  );
  const [blkReason, setBlkReason] = useState('Manutenzione programmata');

  const [newUnitModel, setNewUnitModel] = useState('mod-panda');
  const [newUnitPlate, setNewUnitPlate] = useState('');
  const [newUnitColor, setNewUnitColor] = useState('Bianco');
  const [newUnitKm, setNewUnitKm] = useState(5000);

  const [newModelBrand, setNewModelBrand] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelCat, setNewModelCat] = useState('cat-city-car');
  const [newModelPriceEur, setNewModelPriceEur] = useState(38);

  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPriceEur, setNewExtraPriceEur] = useState(5);
  const [newExtraType, setNewExtraType] = useState<'per_day' | 'one_time'>('per_day');

  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoType, setNewPromoType] = useState<'percent' | 'fixed'>('percent');
  const [newPromoVal, setNewPromoVal] = useState(10);

  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  const [settingsForm, setSettingsForm] = useState<SiteSettings | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token],
  );

  const fetchOverview = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setToken('');
        sessionStorage.removeItem('src_admin_token');
        return;
      }
      const j: AdminOverviewData = await res.json();
      setOverview(j);
      setSettingsForm(j.settings);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const j = await res.json();
    if (!res.ok) {
      setLoginError(j.error || 'Accesso negato.');
      return;
    }
    sessionStorage.setItem('src_admin_token', j.token);
    setToken(j.token);
  };

  const todayYMD = new Date().toISOString().slice(0, 10);

  const kpis = useMemo(() => {
    if (!overview) return { pickupsToday: 0, returnsToday: 0, active: 0, revenueCents: 0 };
    const bookings = overview.bookings;
    return {
      pickupsToday: bookings.filter(
        (b) => b.pickup_at.slice(0, 10) === todayYMD && b.status !== 'cancelled',
      ).length,
      returnsToday: bookings.filter(
        (b) => b.dropoff_at.slice(0, 10) === todayYMD && b.status !== 'cancelled',
      ).length,
      active: bookings.filter((b) => b.status === 'active' || b.status === 'confirmed').length,
      revenueCents: bookings
        .filter((b) => b.status !== 'cancelled')
        .reduce((acc, b) => acc + b.total_cents, 0),
    };
  }, [overview, todayYMD]);

  const updateBooking = async (
    id: string,
    patch: { status?: BookingStatus; payment_status?: PaymentStatus; vehicle_id?: string },
  ) => {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    const j = await res.json();
    if (!res.ok) {
      notify(j.error || 'Errore aggiornamento');
      return;
    }
    notify('Prenotazione aggiornata');
    fetchOverview();
  };

  const handleInspectionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    files.forEach((f) => {
      const r = new FileReader();
      r.onload = () => {
        if (typeof r.result === 'string') {
          setInsPhotos((prev) => [...prev, r.result as string]);
        }
      };
      r.readAsDataURL(f);
    });
  };

  const submitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionTarget) return;
    await fetch(`/api/admin/bookings/${inspectionTarget.booking.id}/inspections`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        type: inspectionTarget.type,
        photos: insPhotos,
        notes: insNotes,
        fuel_level: insFuel,
        mileage: insMileage,
      }),
    });
    setInspectionTarget(null);
    setInsPhotos([]);
    setInsNotes('');
    notify('Verbale ispezione salvato');
    fetchOverview();
  };

  const submitManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: manModelId,
        pickupLocationId: overview?.locations[0]?.id || 'loc-catania-centro',
        dropoffLocationId: overview?.locations[0]?.id || 'loc-catania-centro',
        pickupAt: `${manPickup}:00`,
        dropoffAt: `${manDropoff}:00`,
        driverAge: 30,
        insurancePlan: 'base',
        extrasSelection: [],
        notes: 'Prenotazione inserita manualmente da banco/telefono',
        customer: {
          firstName: manFirst,
          lastName: manLast,
          email: manEmail || 'cliente.banco@smartrentcarcatania.it',
          phone: manPhone,
          birthDate: '1990-01-01',
          licenceNumber: 'BANCO001',
          licenceIssueDate: '2015-01-01',
          marketingConsent: false,
        },
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      notify(j.error || 'Errore inserimento');
      return;
    }
    setManualModalOpen(false);
    setManFirst('');
    setManLast('');
    setManPhone('');
    setManEmail('');
    notify(`Prenotazione manuale ${j.booking.code} creata`);
    fetchOverview();
  };

  const downloadCsv = async () => {
    const res = await fetch('/api/admin/bookings.csv', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prenotazioni-smartrent-catania.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <form
          onSubmit={handleLogin}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-slate-900">
            <Lock className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-display font-bold">Area Gestione Titolare</h1>
          </div>
          <p className="text-xs text-slate-600">
            Accedi per gestire flotta, tariffe, prenotazioni, check-in fotografici e impostazioni.
          </p>
          <div>
            <label htmlFor="adm-pwd" className="block text-xs font-medium text-slate-700 mb-1">
              Password amministratore
            </label>
            <input
              id="adm-pwd"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
          {loginError && <p className="text-xs text-red-700">{loginError}</p>}
          <button
            type="submit"
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
          >
            Accedi al back office
          </button>
          <button
            type="button"
            onClick={() => setPassword('catania-admin-2026')}
            className="w-full text-xs text-sky-700 hover:underline"
          >
            Usa password demo (catania-admin-2026)
          </button>
        </form>
      </div>
    );
  }

  const ganttDays = Array.from({ length: 14 }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx - 1);
    return d.toISOString().slice(0, 10);
  });

  const filteredBookings = (overview?.bookings || []).filter((b) => {
    if (bookingFilter !== 'all' && b.status !== bookingFilter) return false;
    if (
      bookingSearch &&
      !`${b.code} ${b.customer_name} ${b.vehicle_plate} ${b.model_name}`
        .toLowerCase()
        .includes(bookingSearch.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-4 shrink-0">
        <p className="text-xs font-semibold text-slate-500 px-3 mb-2">Back Office Catania</p>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto">
          {[
            { id: 'overview' as AdminTab, label: 'Panoramica', icon: LayoutDashboard },
            { id: 'bookings' as AdminTab, label: 'Prenotazioni', icon: FileText },
            { id: 'calendar' as AdminTab, label: 'Calendario flotta', icon: Calendar },
            { id: 'fleet' as AdminTab, label: 'Flotta e tariffe', icon: Car },
            { id: 'promos' as AdminTab, label: 'Extra e promo', icon: Tag },
            { id: 'settings' as AdminTab, label: 'Impostazioni e FAQ', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-sky-50 text-sky-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:block mt-8 pt-4 border-t border-slate-200 px-3">
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('src_admin_token');
              setToken('');
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            Esci dal pannello
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-lg">
            {toast}
          </div>
        )}

        {loading && !overview && (
          <div className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
        )}

        {/* TAB 1: OVERVIEW */}
        {overview && tab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-display font-bold text-slate-900">
                  Panoramica operativa
                </h1>
                <p className="text-xs text-slate-500">
                  Aggiornato in tempo reale · {overview.vehicles.length} targhe in flotta
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Nuova prenotazione da banco</span>
              </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Consegne di oggi</p>
                <p className="mt-1 text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {kpis.pickupsToday}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Rientri di oggi</p>
                <p className="mt-1 text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {kpis.returnsToday}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Prenotazioni attive/confermate</p>
                <p className="mt-1 text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {kpis.active}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Volume prenotazioni</p>
                <p className="mt-1 text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {formatEUR(kpis.revenueCents)}
                </p>
              </div>
            </div>

            {/* Leads preview */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-base font-display font-bold text-slate-900 mb-3">
                Richieste e preventivi lungo termine ({overview.leads.length})
              </h2>
              {overview.leads.length === 0 ? (
                <p className="text-xs text-slate-500">Nessuna richiesta ricevuta finora.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {overview.leads.slice(0, 6).map((lead) => (
                    <div
                      key={lead.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {lead.name} ·{' '}
                          <span className="text-sky-700">
                            {lead.type === 'long_term' ? 'Lungo termine' : 'Contatto'}
                          </span>
                        </p>
                        <p className="text-slate-600 mt-0.5">{lead.message}</p>
                        <p className="text-slate-400 mt-0.5">
                          {lead.email} · {lead.phone}
                        </p>
                      </div>
                      <select
                        value={lead.status}
                        onChange={async (e) => {
                          await fetch(`/api/admin/leads/${lead.id}`, {
                            method: 'PATCH',
                            headers: authHeaders(),
                            body: JSON.stringify({ status: e.target.value }),
                          });
                          fetchOverview();
                        }}
                        className="h-8 px-2 bg-slate-50 border border-slate-200 rounded text-xs"
                      >
                        <option value="new">Nuovo</option>
                        <option value="contacted">Contattato</option>
                        <option value="closed">Chiuso</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BOOKINGS */}
        {overview && tab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-display font-bold text-slate-900">Prenotazioni</h1>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={downloadCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Esporta CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManualModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Inserisci da telefono</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                type="search"
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                placeholder="Cerca codice, cliente o targa..."
                className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg w-64"
              />
              <select
                value={bookingFilter}
                onChange={(e) => setBookingFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg"
              >
                <option value="all">Tutti gli stati</option>
                <option value="pending">In attesa</option>
                <option value="confirmed">Confermate</option>
                <option value="active">In corso</option>
                <option value="completed">Completate</option>
                <option value="cancelled">Annullate</option>
              </select>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-3 px-4 font-medium">Codice & Cliente</th>
                    <th className="py-3 px-4 font-medium">Modello & Targa</th>
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">Stato</th>
                    <th className="py-3 px-4 font-medium text-right">Totale</th>
                    <th className="py-3 px-4 font-medium text-right">Ispezione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => {
                    const modelUnits = overview.vehicles.filter((v) => v.model_id === b.model_id);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <p className="font-mono font-bold text-slate-900">{b.code}</p>
                          <p className="text-slate-700 font-medium">{b.customer_name}</p>
                          <p className="text-slate-400">{b.customer_phone}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{b.model_name}</p>
                          <select
                            aria-label="Assegna targa"
                            value={b.vehicle_id}
                            onChange={(e) => updateBooking(b.id, { vehicle_id: e.target.value })}
                            className="mt-1 h-7 px-2 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded"
                          >
                            {modelUnits.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.plate} ({u.color})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 tabular-nums text-slate-600">
                          <p>In: {formatDateTimeIT(b.pickup_at)}</p>
                          <p>Out: {formatDateTimeIT(b.dropoff_at)}</p>
                        </td>
                        <td className="py-3 px-4 space-y-1">
                          <select
                            value={b.status}
                            onChange={(e) =>
                              updateBooking(b.id, { status: e.target.value as BookingStatus })
                            }
                            className="h-7 px-2 text-[11px] font-medium bg-slate-50 border border-slate-200 rounded block"
                          >
                            {(['pending', 'confirmed', 'active', 'completed', 'cancelled', 'no_show'] as BookingStatus[]).map(
                              (st) => (
                                <option key={st} value={st}>
                                  {t.statuses[st]}
                                </option>
                              ),
                            )}
                          </select>
                          <select
                            value={b.payment_status}
                            onChange={(e) =>
                              updateBooking(b.id, {
                                payment_status: e.target.value as PaymentStatus,
                              })
                            }
                            className="h-7 px-2 text-[11px] bg-slate-50 border border-slate-200 rounded block"
                          >
                            <option value="unpaid">Da saldare</option>
                            <option value="deposit_paid">Acconto versato</option>
                            <option value="paid">Saldato</option>
                            <option value="refunded">Rimborsato</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatEUR(b.total_cents)}
                        </td>
                        <td className="py-3 px-4 text-right space-y-1">
                          <button
                            type="button"
                            onClick={() =>
                              setInspectionTarget({ booking: b, type: 'checkin' })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-sky-800 bg-sky-50 hover:bg-sky-100 rounded"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Check-in</span>
                          </button>
                          <br />
                          <button
                            type="button"
                            onClick={() =>
                              setInspectionTarget({ booking: b, type: 'checkout' })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Check-out</span>
                          </button>
                          {b.inspections && b.inspections.length > 0 && (
                            <p className="text-[10px] text-emerald-700">
                              {b.inspections.length} verbali salvati
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CALENDAR GANTT & BLOCKS */}
        {overview && tab === 'calendar' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-display font-bold text-slate-900">
              Calendario flotta per targa (14 giorni)
            </h1>

            {/* Block dates form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await fetch('/api/admin/blocked-dates', {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({
                    vehicle_id: blkVehicleId || null,
                    start_at: `${blkStart}T00:00:00`,
                    end_at: `${blkEnd}T23:59:59`,
                    reason: blkReason,
                  }),
                });
                notify('Blocco calendario salvato');
                fetchOverview();
              }}
              className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
            >
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Veicolo / Targa
                </label>
                <select
                  value={blkVehicleId}
                  onChange={(e) => setBlkVehicleId(e.target.value)}
                  className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Tutta la flotta (chiusura)</option>
                  {overview.vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} · {v.model_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Dal</label>
                <input
                  type="date"
                  value={blkStart}
                  onChange={(e) => setBlkStart(e.target.value)}
                  className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Al</label>
                <input
                  type="date"
                  value={blkEnd}
                  onChange={(e) => setBlkEnd(e.target.value)}
                  className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Motivo</label>
                <input
                  value={blkReason}
                  onChange={(e) => setBlkReason(e.target.value)}
                  className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="h-9 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Blocca date
              </button>
            </form>

            {/* Gantt Grid */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 min-w-[160px]">
                      Targa & Modello
                    </th>
                    {ganttDays.map((day) => (
                      <th
                        key={day}
                        className={`py-2 px-1 text-center font-mono ${
                          day === todayYMD ? 'bg-sky-50 text-sky-800 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {day.slice(5)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.vehicles.map((v) => (
                    <tr key={v.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        <span className="font-mono font-bold">{v.plate}</span>
                        <span className="block text-[10px] text-slate-500">{v.model_name}</span>
                      </td>
                      {ganttDays.map((day) => {
                        const dayStart = new Date(`${day}T00:00:00`).getTime();
                        const dayEnd = new Date(`${day}T23:59:59`).getTime();
                        const booking = overview.bookings.find(
                          (b) =>
                            b.vehicle_id === v.id &&
                            b.status !== 'cancelled' &&
                            new Date(b.pickup_at).getTime() <= dayEnd &&
                            new Date(b.dropoff_at).getTime() >= dayStart,
                        );
                        const blocked = overview.blockedDates.find(
                          (blk) =>
                            (!blk.vehicle_id || blk.vehicle_id === v.id) &&
                            new Date(blk.start_at).getTime() <= dayEnd &&
                            new Date(blk.end_at).getTime() >= dayStart,
                        );

                        return (
                          <td key={day} className="p-1 border-l border-slate-100 text-center">
                            {booking ? (
                              <div
                                title={`${booking.code} · ${booking.customer_name}`}
                                className="h-6 rounded bg-sky-600 text-white font-mono text-[9px] flex items-center justify-center px-1 truncate"
                              >
                                {booking.code.slice(-4)}
                              </div>
                            ) : blocked ? (
                              <div
                                title={blocked.reason}
                                className="h-6 rounded bg-amber-200 text-amber-900 text-[9px] flex items-center justify-center"
                              >
                                Blocco
                              </div>
                            ) : (
                              <div className="h-6 rounded bg-slate-50" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {overview.blockedDates.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-900">Blocchi attivi</p>
                {overview.blockedDates.map((blk) => (
                  <div key={blk.id} className="flex items-center justify-between text-xs py-1">
                    <span>
                      {blk.start_at.slice(0, 10)} → {blk.end_at.slice(0, 10)} · {blk.reason}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/blocked-dates/${blk.id}`, {
                          method: 'DELETE',
                          headers: authHeaders(),
                        });
                        fetchOverview();
                      }}
                      className="text-red-700 hover:underline"
                    >
                      Rimuovi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FLEET & RATES */}
        {overview && tab === 'fleet' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-display font-bold text-slate-900">Flotta e tariffe</h1>

            {/* Add New Model */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await fetch('/api/admin/models', {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({
                    category_id: newModelCat,
                    brand: newModelBrand,
                    name: newModelName,
                    daily_price_cents: Math.round(newModelPriceEur * 100),
                  }),
                });
                setNewModelBrand('');
                setNewModelName('');
                notify('Modello aggiunto al catalogo');
                fetchOverview();
                refreshBootstrap();
              }}
              className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
            >
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Categoria</label>
                <select
                  value={newModelCat}
                  onChange={(e) => setNewModelCat(e.target.value)}
                  className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {overview.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_it}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Marca</label>
                <input
                  required
                  value={newModelBrand}
                  onChange={(e) => setNewModelBrand(e.target.value)}
                  placeholder="Es. Lancia"
                  className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Modello</label>
                <input
                  required
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="Es. Ypsilon Hybrid"
                  className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Tariffa 1-2 gg (€)</label>
                <input
                  type="number"
                  min={15}
                  value={newModelPriceEur}
                  onChange={(e) => setNewModelPriceEur(Number(e.target.value))}
                  className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <button
                type="submit"
                className="h-9 px-4 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
              >
                Aggiungi modello
              </button>
            </form>

            {/* Add Concrete Vehicle Plate */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch('/api/admin/vehicles', {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({
                    model_id: newUnitModel,
                    plate: newUnitPlate,
                    color: newUnitColor,
                    mileage: newUnitKm,
                  }),
                });
                const j = await res.json();
                if (!res.ok) {
                  notify(j.error || 'Errore');
                  return;
                }
                setNewUnitPlate('');
                notify('Targa aggiunta alla flotta');
                fetchOverview();
              }}
              className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
            >
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Modello</label>
                <select
                  value={newUnitModel}
                  onChange={(e) => setNewUnitModel(e.target.value)}
                  className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {overview.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.brand} {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Targa *</label>
                <input
                  required
                  value={newUnitPlate}
                  onChange={(e) => setNewUnitPlate(e.target.value)}
                  placeholder="GS999CT"
                  className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Colore</label>
                <input
                  value={newUnitColor}
                  onChange={(e) => setNewUnitColor(e.target.value)}
                  className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Km attuali</label>
                <input
                  type="number"
                  value={newUnitKm}
                  onChange={(e) => setNewUnitKm(Number(e.target.value))}
                  className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <button
                type="submit"
                className="h-9 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Aggiungi targa
              </button>
            </form>

            {/* Vehicles Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Targa</th>
                    <th className="py-2.5 px-4 font-medium">Modello</th>
                    <th className="py-2.5 px-4 font-medium">Colore</th>
                    <th className="py-2.5 px-4 font-medium">Km</th>
                    <th className="py-2.5 px-4 font-medium">Scad. Assic. / Tagliando</th>
                    <th className="py-2.5 px-4 font-medium">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.vehicles.map((v) => (
                    <tr key={v.id}>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{v.plate}</td>
                      <td className="py-2.5 px-4 font-medium">{v.model_name}</td>
                      <td className="py-2.5 px-4 text-slate-600">{v.color}</td>
                      <td className="py-2.5 px-4 font-mono tabular-nums">{v.mileage} km</td>
                      <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                        {v.insurance_expiry} / {v.service_due}
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          value={v.status}
                          onChange={async (e) => {
                            await fetch(`/api/admin/vehicles/${v.id}`, {
                              method: 'PATCH',
                              headers: authHeaders(),
                              body: JSON.stringify({ status: e.target.value }),
                            });
                            notify('Stato targa aggiornato');
                            fetchOverview();
                          }}
                          className="h-7 px-2 text-xs bg-slate-50 border border-slate-200 rounded"
                        >
                          <option value="available">Disponibile</option>
                          <option value="maintenance">Manutenzione</option>
                          <option value="retired">Dismessa</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rates Editor */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h2 className="text-base font-display font-bold text-slate-900">
                Listino tariffe per fascia durata
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2">Modello</th>
                      <th className="py-2">Stagione</th>
                      <th className="py-2">Giorni</th>
                      <th className="py-2">Tariffa/gg (€)</th>
                      <th className="py-2">Deposito (€)</th>
                      <th className="py-2 text-right">Salva</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overview.rates.slice(0, 12).map((r) => {
                      const mod = overview.models.find((m) => m.id === r.model_id);
                      return (
                        <RateRow
                          key={r.id}
                          rate={r}
                          modelLabel={`${mod?.brand || ''} ${mod?.name || ''}`}
                          onSave={async (dailyCents, depositCents) => {
                            await fetch(`/api/admin/rates/${r.id}`, {
                              method: 'PATCH',
                              headers: authHeaders(),
                              body: JSON.stringify({
                                daily_price_cents: dailyCents,
                                deposit_cents: depositCents,
                                km_included: r.km_included,
                              }),
                            });
                            notify('Tariffa aggiornata');
                            fetchOverview();
                            refreshBootstrap();
                          }}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: EXTRAS & PROMOS */}
        {overview && tab === 'promos' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-display font-bold text-slate-900">
              Extra e codici promozionali
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Extras */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h2 className="text-base font-display font-bold text-slate-900">Accessori extra</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await fetch('/api/admin/extras', {
                      method: 'POST',
                      headers: authHeaders(),
                      body: JSON.stringify({
                        name_it: newExtraName,
                        price_cents: Math.round(newExtraPriceEur * 100),
                        pricing_type: newExtraType,
                        max_qty: 2,
                      }),
                    });
                    setNewExtraName('');
                    notify('Extra aggiunto');
                    fetchOverview();
                    refreshBootstrap();
                  }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2"
                >
                  <input
                    required
                    value={newExtraName}
                    onChange={(e) => setNewExtraName(e.target.value)}
                    placeholder="Nome extra"
                    className="sm:col-span-2 h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="number"
                    min={1}
                    value={newExtraPriceEur}
                    onChange={(e) => setNewExtraPriceEur(Number(e.target.value))}
                    className="h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                  <select
                    value={newExtraType}
                    onChange={(e) => setNewExtraType(e.target.value as 'per_day' | 'one_time')}
                    className="h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="per_day">Al giorno</option>
                    <option value="one_time">Una tantum</option>
                  </select>
                  <button
                    type="submit"
                    className="sm:col-span-4 h-9 text-xs font-semibold text-white bg-sky-600 rounded-lg"
                  >
                    Aggiungi extra
                  </button>
                </form>

                <div className="divide-y divide-slate-100 text-xs">
                  {overview.extras
                    .filter((ex) => ex.is_active)
                    .map((ex) => (
                      <div key={ex.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{ex.name_it}</p>
                          <p className="text-slate-500 font-mono">
                            {formatEUR(ex.price_cents)} ·{' '}
                            {ex.pricing_type === 'per_day' ? 'al giorno' : 'una tantum'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/extras/${ex.id}`, {
                              method: 'DELETE',
                              headers: authHeaders(),
                            });
                            fetchOverview();
                            refreshBootstrap();
                          }}
                          className="text-red-600 p-1"
                          aria-label={`Disattiva ${ex.name_it}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Promo Codes */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h2 className="text-base font-display font-bold text-slate-900">Codici sconto</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await fetch('/api/admin/promo-codes', {
                      method: 'POST',
                      headers: authHeaders(),
                      body: JSON.stringify({
                        code: newPromoCode,
                        type: newPromoType,
                        value: newPromoType === 'fixed' ? Math.round(newPromoVal * 100) : newPromoVal,
                      }),
                    });
                    setNewPromoCode('');
                    notify('Codice promo creato');
                    fetchOverview();
                  }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2"
                >
                  <input
                    required
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value)}
                    placeholder="CODICE20"
                    className="sm:col-span-2 h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase"
                  />
                  <select
                    value={newPromoType}
                    onChange={(e) => setNewPromoType(e.target.value as 'percent' | 'fixed')}
                    className="h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="percent">% Sconto</option>
                    <option value="fixed">€ Fisso</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={newPromoVal}
                    onChange={(e) => setNewPromoVal(Number(e.target.value))}
                    className="h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-4 h-9 text-xs font-semibold text-white bg-slate-900 rounded-lg"
                  >
                    Crea codice promo
                  </button>
                </form>

                <div className="divide-y divide-slate-100 text-xs">
                  {overview.promoCodes.map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-slate-900">{p.code}</p>
                        <p className="text-slate-500">
                          {p.type === 'percent' ? `-${p.value}%` : `-${formatEUR(p.value)}`} · Usi:{' '}
                          {p.used_count}/{p.max_uses}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/promo-codes/${p.id}`, {
                            method: 'DELETE',
                            headers: authHeaders(),
                          });
                          fetchOverview();
                        }}
                        className="text-red-600 p-1"
                        aria-label={`Elimina ${p.code}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SETTINGS & FAQ */}
        {overview && tab === 'settings' && settingsForm && (
          <div className="space-y-6">
            <h1 className="text-2xl font-display font-bold text-slate-900">
              Impostazioni sede e contenuti
            </h1>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await fetch('/api/admin/settings', {
                  method: 'PUT',
                  headers: authHeaders(),
                  body: JSON.stringify(settingsForm),
                });
                notify('Impostazioni salvate');
                refreshBootstrap();
              }}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Indirizzo sede</label>
                  <input
                    value={settingsForm.address_it}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, address_it: e.target.value })
                    }
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Orari apertura</label>
                  <input
                    value={settingsForm.opening_hours_it}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, opening_hours_it: e.target.value })
                    }
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Telefono</label>
                  <input
                    value={settingsForm.phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Numero WhatsApp</label>
                  <input
                    value={settingsForm.whatsapp}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email aziendale</label>
                  <input
                    value={settingsForm.email}
                    onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Partita IVA</label>
                  <input
                    value={settingsForm.vat_number}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, vat_number: e.target.value })
                    }
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Modalità pagamento online
                  </label>
                  <select
                    value={settingsForm.payment_mode}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        payment_mode: e.target.value as PaymentMode,
                      })
                    }
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="pay_at_pickup">Paga al ritiro in sede</option>
                    <option value="deposit_online">Acconto online (Stripe)</option>
                    <option value="full_online">Saldo completo online (Stripe)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Ore buffer tra noleggi
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={settingsForm.buffer_hours}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          buffer_hours: Number(e.target.value),
                        })
                      }
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Tolleranza rientro (min)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={settingsForm.grace_period_minutes}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          grace_period_minutes: Number(e.target.value),
                        })
                      }
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg"
              >
                Salva impostazioni
              </button>
            </form>

            {/* FAQ Manager */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-display font-bold text-slate-900">Gestione FAQ</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await fetch('/api/admin/faqs', {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({ question_it: newFaqQ, answer_it: newFaqA }),
                  });
                  setNewFaqQ('');
                  setNewFaqA('');
                  notify('FAQ aggiunta');
                  fetchOverview();
                  refreshBootstrap();
                }}
                className="space-y-2 text-xs"
              >
                <input
                  required
                  value={newFaqQ}
                  onChange={(e) => setNewFaqQ(e.target.value)}
                  placeholder="Domanda frequente..."
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg"
                />
                <textarea
                  required
                  rows={2}
                  value={newFaqA}
                  onChange={(e) => setNewFaqA(e.target.value)}
                  placeholder="Risposta chiara in italiano..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-slate-900 rounded-lg"
                >
                  Aggiungi FAQ
                </button>
              </form>

              <div className="divide-y divide-slate-100 text-xs">
                {overview.faqs.map((f) => (
                  <div key={f.id} className="py-2.5 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{f.question_it}</p>
                      <p className="text-slate-600 mt-0.5">{f.answer_it}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/faqs/${f.id}`, {
                          method: 'DELETE',
                          headers: authHeaders(),
                        });
                        fetchOverview();
                        refreshBootstrap();
                      }}
                      className="text-red-600 p-1 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inspection Check-in / Check-out Modal */}
      {inspectionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form
            onSubmit={submitInspection}
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <h2 className="text-lg font-display font-bold text-slate-900">
              Verbale {inspectionTarget.type === 'checkin' ? 'Check-in' : 'Check-out'} ·{' '}
              {inspectionTarget.booking.code}
            </h2>
            <p className="text-xs text-slate-600">
              {inspectionTarget.booking.model_name} · Targa {inspectionTarget.booking.vehicle_plate}
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Livello carburante</label>
                <select
                  value={insFuel}
                  onChange={(e) => setInsFuel(e.target.value)}
                  className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="8/8">Pieno (8/8)</option>
                  <option value="6/8">3/4 (6/8)</option>
                  <option value="4/8">Metà (4/8)</option>
                  <option value="2/8">1/4 (2/8)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Chilometraggio</label>
                <input
                  type="number"
                  value={insMileage}
                  onChange={(e) => setInsMileage(Number(e.target.value))}
                  className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Foto veicolo (fino a 4 scatti)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleInspectionUpload}
                className="text-xs text-slate-600"
              />
              {insPhotos.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {insPhotos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Foto ${i + 1}`}
                      className="w-12 h-12 object-cover rounded border"
                    />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Note stato carrozzeria / cerchi
              </label>
              <textarea
                rows={2}
                value={insNotes}
                onChange={(e) => setInsNotes(e.target.value)}
                placeholder="Nessun segno rilevato su paraurti anteriore..."
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInspectionTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg"
              >
                Salva verbale
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manual Walk-in Booking Modal */}
      {manualModalOpen && overview && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form
            onSubmit={submitManualBooking}
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs"
          >
            <h2 className="text-lg font-display font-bold text-slate-900">
              Nuova prenotazione da telefono o sede
            </h2>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Modello</label>
              <select
                value={manModelId}
                onChange={(e) => setManModelId(e.target.value)}
                className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                {overview.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.brand} {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nome *</label>
                <input
                  required
                  value={manFirst}
                  onChange={(e) => setManFirst(e.target.value)}
                  className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Cognome *</label>
                <input
                  required
                  value={manLast}
                  onChange={(e) => setManLast(e.target.value)}
                  className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Telefono *</label>
                <input
                  required
                  value={manPhone}
                  onChange={(e) => setManPhone(e.target.value)}
                  className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={manEmail}
                  onChange={(e) => setManEmail(e.target.value)}
                  className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Ritiro</label>
                <input
                  type="datetime-local"
                  required
                  value={manPickup}
                  onChange={(e) => setManPickup(e.target.value)}
                  className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Riconsegna</label>
                <input
                  type="datetime-local"
                  required
                  value={manDropoff}
                  onChange={(e) => setManDropoff(e.target.value)}
                  className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="px-4 py-2 font-medium text-slate-700 bg-slate-100 rounded-lg"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-sky-600 rounded-lg"
              >
                Crea prenotazione
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function RateRow({
  rate,
  modelLabel,
  onSave,
}: {
  rate: RateTier;
  modelLabel: string;
  onSave: (dailyCents: number, depositCents: number) => void;
}) {
  const [dailyEur, setDailyEur] = useState(rate.daily_price_cents / 100);
  const [depEur, setDepEur] = useState(rate.deposit_cents / 100);

  return (
    <tr>
      <td className="py-2 font-medium text-slate-900">{modelLabel}</td>
      <td className="py-2 text-slate-500">{rate.season_name}</td>
      <td className="py-2 tabular-nums">
        {rate.max_days >= 365 ? '30+ gg' : `${rate.min_days}–${rate.max_days} gg`}
      </td>
      <td className="py-2">
        <input
          type="number"
          value={dailyEur}
          onChange={(e) => setDailyEur(Number(e.target.value))}
          className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded font-mono tabular-nums"
        />
      </td>
      <td className="py-2">
        <input
          type="number"
          value={depEur}
          onChange={(e) => setDepEur(Number(e.target.value))}
          className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded font-mono tabular-nums"
        />
      </td>
      <td className="py-2 text-right">
        <button
          type="button"
          onClick={() => onSave(Math.round(dailyEur * 100), Math.round(depEur * 100))}
          className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 rounded"
        >
          Salva
        </button>
      </td>
    </tr>
  );
}
