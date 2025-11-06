import { supabase } from "../lib/supabase";
import type { Tenant } from "../types";

export async function listTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Tenant[];
}

export async function createTenant(input: Omit<Tenant, "id" | "created_at">): Promise<Tenant> {
  const { data, error } = await supabase
    .from("tenants")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Tenant;
}

export async function updateTenant(id: string, patch: Partial<Omit<Tenant, "id">>): Promise<Tenant> {
  const { data, error } = await supabase
    .from("tenants")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Tenant;
}

export async function deleteTenant(id: string): Promise<void> {
  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) throw error;
}