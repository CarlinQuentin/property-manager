import { supabase } from "../lib/supabase";
import type { Property, PropertyType } from "../types";

export async function listProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Property[];
}

export async function createProperty(
  p: Omit<Property, "id" | "created_at"> & { property_type?: PropertyType }
) {
  const { data, error } = await supabase
    .from("properties")
    .insert(p)
    .select()
    .single();
  if (error) throw error;
  return data as Property;
}

export async function updateProperty(
  id: string,
  updates: Partial<Property> & { property_type?: PropertyType }
): Promise<Property> {
  const { data, error } = await supabase
    .from("properties")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Property;
}

// === New: Delete property ===
export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw error;
}