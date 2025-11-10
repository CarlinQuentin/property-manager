import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import type { Property, Unit } from "../types";
import { listUnitsForProperty, createUnit, updateUnit, deleteUnit } from "../api/units";
import { supabase } from "../lib/supabase";
import PortalMenu from "../components/portalMenu"; // 👈 NEW

type EditState = Unit | null;

export default function PropertyDetail() {
  const { id } = useParams();               // /properties/:id
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Unit>>({ label: "" });
  const [saving, setSaving] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null); // 👈 NEW

  // row menu + edit modal
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        // fetch property
        const { data: prop, error: perr } = await supabase
          .from("properties")
          .select("*")
          .eq("id", id)
          .single();
        if (perr) throw perr;
        setProperty(prop as Property);

        // fetch units
        const us = await listUnitsForProperty(id);
        setUnits(us);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function addUnit() {
    if (!id || !form.label?.trim()) return;
    try {
      setSaving(true);
      const newUnit = await createUnit({
        property_id: id,
        label: form.label!.trim(),
        bedrooms: form.bedrooms ?? null,
        bathrooms: form.bathrooms ?? null,
        sqft: form.sqft ?? null,
        is_default: Boolean(form.is_default),
      });
      setUnits((prev) => [...prev, newUnit].sort((a, b) => a.label.localeCompare(b.label)));
      setForm({ label: "" });
    } catch (e) {
      console.error("Failed to add unit:", e);
    } finally {
      setSaving(false);
    }
  }

  // Row menu helpers
  const openMenu = (e: React.MouseEvent, unitId: string) => {
    e.stopPropagation();
    setOpenMenuId((cur) => (cur === unitId ? null : unitId));
    setAnchorEl(e.currentTarget as HTMLElement); // 👈 anchor for PortalMenu
  };

  const onChooseEdit = (e: React.MouseEvent, u: Unit) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setEditing(u);
  };

  const onChooseDelete = async (e: React.MouseEvent, u: Unit) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const ok = confirm(`Delete unit "${u.label}"? This may affect existing leases.`);
    if (!ok) return;
    try {
      await deleteUnit(u.id as string);
      setUnits((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      console.error("Failed to delete unit:", err);
      alert("Failed to delete unit. It may be referenced by leases.");
    }
  };

  const saveEdit = async () => {
    if (!editing?.id) return;
    try {
      setSavingEdit(true);
      const patch = {
        label: editing.label,
        bedrooms: editing.bedrooms ?? null,
        bathrooms: editing.bathrooms ?? null,
        sqft: editing.sqft ?? null,
        is_default: Boolean(editing.is_default),
      };
      const updated = await updateUnit(editing.id as string, patch);
      setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditing(null);
    } catch (err) {
      console.error("Failed to update unit:", err);
      alert("Failed to update unit. Check console for details.");
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }
  if (!property) {
    return (
      <div className="p-6">
        <p className="text-red-600">Property not found.</p>
        <button className="pm-btn mt-3" onClick={() => navigate("/properties")}>Back to Properties</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{property.name}</h1>
          <p className="text-slate-600 text-sm">
            {property.address1 ?? ""} {property.city ? `• ${property.city}, ${property.state ?? ""}` : ""}
          </p>
        </div>
        <Link to="/properties" className="pm-btn">← Back</Link>
      </div>

      {/* Units: add form */}
      <div className="pm-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Units</h2>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            id="unit-label"
            data-testid="unit-label"
            className="pm-input"
            placeholder='Label (e.g., "Single Family Home", "Unit A")'
            value={form.label ?? ""}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <input
            id="unit-bedrooms"
            data-testid="unit-bedrooms"
            className="pm-input"
            type="number"
            placeholder="Bedrooms"
            value={form.bedrooms ?? ""}
            onChange={(e) => setForm({ ...form, bedrooms: e.target.value ? Number(e.target.value) : undefined })}
          />
          <input
            id="unit-bathrooms"
            data-testid="unit-bathrooms"
            className="pm-input"
            type="number"
            step="0.5"
            placeholder="Bathrooms"
            value={form.bathrooms ?? ""}
            onChange={(e) => setForm({ ...form, bathrooms: e.target.value ? Number(e.target.value) : undefined })}
          />
          <input
            id="unit-sqft"
            data-testid="unit-sqft"
            className="pm-input"
            type="number"
            placeholder="Sq Ft"
            value={form.sqft ?? ""}
            onChange={(e) => setForm({ ...form, sqft: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>

        <div className="mt-3">
          <label className="inline-flex items-center gap-2 text-sm" htmlFor="unit-default">
            <input
              id="unit-default"
              data-testid="unit-default"
              type="checkbox"
              checked={Boolean(form.is_default)}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            />
            Mark as default unit
          </label>
        </div>

        <div className="mt-3">
          <button className="pm-btn" onClick={addUnit} disabled={saving || !form.label?.trim()}>
            {saving ? "Adding..." : "+ Add Unit"}
          </button>
        </div>
      </div>

      {/* Units table */}
      <div className="pm-card overflow-auto">
        {units.length === 0 ? (
          <p className="text-slate-600 italic">No units yet.</p>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Label</th>
                <th className="text-left p-2">Beds</th>
                <th className="text-left p-2">Baths</th>
                <th className="text-left p-2">Sq Ft</th>
                <th className="text-left p-2">Default</th>
                <th className="text-right p-2 w-10"> </th>
              </tr>
            </thead>
            <tbody>
              {units.sort((a, b) => a.label.localeCompare(b.label)).map((u) => (
                <tr key={u.id} className="border-b hover:bg-slate-50">
                  <td className="p-2">{u.label}</td>
                  <td className="p-2">{u.bedrooms ?? ""}</td>
                  <td className="p-2">{u.bathrooms ?? ""}</td>
                  <td className="p-2">{u.sqft ?? ""}</td>
                  <td className="p-2">{u.is_default ? "Yes" : ""}</td>
                  <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block text-left">
                      <button
                        className="rounded p-1 hover:bg-slate-200"
                        aria-label="More"
                        onClick={(e) => openMenu(e, u.id as string)}
                      >
                        <span className="inline-block w-5 text-center">⋯</span>
                      </button>
                      <PortalMenu
                        open={openMenuId === u.id}
                        anchorEl={anchorEl}
                        onClose={() => setOpenMenuId(null)}
                        minWidth={128}
                      >
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={(e) => onChooseEdit(e, u)}
                        >
                          Edit
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={(e) => onChooseDelete(e, u)}
                        >
                          Delete
                        </button>
                      </PortalMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/40" onClick={() => setEditing(null)}>
          <div className="pm-card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-3">Edit Unit</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                id="edit-unit-label"
                data-testid="edit-unit-label"
                className="pm-input"
                placeholder="Label"
                value={editing.label ?? ""}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
              />
              <label className="inline-flex items-center gap-2 px-2" htmlFor="edit-unit-default">
                <input
                  id="edit-unit-default"
                  data-testid="edit-unit-default"
                  type="checkbox"
                  checked={Boolean(editing.is_default)}
                  onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
                />
                Default unit
              </label>
              <input
                id="edit-unit-bedrooms"
                data-testid="edit-unit-bedrooms"
                className="pm-input"
                type="number"
                placeholder="Bedrooms"
                value={editing.bedrooms ?? ""}
                onChange={(e) => setEditing({ ...editing, bedrooms: e.target.value ? Number(e.target.value) : null })}
              />
              <input
                id="edit-unit-bathrooms"
                data-testid="edit-unit-bathrooms"
                className="pm-input"
                type="number"
                step="0.5"
                placeholder="Bathrooms"
                value={editing.bathrooms ?? ""}
                onChange={(e) => setEditing({ ...editing, bathrooms: e.target.value ? Number(e.target.value) : null })}
              />
              <input
                id="edit-unit-sqft"
                data-testid="edit-unit-sqft"
                className="pm-input"
                type="number"
                placeholder="Sq Ft"
                value={editing.sqft ?? ""}
                onChange={(e) => setEditing({ ...editing, sqft: e.target.value ? Number(e.target.value) : null })}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="pm-btn" onClick={saveEdit} disabled={savingEdit || !editing.label?.trim()}>
                {savingEdit ? "Saving..." : "Save"}
              </button>
              <button className="px-3 py-2 rounded border" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
