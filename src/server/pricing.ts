import { db, DEFAULT_SITE_SETTINGS } from './db';
import type {
  AvailableModelResult,
  ExtraItem,
  InsurancePlan,
  LocationItem,
  PriceQuote,
  PromoCode,
  RateTier,
  SiteSettings,
  VehicleModel,
} from '../types/rental';

export function getSiteSettings(): SiteSettings {
  const row = db
    .prepare("SELECT value FROM site_settings WHERE key = 'general'")
    .get() as { value: string } | undefined;
  if (!row) return DEFAULT_SITE_SETTINGS;
  try {
    return { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export function expirePendingBookings() {
  db.prepare(`
    UPDATE bookings
    SET status = 'cancelled', notes = CASE WHEN notes = '' THEN 'Scaduta automaticamente dopo 30 min' ELSE notes || ' | Scaduta automaticamente dopo 30 min' END
    WHERE status = 'pending'
      AND payment_status = 'unpaid'
      AND expires_at IS NOT NULL
      AND datetime(expires_at) < datetime('now')
  `).run();
}

export function computeRentalDays(pickupAt: string, dropoffAt: string, graceMinutes: number): number {
  const start = new Date(pickupAt).getTime();
  const end = new Date(dropoffAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    throw new Error('La data di riconsegna deve essere successiva al ritiro.');
  }
  const diffMinutes = (end - start) / 60000;
  const effectiveMinutes = Math.max(1, diffMinutes - graceMinutes);
  return Math.max(1, Math.ceil(effectiveMinutes / (24 * 60)));
}

function isOutOfHours(isoDate: string): boolean {
  const d = new Date(isoDate);
  const hour = d.getHours() + d.getMinutes() / 60;
  return hour < 8.5 || hour > 20.0;
}

export function getFreeVehiclesForModel(
  modelId: string,
  pickupAt: string,
  dropoffAt: string,
  bufferHours: number,
  excludeBookingId?: string,
): Array<{ id: string; plate: string; color: string }> {
  expirePendingBookings();

  const startMs = new Date(pickupAt).getTime() - bufferHours * 3600 * 1000;
  const endMs = new Date(dropoffAt).getTime() + bufferHours * 3600 * 1000;

  const units = db
    .prepare("SELECT id, plate, color FROM vehicles WHERE model_id = ? AND status = 'available'")
    .all(modelId) as Array<{ id: string; plate: string; color: string }>;

  if (units.length === 0) return [];

  const overlappingBookings = db
    .prepare(`
      SELECT vehicle_id, pickup_at, dropoff_at
      FROM bookings
      WHERE status IN ('pending', 'confirmed', 'active')
        AND (? IS NULL OR id != ?)
    `)
    .all(excludeBookingId ?? null, excludeBookingId ?? null) as Array<{
    vehicle_id: string;
    pickup_at: string;
    dropoff_at: string;
  }>;

  const blocked = db
    .prepare('SELECT vehicle_id, start_at, end_at FROM blocked_dates')
    .all() as Array<{ vehicle_id: string | null; start_at: string; end_at: string }>;

  const busyIds = new Set<string>();

  for (const b of overlappingBookings) {
    const bStart = new Date(b.pickup_at).getTime();
    const bEnd = new Date(b.dropoff_at).getTime();
    if (bStart < endMs && bEnd > startMs) {
      busyIds.add(b.vehicle_id);
    }
  }

  let fleetBlocked = false;
  for (const blk of blocked) {
    const blkStart = new Date(blk.start_at).getTime();
    const blkEnd = new Date(blk.end_at).getTime();
    if (blkStart < endMs && blkEnd > startMs) {
      if (!blk.vehicle_id) {
        fleetBlocked = true;
      } else {
        busyIds.add(blk.vehicle_id);
      }
    }
  }

  if (fleetBlocked) return [];
  return units.filter((u) => !busyIds.has(u.id));
}

export function selectRateForDates(modelId: string, pickupAt: string, days: number): RateTier {
  const rates = db
    .prepare('SELECT * FROM rates WHERE model_id = ? ORDER BY min_days ASC')
    .all(modelId) as RateTier[];

  if (rates.length === 0) {
    throw new Error('Tariffe non configurate per questo modello.');
  }

  const pickupDateOnly = pickupAt.slice(0, 10);
  const seasonalMatches = rates.filter(
    (r) =>
      r.season_start &&
      r.season_end &&
      pickupDateOnly >= r.season_start &&
      pickupDateOnly <= r.season_end &&
      days >= r.min_days &&
      days <= r.max_days,
  );
  if (seasonalMatches.length > 0) return seasonalMatches[0];

  const standardMatches = rates.filter(
    (r) => !r.season_start && days >= r.min_days && days <= r.max_days,
  );
  if (standardMatches.length > 0) return standardMatches[0];

  return rates[0];
}

export function calculatePriceQuote(params: {
  modelId: string;
  pickupAt: string;
  dropoffAt: string;
  pickupLocationId: string;
  dropoffLocationId: string;
  driverAge: number;
  extrasSelection?: Array<{ extraId: string; quantity: number }>;
  insurancePlan?: InsurancePlan;
  promoCode?: string;
}): PriceQuote {
  const settings = getSiteSettings();
  const days = computeRentalDays(params.pickupAt, params.dropoffAt, settings.grace_period_minutes);
  const rate = selectRateForDates(params.modelId, params.pickupAt, days);

  const base_cents = rate.daily_price_cents * days;
  const breakdown_lines: Array<{ label: string; amount_cents: number }> = [
    {
      label: `Tariffa noleggio (${days} ${days === 1 ? 'giorno' : 'giorni'} × €${(rate.daily_price_cents / 100).toFixed(2)})`,
      amount_cents: base_cents,
    },
  ];

  // Insurance
  const plan: InsurancePlan = params.insurancePlan ?? 'base';
  let insurance_cents = 0;
  let deposit_cents = rate.deposit_cents;
  if (plan === 'smart') {
    insurance_cents = 1200 * days;
    deposit_cents = Math.round(rate.deposit_cents * 0.5);
    breakdown_lines.push({
      label: `Copertura Smart (riduzione franchigia 50%, ${days} gg)`,
      amount_cents: insurance_cents,
    });
  } else if (plan === 'kasko_zero') {
    insurance_cents = 2200 * days;
    deposit_cents = 0;
    breakdown_lines.push({
      label: `Copertura Kasko Zero Franchigia e Zero Deposito (${days} gg)`,
      amount_cents: insurance_cents,
    });
  }

  // Extras
  let extras_cents = 0;
  if (params.extrasSelection && params.extrasSelection.length > 0) {
    const allExtras = db
      .prepare('SELECT * FROM extras WHERE is_active = 1')
      .all() as ExtraItem[];
    const extraMap = new Map(allExtras.map((e) => [e.id, e]));
    for (const sel of params.extrasSelection) {
      if (sel.quantity <= 0) continue;
      const ex = extraMap.get(sel.extraId);
      if (!ex) continue;
      const qty = Math.min(sel.quantity, ex.max_qty);
      const lineCents =
        ex.pricing_type === 'per_day' ? ex.price_cents * qty * days : ex.price_cents * qty;
      extras_cents += lineCents;
      breakdown_lines.push({
        label: `${ex.name_it}${qty > 1 ? ` ×${qty}` : ''} (${ex.pricing_type === 'per_day' ? `${days} gg` : 'una tantum'})`,
        amount_cents: lineCents,
      });
    }
  }

  // Young driver fee
  let young_driver_fee_cents = 0;
  if (params.driverAge < settings.young_driver_threshold_age) {
    young_driver_fee_cents = settings.young_driver_fee_per_day_cents * days;
    breakdown_lines.push({
      label: `Supplemento giovane conducente (< ${settings.young_driver_threshold_age} anni, ${days} gg)`,
      amount_cents: young_driver_fee_cents,
    });
  }

  // Out-of-hours fee
  let out_of_hours_fee_cents = 0;
  const pickupLoc = db
    .prepare('SELECT * FROM locations WHERE id = ?')
    .get(params.pickupLocationId) as LocationItem | undefined;
  const dropoffLoc = db
    .prepare('SELECT * FROM locations WHERE id = ?')
    .get(params.dropoffLocationId) as LocationItem | undefined;

  if (pickupLoc && isOutOfHours(params.pickupAt) && pickupLoc.out_of_hours_fee_cents > 0) {
    out_of_hours_fee_cents += pickupLoc.out_of_hours_fee_cents;
  }
  if (dropoffLoc && isOutOfHours(params.dropoffAt) && dropoffLoc.out_of_hours_fee_cents > 0) {
    out_of_hours_fee_cents += dropoffLoc.out_of_hours_fee_cents;
  }
  if (out_of_hours_fee_cents > 0) {
    breakdown_lines.push({
      label: 'Supplemento consegna/rientro fuori orario',
      amount_cents: out_of_hours_fee_cents,
    });
  }

  // One-way fee
  let one_way_fee_cents = 0;
  if (params.pickupLocationId !== params.dropoffLocationId && settings.one_way_fee_cents > 0) {
    one_way_fee_cents = settings.one_way_fee_cents;
    breakdown_lines.push({
      label: 'Supplemento riconsegna in sede diversa',
      amount_cents: one_way_fee_cents,
    });
  }

  const fees_cents = insurance_cents + young_driver_fee_cents + out_of_hours_fee_cents + one_way_fee_cents;
  const gross_cents = base_cents + extras_cents + fees_cents;

  // Promo code
  let discount_cents = 0;
  let promo_applied: string | null = null;
  if (params.promoCode && params.promoCode.trim()) {
    const cleanCode = params.promoCode.trim().toUpperCase();
    const promo = db
      .prepare('SELECT * FROM promo_codes WHERE UPPER(code) = ? AND is_active = 1')
      .get(cleanCode) as PromoCode | undefined;
    const todayIso = new Date().toISOString().slice(0, 10);
    if (
      promo &&
      promo.used_count < promo.max_uses &&
      todayIso >= promo.valid_from.slice(0, 10) &&
      todayIso <= promo.valid_to.slice(0, 10)
    ) {
      promo_applied = promo.code;
      discount_cents =
        promo.type === 'percent'
          ? Math.round((gross_cents * promo.value) / 100)
          : Math.min(gross_cents, promo.value);
      if (discount_cents > 0) {
        breakdown_lines.push({
          label: `Sconto codice promo ${promo.code}`,
          amount_cents: -discount_cents,
        });
      }
    }
  }

  const total_cents = Math.max(0, gross_cents - discount_cents);
  const vat_included_cents = Math.round((total_cents * 22) / 122);

  let amount_due_now_cents = 0;
  if (settings.payment_mode === 'full_online') {
    amount_due_now_cents = total_cents;
  } else if (settings.payment_mode === 'deposit_online') {
    amount_due_now_cents = Math.round((total_cents * settings.deposit_percent) / 100);
  }
  const amount_due_at_pickup_cents = Math.max(0, total_cents - amount_due_now_cents);

  return {
    days,
    daily_price_cents: rate.daily_price_cents,
    base_cents,
    extras_cents,
    insurance_cents,
    young_driver_fee_cents,
    out_of_hours_fee_cents,
    one_way_fee_cents,
    fees_cents,
    discount_cents,
    total_cents,
    vat_included_cents,
    deposit_cents,
    amount_due_now_cents,
    amount_due_at_pickup_cents,
    km_included: rate.km_included,
    promo_applied,
    breakdown_lines,
  };
}

export function searchAvailableModels(params: {
  pickupAt: string;
  dropoffAt: string;
  pickupLocationId: string;
  dropoffLocationId: string;
  driverAge: number;
}): AvailableModelResult[] {
  const settings = getSiteSettings();
  const rawModels = db
    .prepare(`
      SELECT m.*, c.name_it as category_name_it, c.slug as category_slug
      FROM vehicle_models m
      JOIN vehicle_categories c ON c.id = m.category_id
      WHERE m.is_active = 1
      ORDER BY c.sort_order ASC, m.name ASC
    `)
    .all() as Array<Record<string, unknown>>;

  const results: AvailableModelResult[] = [];

  for (const row of rawModels) {
    const model: VehicleModel = {
      id: String(row.id),
      category_id: String(row.category_id),
      category_name_it: String(row.category_name_it),
      category_slug: String(row.category_slug),
      slug: String(row.slug),
      brand: String(row.brand),
      name: String(row.name),
      seats: Number(row.seats),
      bags: Number(row.bags),
      doors: Number(row.doors),
      transmission: row.transmission as VehicleModel['transmission'],
      fuel: row.fuel as VehicleModel['fuel'],
      has_ac: Boolean(row.has_ac),
      description_it: String(row.description_it),
      fuel_policy_it: String(row.fuel_policy_it),
      images: JSON.parse(String(row.images || '[]')),
      features: JSON.parse(String(row.features || '[]')),
      is_active: Boolean(row.is_active),
    };

    const freeUnits = getFreeVehiclesForModel(
      model.id,
      params.pickupAt,
      params.dropoffAt,
      settings.buffer_hours,
    );

    if (freeUnits.length > 0) {
      const quote = calculatePriceQuote({
        modelId: model.id,
        pickupAt: params.pickupAt,
        dropoffAt: params.dropoffAt,
        pickupLocationId: params.pickupLocationId,
        dropoffLocationId: params.dropoffLocationId,
        driverAge: params.driverAge,
      });
      const rates = db
        .prepare('SELECT * FROM rates WHERE model_id = ? AND season_start IS NULL ORDER BY min_days ASC')
        .all(model.id) as RateTier[];
      results.push({
        model,
        free_units_count: freeUnits.length,
        quote,
        rates,
      });
    }
  }

  return results;
}
