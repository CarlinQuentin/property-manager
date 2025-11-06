import { supabase } from "../lib/supabase";
import type { Payment } from "../types";

export type PaymentRow = {
  id: string;
  paid_on: string;
  amount_cents: number;
  method: Payment["method"];
  memo: string | null;
  created_at: string;
  lease: {
    id: string;
    unit: { id: string; label: string; property: { id: string; name: string } };
    tenant: { id: string; first_name: string; last_name: string };
  };
};

export async function listPayments(): Promise<PaymentRow[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      id, paid_on, amount_cents, method, memo, created_at,
      lease:leases (
        id,
        unit:units ( id, label, property:properties ( id, name ) ),
        tenant:tenants ( id, first_name, last_name )
      )
    `)
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as PaymentRow[];
}

export async function createPayment(input: Omit<Payment, "id" | "created_at">): Promise<PaymentRow> {
  const { data, error } = await supabase
    .from("payments")
    .insert(input)
    .select(`
      id, paid_on, amount_cents, method, memo, created_at,
      lease:leases (
        id,
        unit:units ( id, label, property:properties ( id, name ) ),
        tenant:tenants ( id, first_name, last_name )
      )
    `)
    .single();
  if (error) throw error;
  return data as unknown as PaymentRow;
}

export async function updatePayment(
  id: string,
  patch: Partial<Omit<Payment, "id" | "created_at">>
): Promise<import("./payments").PaymentRow> {
  const { data, error } = await supabase
    .from("payments")
    .update(patch)
    .eq("id", id)
    .select(
      `
      id, paid_on, amount_cents, method, memo, created_at,
      lease:leases (
        id,
        unit:units ( id, label, property:properties ( id, name ) ),
        tenant:tenants ( id, first_name, last_name )
      )
    `
    )
    .single();
  if (error) throw error;
  return data as unknown as import("./payments").PaymentRow;
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw error;
}