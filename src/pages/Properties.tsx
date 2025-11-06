import { useEffect, useState } from "react";
import type { Property, PropertyType } from "../types";
import {
  listProperties,
  createProperty,
  updateProperty,   // 👈 make sure this exists in ../api/properties
  deleteProperty,   // 👈 and this too
} from "../api/properties";
import { useNavigate } from "react-router-dom";
import PortalMenu from "../components/portalMenu"; // 👈 NEW

type EditState = (Omit<Property, "created_at"> & { property_type?: PropertyType }) | null;

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState<Partial<Property> & { property_type?: "single" | "multi" }>({
    property_type: "single",
  });
  const [loading, setLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null); // 👈 NEW

  const navigate = useNavigate();

  // Load properties
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listProperties();
        setProperties(data);
      } catch (err) {
        console.error("Error fetching properties:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Add
  const addProperty = async () => {
    if (!form.name) return;
    try {
      const newProp = await createProperty({
        name: form.name!,
        address1: form.address1 ?? "",
        city: form.city ?? "",
        state: form.state ?? "",
        postal_code: form.postal_code ?? "",
        property_type: form.property_type ?? "single",
      });
      setProperties((prev) => [newProp, ...prev]);
      setForm({ property_type: "single" });
    } catch (err) {
      console.error("Error adding property:", err);
    }
  };

  // Open menu for a row
  const openMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId((cur) => (cur === id ? null : id));
    setAnchorEl(e.currentTarget as HTMLElement); // 👈 anchor for PortalMenu
  };

  // Edit selected property
  const onChooseEdit = (e: React.MouseEvent, p: Property) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setEditing({
      ...p,
      property_type: (p as any).property_type ?? "single",
    });
  };

  // Delete selected property
  const onChooseDelete = async (e: React.MouseEvent, p: Property) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const ok = confirm(
      `Delete "${p.name}"? This will also remove related units/leases/payments if your DB has cascading rules.`
    );
    if (!ok) return;
    try {
      await deleteProperty(p.id as string);
      setProperties((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      console.error("Failed to delete property:", err);
      alert("Failed to delete property. Check console for details.");
    }
  };

  // Save edit
  const saveEdit = async () => {
    if (!editing?.id || !editing.name) return;
    try {
      setSavingEdit(true);
      const patch = {
        name: editing.name,
        address1: editing.address1 ?? "",
        city: editing.city ?? "",
        state: editing.state ?? "",
        postal_code: editing.postal_code ?? "",
        // Only include property_type if your schema has this column
        property_type: (editing as any).property_type ?? "single",
      } as any;

      const updated = await updateProperty(editing.id as string, patch);
      setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditing(null);
    } catch (err) {
      console.error("Failed to update property:", err);
      alert("Failed to update property. Check console for details.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Properties</h1>
        <button onClick={addProperty} className="pm-btn">
          + Add Property
        </button>
      </div>

      {/* Add form */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input
          className="pm-input"
          placeholder="Name"
          value={form.name ?? ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="pm-input"
          placeholder="Address"
          value={form.address1 ?? ""}
          onChange={(e) => setForm({ ...form, address1: e.target.value })}
        />
        <input
          className="pm-input"
          placeholder="City"
          value={form.city ?? ""}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
        <input
          className="pm-input"
          placeholder="State"
          value={form.state ?? ""}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
        />
        <input
          className="pm-input"
          placeholder="Postal Code"
          value={form.postal_code ?? ""}
          onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
        />
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-700">Property type:</label>
          <select
            className="pm-input"
            value={form.property_type ?? "single"}
            onChange={(e) => setForm({ ...form, property_type: e.target.value as "single" | "multi" })}
          >
            <option value="single">Single-family</option>
            <option value="multi">Multi-unit</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="pm-card overflow-auto">
          {properties.length === 0 ? (
            <p className="text-slate-600 italic">No properties yet.</p>
          ) : (
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Address</th>
                  <th className="text-left p-2">City</th>
                  <th className="text-left p-2">State</th>
                  <th className="text-left p-2">Postal</th>
                  <th className="text-right p-2 w-10"> </th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/properties/${p.id}`)}
                    className="border-b cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <td className="p-2 font-medium">{p.name}</td>
                    <td className="p-2">{p.address1}</td>
                    <td className="p-2">{p.city}</td>
                    <td className="p-2">{p.state}</td>
                    <td className="p-2">{p.postal_code}</td>
                    <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block text-left">
                        <button
                          className="rounded p-1 hover:bg-slate-200"
                          aria-label="More"
                          onClick={(e) => openMenu(e, p.id as string)}
                        >
                          {/* simple ellipsis */}
                          <span className="inline-block w-5 text-center">⋯</span>
                        </button>
                      <PortalMenu
                        open={openMenuId === p.id}
                        anchorEl={anchorEl}
                        onClose={() => setOpenMenuId(null)}
                        minWidth={128}
                      >
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={(e) => onChooseEdit(e, p)}
                        >
                          Edit
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={(e) => onChooseDelete(e, p)}
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
      )}

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-20 grid place-items-center bg-black/40"
          onClick={() => setEditing(null)}
        >
          <div
            className="pm-card w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-3">Edit Property</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="pm-input"
                placeholder="Name"
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <select
                className="pm-input"
                value={(editing as any).property_type ?? "single"}
                onChange={(e) =>
                  setEditing({ ...editing, property_type: e.target.value as "single" | "multi" } as any)
                }
              >
                <option value="single">Single-family</option>
                <option value="multi">Multi-unit</option>
              </select>
              <input
                className="pm-input"
                placeholder="Address"
                value={editing.address1 ?? ""}
                onChange={(e) => setEditing({ ...editing, address1: e.target.value })}
              />
              <input
                className="pm-input"
                placeholder="City"
                value={editing.city ?? ""}
                onChange={(e) => setEditing({ ...editing, city: e.target.value })}
              />
              <input
                className="pm-input"
                placeholder="State"
                value={editing.state ?? ""}
                onChange={(e) => setEditing({ ...editing, state: e.target.value })}
              />
              <input
                className="pm-input"
                placeholder="Postal Code"
                value={editing.postal_code ?? ""}
                onChange={(e) => setEditing({ ...editing, postal_code: e.target.value })}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="pm-btn" onClick={saveEdit} disabled={savingEdit || !editing.name?.trim()}>
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
