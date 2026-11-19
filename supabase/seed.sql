-- Smart Rent Car Catania - Sample Italian Seed Data (da confermare con il titolare)

insert into public.site_settings (key, value) values (
  'general',
  '{
    "business_name": "Smart Rent Car Autonoleggio Catania",
    "address_it": "Via Etnea 412, Catania [DA CONFERMARE]",
    "city": "Catania",
    "lat": 37.5158,
    "lng": 15.0781,
    "phone": "+39 095 000 0000 [DA CONFERMARE]",
    "whatsapp": "+39 340 000 0000 [DA CONFERMARE]",
    "email": "info@smartrentcarcatania.it [DA CONFERMARE]",
    "vat_number": "P.IVA 00000000000 [DA CONFERMARE]",
    "opening_hours_it": "Lun–Sab 08:30–20:00 · Dom 09:00–13:00 [DA CONFERMARE]",
    "payment_mode": "pay_at_pickup",
    "deposit_percent": 30,
    "buffer_hours": 2,
    "grace_period_minutes": 30,
    "free_cancellation_hours": 24
  }'::jsonb
) on conflict (key) do nothing;

insert into public.locations (name, address, lat, lng, phone, pickup_instructions_it, is_pickup, is_dropoff, out_of_hours_fee_cents)
values (
  'Sede Catania Centro [DA CONFERMARE]',
  'Via Etnea 412, 95125 Catania CT [DA CONFERMARE]',
  37.5158,
  15.0781,
  '+39 095 000 0000',
  'Raggiungi il nostro desk principale con patente e documento d''identità. Verifica con foto condivisa in 3 minuti.',
  true,
  true,
  2500
);

insert into public.vehicle_categories (slug, name_it, sort_order) values
  ('city-car', 'City Car', 1),
  ('compatte', 'Compatte', 2),
  ('suv-crossover', 'SUV & Crossover', 3),
  ('minivan-9-posti', 'Minivan 9 Posti', 4)
on conflict (slug) do nothing;

insert into public.extras (slug, name_it, description_it, price_cents, pricing_type, max_qty) values
  ('seggiolino-bimbo', 'Seggiolino bimbo', 'Omologato ECE R129 (9–36 kg), igienizzato ad ogni noleggio.', 600, 'per_day', 2),
  ('conducente-aggiuntivo', 'Conducente aggiuntivo', 'Abilita un secondo guidatore con le stesse coperture.', 500, 'per_day', 2),
  ('navigatore-gps', 'Supporto smartphone + caricatore rapido', 'Supporto magnetico e cavo USB-C / Lightning.', 300, 'per_day', 1),
  ('catene-neve-etna', 'Kit catene da neve Etna', 'Omologato per salita sull''Etna nella stagione invernale.', 1500, 'one_time', 1)
on conflict (slug) do nothing;

insert into public.faqs (question_it, answer_it, sort_order) values
  ('Quali documenti servono per ritirare l''auto?', 'Servono patente di guida valida (conseguita da almeno 12 mesi), carta d''identità o passaporto in corso di validità e carta di pagamento.', 1),
  ('Ci sono costi nascosti o sorprese al desk?', 'No. Nel riepilogo finale prima della conferma vedi ogni voce: tariffa base, eventuali extra, deposito cauzionale e IVA inclusa.', 2),
  ('Qual è la tolleranza per il ritardo alla riconsegna?', 'Offriamo 30 minuti di tolleranza gratuita. Oltre i 30 minuti senza preavviso viene applicato un supplemento orario chiaro indicato in contratto.', 3),
  ('Come funziona la verifica danni al ritiro?', 'Al check-in scattiamo foto datate di tutti i lati dell''auto insieme a te e le alleghiamo alla tua prenotazione, così parti sereno senza contestazioni.', 4)
on conflict do nothing;
