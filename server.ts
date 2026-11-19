import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase } from './src/server/db';
import {
  calculatePriceQuote,
  expirePendingBookings,
  getFreeVehiclesForModel,
  getSiteSettings,
  searchAvailableModels,
} from './src/server/pricing';
import type { BookingRecord, BookingStatus, InsurancePlan, PaymentStatus } from './src/types/rental';

initDatabase();

const app = express();
app.use(express.json({ limit: '10mb' }));

const ADMIN_PASSWORD = process.env.ADMIN_DEMO_PASSWORD || 'catania-admin-2026';
const ADMIN_TOKENS = new Set<string>();

// Basic in-memory rate limiter for lead forms
const leadRateMap = new Map<string, number[]>();
function checkRateLimit(ip: string, maxRequests = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const hits = (leadRateMap.get(ip) || []).filter((ts) => now - ts < windowMs);
  if (hits.length >= maxRequests) return false;
  hits.push(now);
  leadRateMap.set(ip, hits);
  return true;
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !ADMIN_TOKENS.has(token)) {
    return res.status(401).json({ error: 'Accesso amministratore richiesto.' });
  }
  next();
}

function hydrateModels() {
  const rows = db
    .prepare(`
      SELECT m.*, c.name_it as category_name_it, c.slug as category_slug
      FROM vehicle_models m
      JOIN vehicle_categories c ON c.id = m.category_id
      ORDER BY c.sort_order ASC, m.name ASC
    `)
    .all() as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const minRate = db
      .prepare('SELECT MIN(daily_price_cents) as min_p FROM rates WHERE model_id = ? AND season_start IS NULL')
      .get(String(row.id)) as { min_p: number | null };
    return {
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
      transmission: String(row.transmission),
      fuel: String(row.fuel),
      has_ac: Boolean(row.has_ac),
      description_it: String(row.description_it),
      fuel_policy_it: String(row.fuel_policy_it),
      images: JSON.parse(String(row.images || '[]')),
      features: JSON.parse(String(row.features || '[]')),
      is_active: Boolean(row.is_active),
      min_daily_price_cents: minRate?.min_p ?? 3000,
    };
  });
}

function hydrateBooking(row: Record<string, unknown>): BookingRecord {
  const extras = db
    .prepare(`
      SELECT be.extra_id, e.name_it, be.quantity, be.price_cents
      FROM booking_extras be
      JOIN extras e ON e.id = be.extra_id
      WHERE be.booking_id = ?
    `)
    .all(String(row.id)) as Array<{
    extra_id: string;
    name_it: string;
    quantity: number;
    price_cents: number;
  }>;

  const inspectionsRaw = db
    .prepare('SELECT * FROM inspections WHERE booking_id = ? ORDER BY signed_at ASC')
    .all(String(row.id)) as Array<Record<string, unknown>>;

  const inspections = inspectionsRaw.map((ins) => ({
    id: String(ins.id),
    booking_id: String(ins.booking_id),
    type: String(ins.type) as 'checkin' | 'checkout',
    photos: JSON.parse(String(ins.photos || '[]')),
    notes: String(ins.notes || ''),
    fuel_level: String(ins.fuel_level),
    mileage: Number(ins.mileage),
    signed_at: String(ins.signed_at),
  }));

  return {
    id: String(row.id),
    code: String(row.code),
    customer_id: String(row.customer_id),
    customer_name: String(row.customer_name),
    customer_email: String(row.customer_email),
    customer_phone: String(row.customer_phone),
    model_id: String(row.model_id),
    model_name: String(row.model_name),
    model_image: JSON.parse(String(row.model_images || '[]'))[0] || '',
    vehicle_id: String(row.vehicle_id),
    vehicle_plate: String(row.vehicle_plate),
    pickup_location_id: String(row.pickup_location_id),
    pickup_location_name: String(row.pickup_location_name),
    dropoff_location_id: String(row.dropoff_location_id),
    dropoff_location_name: String(row.dropoff_location_name),
    pickup_at: String(row.pickup_at),
    dropoff_at: String(row.dropoff_at),
    status: String(row.status) as BookingStatus,
    payment_status: String(row.payment_status) as PaymentStatus,
    payment_mode: String(row.payment_mode) as BookingRecord['payment_mode'],
    insurance_plan: String(row.insurance_plan) as InsurancePlan,
    subtotal_cents: Number(row.subtotal_cents),
    extras_cents: Number(row.extras_cents),
    fees_cents: Number(row.fees_cents),
    discount_cents: Number(row.discount_cents),
    total_cents: Number(row.total_cents),
    deposit_cents: Number(row.deposit_cents),
    amount_paid_cents: Number(row.amount_paid_cents),
    notes: String(row.notes || ''),
    created_at: String(row.created_at),
    expires_at: row.expires_at ? String(row.expires_at) : null,
    extras,
    inspections,
  };
}

function queryBookings(whereClause = '', params: unknown[] = []): BookingRecord[] {
  expirePendingBookings();
  const rows = db
    .prepare(`
      SELECT
        b.*,
        (c.first_name || ' ' || c.last_name) as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        (m.brand || ' ' || m.name) as model_name,
        m.images as model_images,
        v.plate as vehicle_plate,
        lp.name as pickup_location_name,
        ld.name as dropoff_location_name
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      JOIN vehicle_models m ON m.id = b.model_id
      JOIN vehicles v ON v.id = b.vehicle_id
      JOIN locations lp ON lp.id = b.pickup_location_id
      JOIN locations ld ON ld.id = b.dropoff_location_id
      ${whereClause}
      ORDER BY b.pickup_at DESC
    `)
    .all(...params) as Array<Record<string, unknown>>;

  return rows.map(hydrateBooking);
}

// ==========================================
// PUBLIC API ROUTES
// ==========================================

app.get('/api/bootstrap', (_req, res) => {
  const settings = getSiteSettings();
  const locations = db
    .prepare('SELECT * FROM locations WHERE is_active = 1')
    .all()
    .map((l: any) => ({
      ...l,
      is_pickup: Boolean(l.is_pickup),
      is_dropoff: Boolean(l.is_dropoff),
      is_active: Boolean(l.is_active),
    }));
  const categories = db.prepare('SELECT * FROM vehicle_categories ORDER BY sort_order ASC').all();
  const models = hydrateModels().filter((m) => m.is_active);
  const rates = db.prepare('SELECT * FROM rates ORDER BY min_days ASC').all();
  const extras = db
    .prepare('SELECT * FROM extras WHERE is_active = 1')
    .all()
    .map((e: any) => ({ ...e, is_active: Boolean(e.is_active) }));
  const reviews = db
    .prepare('SELECT * FROM reviews WHERE is_published = 1 ORDER BY created_at DESC')
    .all()
    .map((r: any) => ({ ...r, is_published: Boolean(r.is_published) }));
  const socialPosts = db
    .prepare('SELECT * FROM social_posts WHERE is_published = 1 ORDER BY sort_order ASC')
    .all()
    .map((s: any) => ({ ...s, is_published: Boolean(s.is_published) }));
  const faqs = db.prepare('SELECT * FROM faqs ORDER BY sort_order ASC').all();

  res.json({
    settings,
    locations,
    categories,
    models,
    rates,
    extras,
    reviews,
    socialPosts,
    faqs,
  });
});

app.get('/api/availability', (req, res) => {
  try {
    const pickupAt = String(req.query.pickupAt || '');
    const dropoffAt = String(req.query.dropoffAt || '');
    const pickupLocationId = String(req.query.pickupLocationId || 'loc-catania-centro');
    const dropoffLocationId = String(req.query.dropoffLocationId || pickupLocationId);
    const driverAge = Number(req.query.driverAge || 28);

    if (!pickupAt || !dropoffAt) {
      return res.status(400).json({ error: 'Specifica date e orari di ritiro e riconsegna.' });
    }

    const available = searchAvailableModels({
      pickupAt,
      dropoffAt,
      pickupLocationId,
      dropoffLocationId,
      driverAge,
    });
    res.json({ available });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Errore nel calcolo disponibilità.' });
  }
});

const quoteSchema = z.object({
  modelId: z.string().min(1),
  pickupAt: z.string().min(1),
  dropoffAt: z.string().min(1),
  pickupLocationId: z.string().min(1),
  dropoffLocationId: z.string().min(1),
  driverAge: z.number().int().min(18).max(99),
  extrasSelection: z
    .array(z.object({ extraId: z.string(), quantity: z.number().int().min(0).max(10) }))
    .optional(),
  insurancePlan: z.enum(['base', 'smart', 'kasko_zero']).optional(),
  promoCode: z.string().optional(),
});

app.post('/api/quote', (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dati preventivo non validi.' });
  }
  try {
    const quote = calculatePriceQuote(parsed.data);
    res.json({ quote });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Impossibile calcolare il preventivo.' });
  }
});

const createBookingSchema = z.object({
  modelId: z.string().min(1),
  pickupLocationId: z.string().min(1),
  dropoffLocationId: z.string().min(1),
  pickupAt: z.string().min(1),
  dropoffAt: z.string().min(1),
  driverAge: z.number().int().min(18).max(99),
  insurancePlan: z.enum(['base', 'smart', 'kasko_zero']).default('base'),
  extrasSelection: z
    .array(z.object({ extraId: z.string(), quantity: z.number().int().min(1).max(10) }))
    .default([]),
  promoCode: z.string().optional(),
  simulateOnlinePaymentSuccess: z.boolean().optional(),
  customer: z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(6),
    birthDate: z.string().min(8),
    licenceNumber: z.string().min(4),
    licenceIssueDate: z.string().min(8),
    licenceDocData: z.string().optional(),
    idDocData: z.string().optional(),
    marketingConsent: z.boolean().default(false),
  }),
  notes: z.string().optional(),
});

app.post('/api/bookings', (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Controlla i campi obbligatori del conducente e delle date.',
      details: parsed.error.flatten(),
    });
  }

  const data = parsed.data;
  const settings = getSiteSettings();
  if (data.driverAge < settings.young_driver_min_age) {
    return res.status(400).json({
      error: `L’età minima per il noleggio è ${settings.young_driver_min_age} anni.`,
    });
  }

  try {
    const bookingCode = db.transaction(() => {
      const freeUnits = getFreeVehiclesForModel(
        data.modelId,
        data.pickupAt,
        data.dropoffAt,
        settings.buffer_hours,
      );

      if (freeUnits.length === 0) {
        throw new Error(
          'Questo modello è appena stato prenotato per le date selezionate. Scegli un altro veicolo o cambia orario.',
        );
      }

      const assignedVehicle = freeUnits[0];
      const quote = calculatePriceQuote({
        modelId: data.modelId,
        pickupAt: data.pickupAt,
        dropoffAt: data.dropoffAt,
        pickupLocationId: data.pickupLocationId,
        dropoffLocationId: data.dropoffLocationId,
        driverAge: data.driverAge,
        extrasSelection: data.extrasSelection,
        insurancePlan: data.insurancePlan,
        promoCode: data.promoCode,
      });

      const customerId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO customers (
          id, first_name, last_name, email, phone, birth_date, licence_number,
          licence_issue_date, licence_doc_data, id_doc_data, marketing_consent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        customerId,
        data.customer.firstName.trim(),
        data.customer.lastName.trim(),
        data.customer.email.trim().toLowerCase(),
        data.customer.phone.trim(),
        data.customer.birthDate,
        data.customer.licenceNumber.trim().toUpperCase(),
        data.customer.licenceIssueDate,
        data.customer.licenceDocData || null,
        data.customer.idDocData || null,
        data.customer.marketingConsent ? 1 : 0,
      );

      const bookingId = crypto.randomUUID();
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const code = `SRC-${new Date().getFullYear()}-${randSuffix}`;

      let status: BookingStatus = 'confirmed';
      let paymentStatus: PaymentStatus = 'unpaid';
      let amountPaid = 0;
      let expiresAt: string | null = null;

      if (settings.payment_mode === 'pay_at_pickup') {
        status = 'confirmed';
        paymentStatus = 'unpaid';
      } else if (data.simulateOnlinePaymentSuccess) {
        status = 'confirmed';
        paymentStatus = settings.payment_mode === 'full_online' ? 'paid' : 'deposit_paid';
        amountPaid = quote.amount_due_now_cents;
      } else {
        status = 'pending';
        paymentStatus = 'unpaid';
        expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      }

      db.prepare(`
        INSERT INTO bookings (
          id, code, customer_id, model_id, vehicle_id, pickup_location_id, dropoff_location_id,
          pickup_at, dropoff_at, status, payment_status, payment_mode, insurance_plan,
          subtotal_cents, extras_cents, fees_cents, discount_cents, total_cents, deposit_cents,
          amount_paid_cents, notes, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bookingId,
        code,
        customerId,
        data.modelId,
        assignedVehicle.id,
        data.pickupLocationId,
        data.dropoffLocationId,
        data.pickupAt,
        data.dropoffAt,
        status,
        paymentStatus,
        settings.payment_mode,
        data.insurancePlan,
        quote.base_cents,
        quote.extras_cents,
        quote.fees_cents,
        quote.discount_cents,
        quote.total_cents,
        quote.deposit_cents,
        amountPaid,
        data.notes || '',
        expiresAt,
      );

      if (data.extrasSelection.length > 0) {
        const extraRows = db.prepare('SELECT id, price_cents, pricing_type FROM extras').all() as Array<{
          id: string;
          price_cents: number;
          pricing_type: string;
        }>;
        const extraMap = new Map(extraRows.map((e) => [e.id, e]));
        const insBkExtra = db.prepare(
          'INSERT INTO booking_extras (id, booking_id, extra_id, quantity, price_cents) VALUES (?, ?, ?, ?, ?)',
        );
        for (const sel of data.extrasSelection) {
          const ex = extraMap.get(sel.extraId);
          if (!ex) continue;
          const lineCents =
            ex.pricing_type === 'per_day'
              ? ex.price_cents * sel.quantity * quote.days
              : ex.price_cents * sel.quantity;
          insBkExtra.run(crypto.randomUUID(), bookingId, sel.extraId, sel.quantity, lineCents);
        }
      }

      if (quote.promo_applied) {
        db.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE UPPER(code) = ?').run(
          quote.promo_applied,
        );
      }

      return code;
    })();

    const created = queryBookings('WHERE b.code = ?', [bookingCode])[0];
    res.status(201).json({ booking: created });
  } catch (err: any) {
    res.status(409).json({ error: err.message || 'Errore nella creazione della prenotazione.' });
  }
});

app.get('/api/bookings/by-code/:code', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const matches = queryBookings('WHERE UPPER(b.code) = ?', [code]);
  if (matches.length === 0) {
    return res.status(404).json({ error: 'Prenotazione non trovata.' });
  }
  res.json({ booking: matches[0] });
});

app.get('/api/bookings/by-code/:code/calendar.ics', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const matches = queryBookings('WHERE UPPER(b.code) = ?', [code]);
  if (matches.length === 0) {
    return res.status(404).send('Prenotazione non trovata');
  }
  const b = matches[0];
  const formatICSDate = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Smart Rent Car Catania//Noleggio//IT',
    'BEGIN:VEVENT',
    `UID:${b.code}@smartrentcarcatania.it`,
    `DTSTAMP:${formatICSDate(new Date().toISOString())}`,
    `DTSTART:${formatICSDate(b.pickup_at)}`,
    `DTEND:${formatICSDate(b.dropoff_at)}`,
    `SUMMARY:Noleggio ${b.model_name} (${b.code}) - Smart Rent Car Catania`,
    `LOCATION:${b.pickup_location_name}`,
    `DESCRIPTION:Codice prenotazione: ${b.code}\\nAuto: ${b.model_name}\\nTotale: €${(b.total_cents / 100).toFixed(2)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="noleggio-${b.code}.ics"`);
  res.send(ics);
});

app.post('/api/customer/lookup', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!email) {
    return res.status(400).json({ error: 'Inserisci l’indirizzo email usato in prenotazione.' });
  }
  const rows = code
    ? queryBookings('WHERE LOWER(c.email) = ? AND UPPER(b.code) = ?', [email, code])
    : queryBookings('WHERE LOWER(c.email) = ?', [email]);
  res.json({ bookings: rows });
});

app.post('/api/bookings/:code/cancel', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const matches = queryBookings('WHERE UPPER(b.code) = ? AND LOWER(c.email) = ?', [code, email]);
  if (matches.length === 0) {
    return res.status(404).json({ error: 'Prenotazione non trovata per questa email.' });
  }
  const b = matches[0];
  if (b.status === 'cancelled' || b.status === 'completed') {
    return res.status(400).json({ error: 'Questa prenotazione non può più essere annullata.' });
  }
  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(b.id);
  const updated = queryBookings('WHERE b.id = ?', [b.id])[0];
  res.json({ booking: updated });
});

const leadSchema = z.object({
  type: z.enum(['contact', 'long_term']),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  message: z.string().min(5),
  honeypot: z.string().optional(),
});

app.post('/api/leads', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Troppi invii ravvicinati. Riprova tra un minuto.' });
  }
  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Compila correttamente tutti i campi richiesti.' });
  }
  if (parsed.data.honeypot) {
    return res.status(200).json({ ok: true });
  }
  const leadId = crypto.randomUUID();
  db.prepare(
    'INSERT INTO leads (id, type, name, email, phone, message) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    leadId,
    parsed.data.type,
    parsed.data.name.trim(),
    parsed.data.email.trim().toLowerCase(),
    parsed.data.phone.trim(),
    parsed.data.message.trim(),
  );
  res.status(201).json({ ok: true, id: leadId });
});

// ==========================================
// ADMIN API ROUTES
// ==========================================

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password || '');
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Password amministratore non valida.' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  ADMIN_TOKENS.add(token);
  res.json({ token, role: 'owner' });
});

app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  const bookings = queryBookings();
  const models = hydrateModels();
  const vehicles = db
    .prepare(`
      SELECT v.*, (m.brand || ' ' || m.name) as model_name
      FROM vehicles v
      JOIN vehicle_models m ON m.id = v.model_id
      ORDER BY v.plate ASC
    `)
    .all();
  const rates = db.prepare('SELECT * FROM rates ORDER BY model_id ASC, min_days ASC').all();
  const extras = db
    .prepare('SELECT * FROM extras')
    .all()
    .map((e: any) => ({ ...e, is_active: Boolean(e.is_active) }));
  const promoCodes = db
    .prepare('SELECT * FROM promo_codes')
    .all()
    .map((p: any) => ({ ...p, is_active: Boolean(p.is_active) }));
  const blockedDates = db.prepare('SELECT * FROM blocked_dates ORDER BY start_at ASC').all();
  const reviews = db
    .prepare('SELECT * FROM reviews ORDER BY created_at DESC')
    .all()
    .map((r: any) => ({ ...r, is_published: Boolean(r.is_published) }));
  const socialPosts = db
    .prepare('SELECT * FROM social_posts ORDER BY sort_order ASC')
    .all()
    .map((s: any) => ({ ...s, is_published: Boolean(s.is_published) }));
  const faqs = db.prepare('SELECT * FROM faqs ORDER BY sort_order ASC').all();
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  const locations = db
    .prepare('SELECT * FROM locations')
    .all()
    .map((l: any) => ({
      ...l,
      is_pickup: Boolean(l.is_pickup),
      is_dropoff: Boolean(l.is_dropoff),
      is_active: Boolean(l.is_active),
    }));
  const categories = db.prepare('SELECT * FROM vehicle_categories ORDER BY sort_order ASC').all();
  const settings = getSiteSettings();

  res.json({
    settings,
    locations,
    categories,
    models,
    vehicles,
    rates,
    extras,
    promoCodes,
    bookings,
    blockedDates,
    reviews,
    socialPosts,
    faqs,
    leads,
  });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const current = getSiteSettings();
  const updated = { ...current, ...req.body };
  db.prepare(`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES ('general', ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(JSON.stringify(updated));
  res.json({ settings: updated });
});

app.post('/api/admin/models', requireAdmin, (req, res) => {
  const {
    category_id,
    brand,
    name,
    seats,
    bags,
    doors,
    transmission,
    fuel,
    description_it,
    fuel_policy_it,
    imageUrl,
    daily_price_cents,
    deposit_cents,
  } = req.body;
  const id = crypto.randomUUID();
  const slug = `${brand}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + id.slice(0, 4);
  const img = imageUrl || '/src/assets/images/car_fiat_panda_1795112356445.jpg';

  db.prepare(`
    INSERT INTO vehicle_models (id, category_id, slug, brand, name, seats, bags, doors, transmission, fuel, has_ac, description_it, fuel_policy_it, images, features, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1)
  `).run(
    id,
    category_id,
    slug,
    brand,
    name,
    Number(seats || 5),
    Number(bags || 2),
    Number(doors || 5),
    transmission || 'Manuale',
    fuel || 'Benzina',
    description_it || '',
    fuel_policy_it || 'Pieno/Pieno',
    JSON.stringify([img]),
    JSON.stringify(['Aria condizionata', 'Bluetooth', 'Assistenza stradale 24h']),
  );

  const basePrice = Number(daily_price_cents || 3500);
  const dep = Number(deposit_cents || 30000);
  const insRate = db.prepare(`
    INSERT INTO rates (id, model_id, season_name, season_start, season_end, min_days, max_days, daily_price_cents, km_included, deposit_cents)
    VALUES (?, ?, 'Standard', NULL, NULL, ?, ?, ?, ?, ?)
  `);
  insRate.run(crypto.randomUUID(), id, 1, 2, basePrice, '250 km/giorno', dep);
  insRate.run(crypto.randomUUID(), id, 3, 6, Math.round(basePrice * 0.9), 'Illimitati', dep);
  insRate.run(crypto.randomUUID(), id, 7, 29, Math.round(basePrice * 0.8), 'Illimitati', dep);
  insRate.run(crypto.randomUUID(), id, 30, 365, Math.round(basePrice * 0.65), '3.000 km/mese', dep);

  res.status(201).json({ id });
});

app.patch('/api/admin/models/:id', requireAdmin, (req, res) => {
  const { is_active, description_it } = req.body;
  if (typeof is_active === 'boolean') {
    db.prepare('UPDATE vehicle_models SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, req.params.id);
  }
  if (typeof description_it === 'string') {
    db.prepare('UPDATE vehicle_models SET description_it = ? WHERE id = ?').run(description_it, req.params.id);
  }
  res.json({ ok: true });
});

app.post('/api/admin/vehicles', requireAdmin, (req, res) => {
  const { model_id, plate, color, mileage, status, insurance_expiry, service_due } = req.body;
  const id = crypto.randomUUID();
  try {
    db.prepare(`
      INSERT INTO vehicles (id, model_id, plate, color, mileage, status, insurance_expiry, service_due)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      model_id,
      String(plate).trim().toUpperCase(),
      color || 'Bianco',
      Number(mileage || 0),
      status || 'available',
      insurance_expiry || '2027-06-30',
      service_due || '2027-03-31',
    );
    res.status(201).json({ id });
  } catch (err: any) {
    res.status(400).json({ error: 'Targa già presente o dati non validi.' });
  }
});

app.patch('/api/admin/vehicles/:id', requireAdmin, (req, res) => {
  const { status, mileage } = req.body;
  if (status) {
    db.prepare('UPDATE vehicles SET status = ? WHERE id = ?').run(status, req.params.id);
  }
  if (typeof mileage === 'number') {
    db.prepare('UPDATE vehicles SET mileage = ? WHERE id = ?').run(mileage, req.params.id);
  }
  res.json({ ok: true });
});

app.patch('/api/admin/rates/:id', requireAdmin, (req, res) => {
  const { daily_price_cents, deposit_cents, km_included } = req.body;
  db.prepare(
    'UPDATE rates SET daily_price_cents = ?, deposit_cents = ?, km_included = ? WHERE id = ?',
  ).run(Number(daily_price_cents), Number(deposit_cents), String(km_included), req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/blocked-dates', requireAdmin, (req, res) => {
  const { vehicle_id, start_at, end_at, reason } = req.body;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO blocked_dates (id, vehicle_id, start_at, end_at, reason) VALUES (?, ?, ?, ?, ?)').run(
    id,
    vehicle_id || null,
    start_at,
    end_at,
    reason || 'Manutenzione programmata',
  );
  res.status(201).json({ id });
});

app.delete('/api/admin/blocked-dates/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM blocked_dates WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.patch('/api/admin/bookings/:id', requireAdmin, (req, res) => {
  const { status, payment_status, vehicle_id, notes } = req.body;
  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Prenotazione non trovata.' });

  if (vehicle_id && vehicle_id !== existing.vehicle_id) {
    const settings = getSiteSettings();
    const freeUnits = getFreeVehiclesForModel(
      existing.model_id,
      existing.pickup_at,
      existing.dropoff_at,
      settings.buffer_hours,
      existing.id,
    );
    if (!freeUnits.some((u) => u.id === vehicle_id)) {
      return res.status(409).json({ error: 'Il veicolo scelto è occupato in questo intervallo.' });
    }
  }

  db.prepare(`
    UPDATE bookings
    SET status = COALESCE(?, status),
        payment_status = COALESCE(?, payment_status),
        vehicle_id = COALESCE(?, vehicle_id),
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(status ?? null, payment_status ?? null, vehicle_id ?? null, notes ?? null, req.params.id);

  res.json({ booking: queryBookings('WHERE b.id = ?', [req.params.id])[0] });
});

app.post('/api/admin/bookings/:id/inspections', requireAdmin, (req, res) => {
  const { type, photos, notes, fuel_level, mileage } = req.body;
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO inspections (id, booking_id, type, photos, notes, fuel_level, mileage)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.params.id,
    type === 'checkout' ? 'checkout' : 'checkin',
    JSON.stringify(photos || []),
    notes || '',
    fuel_level || '8/8',
    Number(mileage || 0),
  );
  if (type === 'checkin') {
    db.prepare("UPDATE bookings SET status = 'active' WHERE id = ? AND status = 'confirmed'").run(
      req.params.id,
    );
  } else if (type === 'checkout') {
    db.prepare("UPDATE bookings SET status = 'completed' WHERE id = ? AND status = 'active'").run(
      req.params.id,
    );
  }
  res.status(201).json({ booking: queryBookings('WHERE b.id = ?', [req.params.id])[0] });
});

app.post('/api/admin/extras', requireAdmin, (req, res) => {
  const { name_it, description_it, price_cents, pricing_type, max_qty } = req.body;
  const id = crypto.randomUUID();
  const slug = String(name_it).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + id.slice(0, 4);
  db.prepare(
    'INSERT INTO extras (id, slug, name_it, description_it, price_cents, pricing_type, max_qty, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
  ).run(id, slug, name_it, description_it || '', Number(price_cents), pricing_type || 'per_day', Number(max_qty || 1));
  res.status(201).json({ id });
});

app.delete('/api/admin/extras/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE extras SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/promo-codes', requireAdmin, (req, res) => {
  const { code, type, value, valid_from, valid_to, max_uses } = req.body;
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO promo_codes (id, code, type, value, valid_from, valid_to, max_uses, used_count, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)',
  ).run(
    id,
    String(code).trim().toUpperCase(),
    type === 'fixed' ? 'fixed' : 'percent',
    Number(value),
    valid_from || '2026-01-01',
    valid_to || '2027-12-31',
    Number(max_uses || 100),
  );
  res.status(201).json({ id });
});

app.delete('/api/admin/promo-codes/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM promo_codes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/faqs', requireAdmin, (req, res) => {
  const { question_it, answer_it } = req.body;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO faqs (id, question_it, answer_it, sort_order) VALUES (?, ?, ?, 99)').run(
    id,
    question_it,
    answer_it,
  );
  res.status(201).json({ id });
});

app.delete('/api/admin/faqs/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM faqs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/reviews', requireAdmin, (req, res) => {
  const { author_name, rating, text_it, source } = req.body;
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO reviews (id, author_name, rating, text_it, source, is_published) VALUES (?, ?, ?, ?, ?, 1)',
  ).run(id, author_name, Number(rating || 5), text_it, source || 'Google');
  res.status(201).json({ id });
});

app.delete('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.patch('/api/admin/leads/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/bookings.csv', requireAdmin, (_req, res) => {
  const bookings = queryBookings();
  const header = 'Codice,Cliente,Email,Telefono,Modello,Targa,Ritiro,Riconsegna,Stato,Pagamento,Totale_EUR\n';
  const lines = bookings
    .map((b) =>
      [
        b.code,
        `"${b.customer_name.replace(/"/g, '""')}"`,
        b.customer_email,
        b.customer_phone,
        `"${b.model_name}"`,
        b.vehicle_plate,
        b.pickup_at,
        b.dropoff_at,
        b.status,
        b.payment_status,
        (b.total_cents / 100).toFixed(2),
      ].join(','),
    )
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="prenotazioni-smartrent-catania.csv"');
  res.send(header + lines);
});

// ==========================================
// VITE / STATIC SPA SERVING
// ==========================================

async function startServer() {
  const PORT = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve('dist'));

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Rent Car Catania server running on http://localhost:${PORT}`);
  });
}

startServer();
