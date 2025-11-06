import { supabase } from "../lib/supabase";
import type { Lease } from "../types";

export type LeaseRow = {
  id: string;
  start_date: string;
  end_date: string | null;
  rent_cents: number;
  due_day: number;
  deposit_cents: number | null;
  status: Lease["status"];
  unit: { id: string; label: string; property: { id: string; name: string } };
  tenant: { id: string; first_name: string; last_name: string };
};

export async function listLeases(): Promise<LeaseRow[]> {
  const { data, error } = await supabase
    .from("leases")
    .select(`
      id, start_date, end_date, rent_cents, due_day, deposit_cents, status,
      unit:units ( id, label, property:properties ( id, name ) ),
      tenant:tenants ( id, first_name, last_name )
    `)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return data as unknown as LeaseRow[];
}

export async function createLease(input: Omit<Lease, "id" | "created_at">): Promise<LeaseRow> {
  const { data, error } = await supabase
    .from("leases")
    .insert(input)
    .select(`
      id, start_date, end_date, rent_cents, due_day, deposit_cents, status,
      unit:units ( id, label, property:properties ( id, name ) ),
      tenant:tenants ( id, first_name, last_name )
    `)
    .single();
  if (error) throw error;
  return data as unknown as LeaseRow;
}

export async function updateLease(
  id: string,
  patch: Partial<Omit<Lease, "id" | "created_at">>
): Promise<import("./leases").LeaseRow> {
  const { data, error } = await supabase
    .from("leases")
    .update(patch)
    .eq("id", id)
    .select(
      `
      id, start_date, end_date, rent_cents, due_day, deposit_cents, status,
      unit:units ( id, label, property:properties ( id, name ) ),
      tenant:tenants ( id, first_name, last_name )
    `
    )
    .single();
  if (error) throw error;
  return data as unknown as import("./leases").LeaseRow;
}

export async function deleteLease(id: string): Promise<void> {
  const { error } = await supabase.from("leases").delete().eq("id", id);
  if (error) throw error;
}