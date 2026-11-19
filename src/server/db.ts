import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { SiteSettings } from '../types/rental';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'smartrent.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  business_name: 'Smart Rent Car Autonoleggio Catania',
  address_it: 'Via Etnea 412, 95125 Catania CT [DA CONFERMARE]',
  city: 'Catania',
  lat: 37.5158,
  lng: 15.0781,
  phone: '+39 095 000 0000 [DA CONFERMARE]',
  whatsapp: '+39 340 000 0000',
  email: 'info@smartrentcarcatania.it [DA CONFERMARE]',
  vat_number: 'P.IVA 00000000000 [DA CONFERMARE]',
  opening_hours_it: 'Lun–Sab 08:30–20:00 · Dom 09:00–13:00 [DA CONFERMARE]',
  instagram_handle: '@smartrentcarcatania [DA CONFERMARE]',
  tiktok_handle: '@smartrentcarcatania [DA CONFERMARE]',
  payment_mode: 'pay_at_pickup',
  deposit_percent: 30,
  buffer_hours: 2,
  grace_period_minutes: 30,
  free_cancellation_hours: 24,
  young_driver_min_age: 21,
  young_driver_threshold_age: 25,
  young_driver_fee_per_day_cents: 1200,
  one_way_fee_cents: 2000,
  no_credit_card_option: true,
  airport_service_enabled: true,
  placeholder_notice_it:
    'Alcuni dati operativi (indirizzo stradale, recapiti, P.IVA e tariffe indicative) sono segnaposto dimostrativi modificabili dal pannello gestione.',
};

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      phone TEXT NOT NULL,
      opening_hours_it TEXT NOT NULL,
      pickup_instructions_it TEXT NOT NULL,
      is_pickup INTEGER NOT NULL DEFAULT 1,
      is_dropoff INTEGER NOT NULL DEFAULT 1,
      out_of_hours_fee_cents INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS vehicle_categories (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name_it TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS vehicle_models (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES vehicle_categories(id),
      slug TEXT UNIQUE NOT NULL,
      brand TEXT NOT NULL,
      name TEXT NOT NULL,
      seats INTEGER NOT NULL,
      bags INTEGER NOT NULL,
      doors INTEGER NOT NULL,
      transmission TEXT NOT NULL,
      fuel TEXT NOT NULL,
      has_ac INTEGER NOT NULL DEFAULT 1,
      description_it TEXT NOT NULL,
      fuel_policy_it TEXT NOT NULL,
      images TEXT NOT NULL,
      features TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
      plate TEXT UNIQUE NOT NULL,
      color TEXT NOT NULL,
      mileage INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'available',
      insurance_expiry TEXT NOT NULL,
      service_due TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rates (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
      season_name TEXT NOT NULL DEFAULT 'Standard',
      season_start TEXT,
      season_end TEXT,
      min_days INTEGER NOT NULL,
      max_days INTEGER NOT NULL,
      daily_price_cents INTEGER NOT NULL,
      km_included TEXT NOT NULL DEFAULT 'Illimitati',
      deposit_cents INTEGER NOT NULL DEFAULT 30000
    );

    CREATE TABLE IF NOT EXISTS extras (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name_it TEXT NOT NULL,
      description_it TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      pricing_type TEXT NOT NULL DEFAULT 'per_day',
      max_qty INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS promo_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      value INTEGER NOT NULL,
      valid_from TEXT NOT NULL,
      valid_to TEXT NOT NULL,
      max_uses INTEGER NOT NULL DEFAULT 100,
      used_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      licence_number TEXT NOT NULL,
      licence_issue_date TEXT NOT NULL,
      licence_doc_data TEXT,
      id_doc_data TEXT,
      marketing_consent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      model_id TEXT NOT NULL REFERENCES vehicle_models(id),
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
      pickup_location_id TEXT NOT NULL REFERENCES locations(id),
      dropoff_location_id TEXT NOT NULL REFERENCES locations(id),
      pickup_at TEXT NOT NULL,
      dropoff_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      payment_mode TEXT NOT NULL DEFAULT 'pay_at_pickup',
      insurance_plan TEXT NOT NULL DEFAULT 'base',
      subtotal_cents INTEGER NOT NULL,
      extras_cents INTEGER NOT NULL DEFAULT 0,
      fees_cents INTEGER NOT NULL DEFAULT 0,
      discount_cents INTEGER NOT NULL DEFAULT 0,
      total_cents INTEGER NOT NULL,
      deposit_cents INTEGER NOT NULL DEFAULT 0,
      amount_paid_cents INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS booking_extras (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      extra_id TEXT NOT NULL REFERENCES extras(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      price_cents INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blocked_dates (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      reason TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      photos TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      fuel_level TEXT NOT NULL,
      mileage INTEGER NOT NULL,
      signed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      text_it TEXT NOT NULL,
      source TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS social_posts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      url TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      caption TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY,
      question_it TEXT NOT NULL,
      answer_it TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const hasSettings = db.prepare('SELECT COUNT(*) as c FROM site_settings').get() as { c: number };
  if (hasSettings.c === 0) {
    seedDatabase();
  }
}

function seedDatabase() {
  const id = () => crypto.randomUUID();

  db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)').run(
    'general',
    JSON.stringify(DEFAULT_SITE_SETTINGS),
  );

  // Locations
  const locCenterId = 'loc-catania-centro';
  const locAirportId = 'loc-catania-aeroporto';
  const insertLoc = db.prepare(`
    INSERT INTO locations (id, name, address, lat, lng, phone, opening_hours_it, pickup_instructions_it, is_pickup, is_dropoff, out_of_hours_fee_cents, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertLoc.run(
    locCenterId,
    'Sede Catania Centro [DA CONFERMARE]',
    'Via Etnea 412, 95125 Catania CT [DA CONFERMARE]',
    37.5158,
    15.0781,
    '+39 095 000 0000',
    'Lun–Sab 08:30–20:00 · Dom 09:00–13:00',
    'Raggiungi il desk principale a 4 minuti dalla metro Borgo. Porta patente originale, documento di identità e conferma prenotazione. Check-in fotografico condiviso in 3 minuti.',
    1,
    1,
    2500,
    1,
  );
  insertLoc.run(
    locAirportId,
    'Aeroporto Catania Fontanarossa (Meet & Greet) [DA CONFERMARE]',
    'Via Fontanarossa, 95121 Catania CT [DA CONFERMARE]',
    37.4668,
    15.0664,
    '+39 095 000 0000',
    'Tutti i giorni 08:00–22:00 su prenotazione',
    'Un nostro operatore ti attende fuori dall’area Arrivi con cartello Smart Rent Car. Nessuna navetta o fila al terminal.',
    1,
    1,
    3000,
    1,
  );

  // Categories
  const catCity = 'cat-city-car';
  const catCompact = 'cat-compatte';
  const catSuv = 'cat-suv';
  const catVan = 'cat-minivan';
  const insertCat = db.prepare(
    'INSERT INTO vehicle_categories (id, slug, name_it, sort_order) VALUES (?, ?, ?, ?)',
  );
  insertCat.run(catCity, 'city-car', 'City Car', 1);
  insertCat.run(catCompact, 'compatte', 'Compatte', 2);
  insertCat.run(catSuv, 'suv-crossover', 'SUV & Crossover', 3);
  insertCat.run(catVan, 'minivan-9-posti', 'Minivan 9 Posti', 4);

  // Models
  const models = [
    {
      id: 'mod-panda',
      category_id: catCity,
      slug: 'fiat-panda-hybrid',
      brand: 'Fiat',
      name: 'Panda Hybrid',
      seats: 4,
      bags: 2,
      doors: 5,
      transmission: 'Manuale',
      fuel: 'Ibrida',
      has_ac: 1,
      description_it:
        'Compatta, agile nel traffico del centro storico di Catania e parca nei consumi. Perfetta per coppie, spostamenti urbani e gite sulla Riviera dei Ciclopi.',
      fuel_policy_it: 'Pieno/Pieno (riconsegna con lo stesso livello di carburante del ritiro)',
      images: ['/src/assets/images/car_fiat_panda_1795112356445.jpg'],
      features: ['Climatizzatore', 'Sensori parcheggio posteriori', 'Bluetooth & USB', 'Start&Stop Ibrido', '5 porte'],
      rates: [
        { min: 1, max: 2, price: 3200, km: '250 km/giorno', dep: 30000 },
        { min: 3, max: 6, price: 2800, km: 'Illimitati', dep: 30000 },
        { min: 7, max: 29, price: 2400, km: 'Illimitati', dep: 30000 },
        { min: 30, max: 365, price: 1900, km: '3.000 km/mese', dep: 30000 },
      ],
      plates: [
        { plate: 'GP412CT', color: 'Bianco Gelato', km: 14200 },
        { plate: 'GP413CT', color: 'Bianco Gelato', km: 18900 },
      ],
    },
    {
      id: 'mod-500',
      category_id: catCity,
      slug: 'fiat-500-hybrid',
      brand: 'Fiat',
      name: '500 Hybrid Dolcevita',
      seats: 4,
      bags: 1,
      doors: 3,
      transmission: 'Manuale',
      fuel: 'Ibrida',
      has_ac: 1,
      description_it:
        'Icona italiana per muoversi con stile tra Catania, Taormina e Ortigia. Apple CarPlay wireless e consumi ridotti.',
      fuel_policy_it: 'Pieno/Pieno',
      images: ['/src/assets/images/car_fiat_500_1795112356554.jpg'],
      features: ['Apple CarPlay / Android Auto', 'Climatizzatore automatico', 'Tetto panoramico', 'Cruise Control'],
      rates: [
        { min: 1, max: 2, price: 3600, km: '250 km/giorno', dep: 30000 },
        { min: 3, max: 6, price: 3200, km: 'Illimitati', dep: 30000 },
        { min: 7, max: 29, price: 2700, km: 'Illimitati', dep: 30000 },
        { min: 30, max: 365, price: 2100, km: '3.000 km/mese', dep: 30000 },
      ],
      plates: [
        { plate: 'GQ881CT', color: 'Bianco Perla', km: 9800 },
        { plate: 'GQ882CT', color: 'Bianco Perla', km: 12450 },
      ],
    },
    {
      id: 'mod-golf',
      category_id: catCompact,
      slug: 'volkswagen-golf-8',
      brand: 'Volkswagen',
      name: 'Golf 8 Life DSG',
      seats: 5,
      bags: 3,
      doors: 5,
      transmission: 'Automatico',
      fuel: 'Diesel',
      has_ac: 1,
      description_it:
        'Cambio automatico DSG a 7 rapporti, silenziosa e spaziosa per lunghe tratte autostradali in Sicilia o trasferte business.',
      fuel_policy_it: 'Pieno/Pieno',
      images: ['/src/assets/images/car_vw_golf_1795112356695.jpg'],
      features: ['Cambio Automatico DSG', 'Navigatore integrato', 'Sensori 360° + Retrocamera', 'Adaptive Cruise Control'],
      rates: [
        { min: 1, max: 2, price: 5400, km: '300 km/giorno', dep: 50000 },
        { min: 3, max: 6, price: 4800, km: 'Illimitati', dep: 50000 },
        { min: 7, max: 29, price: 4200, km: 'Illimitati', dep: 50000 },
        { min: 30, max: 365, price: 3300, km: '3.500 km/mese', dep: 50000 },
      ],
      plates: [{ plate: 'GR205CT', color: 'Blu Atlantico', km: 21400 }],
    },
    {
      id: 'mod-avenger',
      category_id: catSuv,
      slug: 'jeep-avenger-suv',
      brand: 'Jeep',
      name: 'Avenger Altitude',
      seats: 5,
      bags: 3,
      doors: 5,
      transmission: 'Automatico',
      fuel: 'Ibrida',
      has_ac: 1,
      description_it:
        'SUV compatto ideale per escursioni sull’Etna, strade panoramiche e famiglie con bagagli. Posizione di guida rialzata e comfort superiore.',
      fuel_policy_it: 'Pieno/Pieno',
      images: ['/src/assets/images/car_jeep_avenger_1795112356429.jpg'],
      features: ['Cambio Automatico', 'Modalità Selec-Terrain', 'Retrocamera HD', 'Apple CarPlay wireless', 'Bagagliaio 380L'],
      rates: [
        { min: 1, max: 2, price: 6200, km: '300 km/giorno', dep: 50000 },
        { min: 3, max: 6, price: 5600, km: 'Illimitati', dep: 50000 },
        { min: 7, max: 29, price: 4900, km: 'Illimitati', dep: 50000 },
        { min: 30, max: 365, price: 3900, km: '3.500 km/mese', dep: 50000 },
      ],
      plates: [
        { plate: 'GS510CT', color: 'Grigio Granite', km: 11200 },
        { plate: 'GS511CT', color: 'Grigio Granite', km: 7600 },
      ],
    },
    {
      id: 'mod-trafic',
      category_id: catVan,
      slug: 'minivan-9-posti-passo-lungo',
      brand: 'Renault',
      name: 'Trafic Combi 9 Posti',
      seats: 9,
      bags: 7,
      doors: 5,
      transmission: 'Manuale',
      fuel: 'Diesel',
      has_ac: 1,
      description_it:
        'Minivan 9 posti a passo lungo con ampio vano bagagli. Perfetto per gruppi, squadre sportive, tour sull’Etna e transfer familiari.',
      fuel_policy_it: 'Pieno/Pieno',
      images: ['/src/assets/images/car_renault_trafic_1795112356606.jpg'],
      features: ['9 posti reali', 'Clima bi-zona anteriore e posteriore', 'Sensori + Retrocamera', 'Vano bagagli XL'],
      rates: [
        { min: 1, max: 2, price: 9800, km: '300 km/giorno', dep: 80000 },
        { min: 3, max: 6, price: 8900, km: 'Illimitati', dep: 80000 },
        { min: 7, max: 29, price: 7800, km: 'Illimitati', dep: 80000 },
        { min: 30, max: 365, price: 6200, km: '4.000 km/mese', dep: 80000 },
      ],
      plates: [{ plate: 'GT901CT', color: 'Argento Metallizzato', km: 28500 }],
    },
  ];

  const insModel = db.prepare(`
    INSERT INTO vehicle_models (id, category_id, slug, brand, name, seats, bags, doors, transmission, fuel, has_ac, description_it, fuel_policy_it, images, features, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const insRate = db.prepare(`
    INSERT INTO rates (id, model_id, season_name, season_start, season_end, min_days, max_days, daily_price_cents, km_included, deposit_cents)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insVehicle = db.prepare(`
    INSERT INTO vehicles (id, model_id, plate, color, mileage, status, insurance_expiry, service_due)
    VALUES (?, ?, ?, ?, ?, 'available', ?, ?)
  `);

  for (const m of models) {
    insModel.run(
      m.id,
      m.category_id,
      m.slug,
      m.brand,
      m.name,
      m.seats,
      m.bags,
      m.doors,
      m.transmission,
      m.fuel,
      m.has_ac,
      m.description_it,
      m.fuel_policy_it,
      JSON.stringify(m.images),
      JSON.stringify(m.features),
    );
    for (const r of m.rates) {
      insRate.run(id(), m.id, 'Standard', null, null, r.min, r.max, r.price, r.km, r.dep);
      // Summer high season rate (+25%)
      insRate.run(
        id(),
        m.id,
        'Alta Stagione (Lug–Ago)',
        '2027-07-01',
        '2027-08-31',
        r.min,
        r.max,
        Math.round(r.price * 1.25),
        r.km,
        r.dep,
      );
    }
    for (const p of m.plates) {
      insVehicle.run(id(), m.id, p.plate, p.color, p.km, '2027-06-30', '2027-03-15');
    }
  }

  // Extras
  const insExtra = db.prepare(`
    INSERT INTO extras (id, slug, name_it, description_it, price_cents, pricing_type, max_qty, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insExtra.run(id(), 'seggiolino-bimbo', 'Seggiolino bimbo omologato', 'Gruppo 1/2/3 (9–36 kg), igienizzato prima di ogni consegna.', 600, 'per_day', 2);
  insExtra.run(id(), 'conducente-aggiuntivo', 'Conducente aggiuntivo', 'Abilita un secondo guidatore alle stesse condizioni assicurative.', 500, 'per_day', 2);
  insExtra.run(id(), 'kit-usb-supporto', 'Supporto smartphone + ricarica rapida', 'Supporto magnetico da bocchetta con doppio cavo USB-C / Lightning.', 300, 'per_day', 1);
  insExtra.run(id(), 'catene-neve-etna', 'Kit catene da neve Etna', 'Set omologato per salita sull’Etna e tratte montane invernali.', 1500, 'one_time', 1);
  insExtra.run(id(), 'lavaggio-extra-spiaggia', 'Pulizia sabbia e rientro rapido', 'Evita il supplemento pulizia al rientro dalle giornate di mare.', 1800, 'one_time', 1);

  // Promo codes
  const insPromo = db.prepare(`
    INSERT INTO promo_codes (id, code, type, value, valid_from, valid_to, max_uses, used_count, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
  `);
  insPromo.run(id(), 'CATANIA10', 'percent', 10, '2026-01-01', '2027-12-31', 500);
  insPromo.run(id(), 'BENVENUTO15', 'fixed', 1500, '2026-01-01', '2027-12-31', 200);

  // Reviews
  const insRev = db.prepare(`
    INSERT INTO reviews (id, author_name, rating, text_it, source, is_published)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  insRev.run(id(), 'Marco Rinaldi', 5, 'Ritiro in 5 minuti, Panda nuova e soprattutto zero sorprese sul prezzo rispetto a quanto visto online. Foto fatte insieme alla consegna.', 'Google', );
  insRev.run(id(), 'Giulia Bellini', 5, 'Abbiamo noleggiato la Jeep Avenger per 4 giorni tra Etna e Siracusa. Deposito chiaro e personale super disponibile su WhatsApp.', 'Google');
  insRev.run(id(), 'Salvatore Greco', 5, 'Auto sostitutiva presa al volo in giornata mentre la mia era in officina. Nessuna pressione per assicurazioni extra al desk.', 'Instagram');
  insRev.run(id(), 'Chiara Ferri', 5, 'Gruppo di 8 amici con il Minivan 9 posti: comodo, pulito e riconsegna velocissima con tolleranza sul traffico.', 'Trustpilot');

  // Social Posts
  const insSoc = db.prepare(`
    INSERT INTO social_posts (id, platform, url, thumbnail_url, caption, sort_order, is_published)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  insSoc.run(id(), 'Instagram', 'https://instagram.com', '/src/assets/images/hero_catania_coastal_1795112356471.jpg', 'Alba vista Etna con la nuova flotta pronta per il weekend.', 1);
  insSoc.run(id(), 'TikTok', 'https://tiktok.com', '/src/assets/images/car_fiat_500_1795112356554.jpg', '3 cose da controllare prima di noleggiare un’auto a Catania.', 2);
  insSoc.run(id(), 'Instagram', 'https://instagram.com', '/src/assets/images/car_jeep_avenger_1795112356429.jpg', 'Jeep Avenger appena arrivata in sede: cambio automatico e comfort top.', 3);
  insSoc.run(id(), 'TikTok', 'https://tiktok.com', '/src/assets/images/car_renault_trafic_1795112356606.jpg', 'Viaggiate in 9? Ecco quanto spazio resta per le valigie nel Trafic.', 4);

  // FAQs
  const insFaq = db.prepare(
    'INSERT INTO faqs (id, question_it, answer_it, sort_order) VALUES (?, ?, ?, ?)',
  );
  insFaq.run(id(), 'Il prezzo che vedo online è davvero quello finale?', 'Sì. Nel quinto passaggio prima della conferma mostriamo il dettaglio completo: tariffa giornaliera, eventuali extra, coperture scelte, deposito cauzionale e IVA al 22% inclusa. Nessuna commissione nascosta al ritiro.', 1);
  insFaq.run(id(), 'Posso noleggiare senza carta di credito?', 'Sì, per City Car e Compatte offriamo l’opzione con carta di debito o copertura Kasko Zero Franchigia (impostazione confermabile secondo le regole della sede). Verifica i dettagli nella scheda auto.', 2);
  insFaq.run(id(), 'Qual è la tolleranza se arrivo in ritardo alla riconsegna?', 'Hai sempre 30 minuti di tolleranza gratuita. Se prevedi un ritardo maggiore, avvisaci su WhatsApp prima dell’orario di rientro per concordare l’estensione senza penali impreviste.', 3);
  insFaq.run(id(), 'Come vengono gestiti eventuali graffi o contestazioni sui danni?', 'Al ritiro eseguiamo un check-in fotografico datato insieme a te su tutti i lati dell’auto. Le stesse foto vengono confrontate al rientro: nessuna contestazione su segni preesistenti.', 4);
  insFaq.run(id(), 'Quali documenti servono al ritiro?', 'Patente di guida originale valida (conseguita da almeno 12 mesi), documento d’identità o passaporto in corso di validità e codice di prenotazione.', 5);
  insFaq.run(id(), 'Posso salire sull’Etna o traghettare fuori dalla Sicilia?', 'La salita sull’Etna è sempre consentita (in inverno con dotazioni da neve a bordo). L’uscita dalla Sicilia o l’imbarco su traghetto vanno autorizzati in fase di prenotazione.', 6);

  // Seed sample customer & 2 sample bookings so Admin Dashboard & Gantt look complete immediately
  const sampleCustId = 'cust-sample-1';
  db.prepare(`
    INSERT INTO customers (id, first_name, last_name, email, phone, birth_date, licence_number, licence_issue_date, marketing_consent)
    VALUES (?, 'Luca', 'Esposito', 'luca.esposito@example.it', '+39 347 1122334', '1991-05-14', 'CT8841920A', '2012-09-20', 1)
  `).run(sampleCustId);

  const pandaVehicle = db.prepare("SELECT id FROM vehicles WHERE model_id = 'mod-panda' LIMIT 1").get() as { id: string };
  const avengerVehicle = db.prepare("SELECT id FROM vehicles WHERE model_id = 'mod-avenger' LIMIT 1").get() as { id: string };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
  const in3Days = new Date(todayStart.getTime() + 3 * 86400000);
  const yesterday = new Date(todayStart.getTime() - 1 * 86400000);
  const tomorrow = new Date(todayStart.getTime() + 1 * 86400000);

  db.prepare(`
    INSERT INTO bookings (
      id, code, customer_id, model_id, vehicle_id, pickup_location_id, dropoff_location_id,
      pickup_at, dropoff_at, status, payment_status, payment_mode, insurance_plan,
      subtotal_cents, extras_cents, fees_cents, discount_cents, total_cents, deposit_cents, amount_paid_cents, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'bk-sample-1',
    'SRC-2026-1042',
    sampleCustId,
    'mod-panda',
    pandaVehicle.id,
    locCenterId,
    locCenterId,
    todayStart.toISOString(),
    in3Days.toISOString(),
    'confirmed',
    'unpaid',
    'pay_at_pickup',
    'smart',
    8400,
    0,
    3600,
    0,
    12000,
    15000,
    0,
    'Ritiro previsto in mattinata.',
  );

  db.prepare(`
    INSERT INTO bookings (
      id, code, customer_id, model_id, vehicle_id, pickup_location_id, dropoff_location_id,
      pickup_at, dropoff_at, status, payment_status, payment_mode, insurance_plan,
      subtotal_cents, extras_cents, fees_cents, discount_cents, total_cents, deposit_cents, amount_paid_cents, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'bk-sample-2',
    'SRC-2026-1039',
    sampleCustId,
    'mod-avenger',
    avengerVehicle.id,
    locCenterId,
    locAirportId,
    yesterday.toISOString(),
    tomorrow.toISOString(),
    'active',
    'paid',
    'full_online',
    'kasko_zero',
    11200,
    1200,
    6400,
    0,
    18800,
    0,
    18800,
    'Escursione Etna, riconsegna in aeroporto.',
  );
}
