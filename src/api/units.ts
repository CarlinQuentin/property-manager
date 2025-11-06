// src/api/units.ts
import { supabase } from "../lib/supabase";
import type { Unit, ID } from "../types";

/** Get all units (optionally filter by property_id). */
export async function listUnits(propertyId?: ID): Promise<Unit[]> {
  let q = supabase.from("units").select("*").order("created_at", { ascending: false });
  if (propertyId) q = q.eq("property_id", propertyId);
  const { data, error } = await q;
  if (error) throw error;
  return data as Unit[];
}

/** Get units for a specific property (explicit helper). */
export async function listUnitsForProperty(propertyId: ID): Promise<Unit[]> {
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("property_id", propertyId)
    .order("label", { ascending: true });
  if (error) throw error;
  return data as Unit[];
}

/** Create a new unit under a property. */
export async function createUnit(input: Omit<Unit, "id" | "created_at">): Promise<Unit> {
  const { data, error } = await supabase
    .from("units")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Unit;
}

/** Rename/update a unit (partial update). */
export async function updateUnit(id: ID, patch: Partial<Omit<Unit, "id" | "property_id">>): Promise<Unit> {
  const { data, error } = await supabase
    .from("units")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Unit;
}

/** Delete a unit (will fail if a lease references it). */
export async function deleteUnit(id: ID): Promise<void> {
  const { error } = await supabase.from("units").delete().eq("id", id);
  if (error) throw error;
}
