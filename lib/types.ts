export interface Property {
  id: string
  user_id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  property_type: 'apartment' | 'house' | 'condo' | 'townhouse' | 'commercial'
  bedrooms: number
  bathrooms: number
  square_feet: number | null
  monthly_rent: number
  status: 'vacant' | 'occupied' | 'maintenance'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Tenant {
  id: string
  user_id: string
  property_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  lease_start: string | null
  lease_end: string | null
  rent_amount: number
  security_deposit: number
  status: 'active' | 'inactive' | 'pending'
  notes: string | null
  auth_user_id: string | null
  portal_enabled: boolean
  invited_at: string | null
  portal_activated_at: string | null
  created_at: string
  updated_at: string
  property?: Property | null
}

export interface TenantInvite {
  id: string
  user_id: string
  tenant_id: string
  email: string
  token: string
  status: 'pending' | 'accepted' | 'expired'
  expires_at: string
  accepted_at: string | null
  created_at: string
  tenant?: Tenant
}

export interface RentSchedule {
  id: string
  user_id: string
  tenant_id: string
  property_id: string | null
  amount: number
  day_of_month: number
  active: boolean
  last_generated_for: string | null
  created_at: string
  updated_at: string
  tenant?: Tenant
  property?: Property
}

export interface PropertyOwner {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  company_name: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RentPayment {
  id: string
  user_id: string
  tenant_id: string
  property_id: string | null
  amount: number
  due_date: string
  paid_date: string | null
  status: 'pending' | 'paid' | 'overdue' | 'partial'
  payment_method: string | null
  notes: string | null
  is_recurring: boolean
  recurring_day: number | null
  rent_schedule_id: string | null
  stripe_session_id: string | null
  stripe_payment_intent: string | null
  receipt_number: string | null
  created_at: string
  updated_at: string
  tenant?: Tenant
  property?: Property
}

export interface MaintenanceRequest {
  id: string
  user_id: string
  property_id: string
  tenant_id: string | null
  title: string
  description: string
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'general'
  urgency: 'low' | 'medium' | 'high' | 'emergency'
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  estimated_cost: number | null
  actual_cost: number | null
  scheduled_date: string | null
  completed_date: string | null
  notes: string | null
  photo_paths: string[] | null
  created_at: string
  updated_at: string
  tenant?: Tenant
  property?: Property
}

export interface Message {
  id: string
  user_id: string
  tenant_id: string
  property_id: string | null
  subject: string
  body: string
  direction: 'inbound' | 'outbound'
  sender_role: 'manager' | 'tenant'
  is_read: boolean
  created_at: string
  tenant?: Tenant
  property?: Property
}

export interface Expense {
  id: string
  user_id: string
  property_id: string | null
  category: 'repairs' | 'utilities' | 'insurance' | 'taxes' | 'management' | 'supplies' | 'landscaping' | 'cleaning' | 'other'
  description: string
  amount: number
  date: string
  vendor: string | null
  receipt_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  property?: Property
}

export interface Notification {
  id: string
  user_id: string
  recipient_type: 'manager' | 'tenant'
  type: 'payment_received' | 'payment_due' | 'payment_overdue' | 'maintenance_new' | 'maintenance_updated' | 'maintenance_completed' | 'message_received' | 'lease_expiring' | 'tenant_added' | 'invoice_issued' | 'general'
  title: string
  message: string
  link: string | null
  related_id: string | null
  is_read: boolean
  created_at: string
}

export interface FileFolder {
  id: string
  user_id: string
  name: string
  parent_id: string | null
  created_at: string
  updated_at: string
  children?: FileFolder[]
}

export interface FileRecord {
  id: string
  user_id: string
  folder_id: string | null
  tenant_id: string | null
  property_id: string | null
  owner_id: string | null
  file_name: string
  file_size: number
  mime_type: string | null
  storage_path: string
  is_template: boolean
  description: string | null
  created_at: string
  updated_at: string
  folder?: FileFolder | null
  tenant?: Pick<Tenant, 'id' | 'first_name' | 'last_name'> | null
  property?: Pick<Property, 'id' | 'name'> | null
}

export interface DashboardStats {
  totalProperties: number
  occupiedProperties: number
  vacantProperties: number
  totalTenants: number
  monthlyRevenue: number
  pendingPayments: number
  overduePayments: number
  openMaintenanceRequests: number
}
