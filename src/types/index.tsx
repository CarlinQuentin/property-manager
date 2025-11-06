// src/types/index.ts

export type ID = string;

export type PropertyType = 'single' | 'multi';


export type Property = {
  id: ID;
  name: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  notes?: string;
  created_at?: string; // ISO
   property_type?: PropertyType; // ⬅️ new (optional in type to avoid breaking older code)
};

export type Unit = {
  id: ID;
  property_id: ID;
  label: string;          // "Single Family Home", "Unit A", etc.
  bedrooms?: number | null;
  bathrooms?: number | null; // allow decimal like 1.5
  sqft?: number | null;
  is_default: boolean;
  created_at?: string;    // ISO
};

export type Tenant = {
  id: ID;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  created_at?: string;
};

export type LeaseStatus = 'pending' | 'active' | 'ended' | 'defaulted';

export type Lease = {
  id: ID;
  unit_id: ID;            // ⬅️ IMPORTANT: leases attach to a unit
  tenant_id: ID;
  start_date: string;     // YYYY-MM-DD
  end_date?: string;      // YYYY-MM-DD
  rent_cents: number;
  due_day: number;        // 1–28
  deposit_cents?: number;
  status: LeaseStatus;
  created_at?: string;
};

export type PaymentMethod = 'cash' | 'check' | 'ach' | 'card' | 'other';

export type Payment = {
  id: ID;
  lease_id: ID;
  paid_on: string;        // YYYY-MM-DD
  amount_cents: number;
  method: PaymentMethod;
  memo?: string;
  created_at?: string;
};
