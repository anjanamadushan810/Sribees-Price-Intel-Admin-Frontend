export type Role = 'super_admin' | 'branch_manager' | 'marketing_manager' | 'price_checker'

export interface Branch {
  branch_id: string
  name: string
  is_active: boolean
  products: number
}

export interface User {
  user_id: string
  email: string
  full_name: string
  role: Role
  all_branches: boolean
  is_active: boolean
  totp_enabled: boolean
  last_login_at: string | null
  branches: Branch[]
}

export interface Me extends User {
  permissions: string[]
  two_factor: boolean
}

export interface Tokens {
  status: 'ok'
  access_token: string
  expires_in: number
}

export interface Step {
  status: 'totp_required' | 'totp_setup_required'
  ticket: string
}

export interface AuditEntry {
  audit_id: number
  occurred_at: string
  user_id: string | null
  action: string
  entity: string
  entity_id: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip_address?: string | null
}

export interface Session {
  session_id: string
  user_agent: string | null
  ip_address: string | null
  created_at: string
  last_used_at: string
  expires_at: string
  current: boolean
}

export interface Competitor {
  competitor_id: number
  code: string
  name: string
  kind: 'scraped' | 'manual'
  adapter: string | null
  base_url: string | null
  is_enabled: boolean
  status: 'ok' | 'failing' | 'blocked' | 'pending'
  notes: string | null
  last_run_at: string | null
  last_ok_at: string | null
  running: boolean
}

export interface Run {
  run_id: number
  started_at: string
  finished_at: string | null
  status: 'running' | 'ok' | 'failed' | 'blocked'
  requests: number
  items_seen: number
  error: string | null
}

export interface Item {
  item_id: string
  competitor_id: number
  name: string
  brand: string | null
  size_value: string | null
  size_unit: string | null
  url: string | null
  image_url: string | null
  last_price: string | null
  last_mrp: string | null
  in_stock: boolean
  last_seen_at: string
  /** Sold loose: last_price is for size_value (none = 1 kg / 1 l) */
  loose: boolean
  /** Set when a person chose that amount; the daily run then keeps it */
  price_for_by: string | null
}

export interface CompetitorPrice {
  competitor_id: number
  competitor: string
  match_id: string
  status: 'auto' | 'confirmed'
  item: Item
  fresh: boolean
  /** Their price at our pack size (a bulk price scaled), null when it cannot be compared */
  compare_price: string | null
}

export type Position = 'cheaper' | 'equal' | 'dearer' | 'unknown'

export interface ProductRow {
  product_id: string
  name: string
  name_si: string | null
  sku: string | null
  category: string | null
  image_url: string | null
  review_level: 'daily' | 'weekly' | 'monthly' | 'long'
  mrp: string | null
  our_price: string | null
  cost_price: string | null
  cheapest_price: string | null
  cheapest_competitor: string | null
  cheapest_image: string | null
  position: Position
  prices: CompetitorPrice[]
  pending_suggestion_id: string | null
}

export interface ProductPage {
  items: ProductRow[]
  total: number
  page: number
  pages: number
}

export interface HistoryPoint {
  competitor: string
  price: string
  seen_at: string
  source: 'scrape' | 'manual'
}

export interface MatchQueueItem {
  match_id: string
  product_id: string
  product_name: string
  product_size: string | null
  competitor_id: number
  competitor: string
  score: string
  item: Item
  our_price: string | null
  product_image: string | null
  method: 'barcode' | 'name' | 'manual'
  flags: string[]
  /** Their price at our pack size (a bulk price scaled) */
  compare_price: string | null
}

export interface MatchHealthItem {
  match_id: string
  product_id: string
  product_name: string
  product_size: string | null
  product_image: string | null
  our_price: string | null
  competitor_id: number
  competitor: string
  status: 'changed' | 'gone'
  was: string | null
  method: string
  note: string | null
  since: string | null
  seen_name: string | null
  item: Item
}

export interface MatchHealthPage {
  items: MatchHealthItem[]
  total: number
  page: number
  pages: number
}

export interface MatchQueuePage {
  items: MatchQueueItem[]
  total: number
  page: number
  pages: number
  no_price_yet: number
}

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'superseded' | 'failed' | 'applied'

export interface Suggestion {
  suggestion_id: string
  branch_id: string
  branch: string
  product_id: string
  product_name: string
  sku: string | null
  current_price: string
  suggested_price: string
  cheapest_price: string
  cheapest_competitor: string
  cost_price: string
  floor_price: string
  reason: 'match_cheapest' | 'floor'
  status: SuggestionStatus
  created_at: string
  decided_at: string | null
  applied_at: string | null
  apply_error: string | null
}

export interface Summary {
  products: number
  tracked: number
  cheaper: number
  equal: number
  dearer: number
  unknown: number
  cost_missing: number
  pending_suggestions: number
  match_queue: number
  sources_down: string[]
}

export interface PricingSettings {
  min_margin_pct: string | number
  stale_days: Record<'daily' | 'weekly' | 'monthly' | 'long', number>
}

export interface AssortmentItem {
  item_id: string
  competitor_id: number
  competitor_name: string
  name: string
  brand: string | null
  barcode: string | null
  size_value: string | null
  size_unit: string | null
  url: string | null
  image_url: string | null
  last_price: string | null
  last_mrp: string | null
  in_stock: boolean
  first_seen_at: string
  last_seen_at: string
}

export interface AssortmentPage {
  items: AssortmentItem[]
  total: number
  page: number
  pages: number
}

export interface AssortmentStats {
  total_gaps: number
  in_stock_gaps: number
  new_this_week: number
}

export interface CrawlStatus {
  is_running: boolean
  competitor_id: number | null
  message: string | null
}

