export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'paid' | 'refunded';
export type PaymentMode = 'pay_at_pickup' | 'deposit_online' | 'full_online';

export interface SiteSettings {
  business_name: string;
  address_it: string;
  city: string;
  lat: number;
  lng: number;
  phone: string;
  whatsapp: string;
  email: string;
  vat_number: string;
  opening_hours_it: string;
  instagram_handle: string;
  tiktok_handle: string;
  payment_mode: PaymentMode;
  deposit_percent: number;
  buffer_hours: number;
  grace_period_minutes: number;
  free_cancellation_hours: number;
  young_driver_min_age: number;
  young_driver_threshold_age: number;
  young_driver_fee_per_day_cents: number;
  one_way_fee_cents: number;
  no_credit_card_option: boolean;
  airport_service_enabled: boolean;
  placeholder_notice_it: string;
}

export interface LocationItem {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  opening_hours_it: string;
  pickup_instructions_it: string;
  is_pickup: boolean;
  is_dropoff: boolean;
  out_of_hours_fee_cents: number;
  is_active: boolean;
}

export interface VehicleCategory {
  id: string;
  slug: string;
  name_it: string;
  sort_order: number;
}

export interface VehicleModel {
  id: string;
  category_id: string;
  category_name_it?: string;
  category_slug?: string;
  slug: string;
  brand: string;
  name: string;
  seats: number;
  bags: number;
  doors: number;
  transmission: 'Manuale' | 'Automatico';
  fuel: 'Benzina' | 'Diesel' | 'Ibrida' | 'Elettrica';
  has_ac: boolean;
  description_it: string;
  fuel_policy_it: string;
  images: string[];
  features: string[];
  is_active: boolean;
  min_daily_price_cents?: number;
}

export interface VehicleUnit {
  id: string;
  model_id: string;
  model_name?: string;
  plate: string;
  color: string;
  mileage: number;
  status: 'available' | 'maintenance' | 'retired';
  insurance_expiry: string;
  service_due: string;
}

export interface RateTier {
  id: string;
  model_id: string;
  season_name: string;
  season_start: string | null;
  season_end: string | null;
  min_days: number;
  max_days: number;
  daily_price_cents: number;
  km_included: string;
  deposit_cents: number;
}

export interface ExtraItem {
  id: string;
  slug: string;
  name_it: string;
  description_it: string;
  price_cents: number;
  pricing_type: 'per_day' | 'one_time';
  max_qty: number;
  is_active: boolean;
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  valid_from: string;
  valid_to: string;
  max_uses: number;
  used_count: number;
  is_active: boolean;
}

export interface ReviewItem {
  id: string;
  author_name: string;
  rating: number;
  text_it: string;
  source: 'Google' | 'Instagram' | 'Trustpilot' | 'Altro';
  is_published: boolean;
  created_at: string;
}

export interface SocialPostItem {
  id: string;
  platform: 'Instagram' | 'TikTok';
  url: string;
  thumbnail_url: string;
  caption: string;
  sort_order: number;
  is_published: boolean;
}

export interface FaqItem {
  id: string;
  question_it: string;
  answer_it: string;
  sort_order: number;
}

export interface LeadItem {
  id: string;
  type: 'contact' | 'long_term';
  name: string;
  email: string;
  phone: string;
  message: string;
  status: 'new' | 'contacted' | 'closed';
  created_at: string;
}

export interface BlockedDateItem {
  id: string;
  vehicle_id: string | null;
  start_at: string;
  end_at: string;
  reason: string;
}

export interface InspectionItem {
  id: string;
  booking_id: string;
  type: 'checkin' | 'checkout';
  photos: string[];
  notes: string;
  fuel_level: string;
  mileage: number;
  signed_at: string;
}

export type InsurancePlan = 'base' | 'smart' | 'kasko_zero';

export interface PriceQuote {
  days: number;
  daily_price_cents: number;
  base_cents: number;
  extras_cents: number;
  insurance_cents: number;
  young_driver_fee_cents: number;
  out_of_hours_fee_cents: number;
  one_way_fee_cents: number;
  fees_cents: number;
  discount_cents: number;
  total_cents: number;
  vat_included_cents: number;
  deposit_cents: number;
  amount_due_now_cents: number;
  amount_due_at_pickup_cents: number;
  km_included: string;
  promo_applied: string | null;
  breakdown_lines: Array<{ label: string; amount_cents: number }>;
}

export interface AvailableModelResult {
  model: VehicleModel;
  free_units_count: number;
  quote: PriceQuote;
  rates: RateTier[];
}

export interface BookingRecord {
  id: string;
  code: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  model_id: string;
  model_name: string;
  model_image: string;
  vehicle_id: string;
  vehicle_plate: string;
  pickup_location_id: string;
  pickup_location_name: string;
  dropoff_location_id: string;
  dropoff_location_name: string;
  pickup_at: string;
  dropoff_at: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_mode: PaymentMode;
  insurance_plan: InsurancePlan;
  subtotal_cents: number;
  extras_cents: number;
  fees_cents: number;
  discount_cents: number;
  total_cents: number;
  deposit_cents: number;
  amount_paid_cents: number;
  notes: string;
  created_at: string;
  expires_at: string | null;
  extras?: Array<{ extra_id: string; name_it: string; quantity: number; price_cents: number }>;
  inspections?: InspectionItem[];
}

export interface BootstrapData {
  settings: SiteSettings;
  locations: LocationItem[];
  categories: VehicleCategory[];
  models: VehicleModel[];
  rates: RateTier[];
  extras: ExtraItem[];
  reviews: ReviewItem[];
  socialPosts: SocialPostItem[];
  faqs: FaqItem[];
}
