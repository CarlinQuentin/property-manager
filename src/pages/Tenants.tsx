import { useEffect, useState } from "react";
import type { Tenant } from "../types";
import { listTenants, createTenant, updateTenant, deleteTenant } from "../api/tenants";
import PortalMenu from "../components/portalMenu"; // 👈 NEW

type EditState = Tenant | null;

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [form, setForm] = useState<Partial<Tenant>>({});
  const [loading, setLoading] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null); // 👈 NEW

  // Load tenants on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listTenants();
        setTenants(data);
      } catch (error) {
        console.error("Error fetching tenants:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function addTenant() {
    if (!form.first_name || !form.last_name) return;
    try {
      const newTenant = await createTenant({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email ?? "",
        phone: form.phone ?? "",
      });
      setTenants((prev) => [newTenant, ...prev]);
      setForm({});
    } catch (error) {
      console.error("Error adding tenant:", error);
    }
  }

  // Row menu helpers
  const openMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId((cur) => (cur === id ? null : id));
    setAnchorEl(e.currentTarget as HTMLElement); // 👈 anchor for PortalMenu
  };

  const onChooseEdit = (e: React.MouseEvent, t: Tenant) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setEditing(t);
  };

  const onChooseDelete = async (e: React.MouseEvent, t: Tenant) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const ok = confirm(`Delete tenant "${t.first_name} ${t.last_name}"?`);
    if (!ok) return;
    try {
      await deleteTenant(t.id as string);
      setTenants((prev) => prev.filter((x) => x.id !== t.id));
    } catch (err) {
      console.error("Failed to delete tenant:", err);
      alert("Failed to delete tenant. They may be referenced by a lease.");
    }
  };

  // Save edit
  const saveEdit = async () => {
    if (!editing?.id || !editing.first_name?.trim() || !editing.last_name?.trim()) return;
    try {
      setSavingEdit(true);
      const updated = await updateTenant(editing.id as string, {
        first_name: editing.first_name,
        last_name: editing.last_name,
        email: editing.email ?? "",
        phone: editing.phone ?? "",
      });
      setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditing(null);
    } catch (err) {
      console.error("Failed to update tenant:", err);
      alert("Failed to update tenant. Check console for details.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <button className="pm-btn" onClick={addTenant}>
          + Add Tenant
        </button>
      </div>

      {/* Add Tenant Form */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          id="tenant-first-name"
          data-testid="tenant-first-name"
          className="pm-input"
          placeholder="First Name"
          value={form.first_name ?? ""}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
        />
        <input
          id="tenant-last-name"
          data-testid="tenant-last-name"
          className="pm-input"
          placeholder="Last Name"
          value={form.last_name ?? ""}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
        />
        <input
          id="tenant-email"
          data-testid="tenant-email"
          className="pm-input"
          placeholder="Email"
          type="email"
          value={form.email ?? ""}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          id="tenant-phone"
          data-testid="tenant-phone"
          className="pm-input"
          placeholder="Phone"
          value={form.phone ?? ""}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>

      {/* Table */}
      <div className="pm-card overflow-auto">
        {loading ? (
          <p>Loading...</p>
        ) : tenants.length === 0 ? (
          <p className="text-slate-600 italic">No tenants yet.</p>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Phone</th>
                <th className="text-right p-2 w-10"> </th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b hover:bg-slate-50">
                  <td className="p-2 font-medium">
                    {t.first_name} {t.last_name}
                  </td>
                  <td className="p-2">{t.email}</td>
                  <td className="p-2">{t.phone}</td>
                  <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block text-left">
                      <button
                        className="rounded p-1 hover:bg-slate-200"
                        aria-label="More"
                        onClick={(e) => openMenu(e, t.id as string)}
                      >
                        <span className="inline-block w-5 text-center">⋯</span>
                      </button>
                      <PortalMenu
                        open={openMenuId === t.id}
                        anchorEl={anchorEl}
                        onClose={() => setOpenMenuId(null)}
                        minWidth={128}
                      >
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={(e) => onChooseEdit(e, t)}
                        >
                          Edit
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={(e) => onChooseDelete(e, t)}
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
            <h2 className="text-lg font-semibold mb-3">Edit Tenant</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                id="edit-tenant-first-name"
                data-testid="edit-tenant-first-name"
                className="pm-input"
                placeholder="First Name"
                value={editing.first_name ?? ""}
                onChange={(e) => setEditing({ ...editing, first_name: e.target.value })}
              />
              <input
                id="edit-tenant-last-name"
                data-testid="edit-tenant-last-name"
                className="pm-input"
                placeholder="Last Name"
                value={editing.last_name ?? ""}
                onChange={(e) => setEditing({ ...editing, last_name: e.target.value })}
              />
              <input
                id="edit-tenant-email"
                data-testid="edit-tenant-email"
                className="pm-input"
                placeholder="Email"
                type="email"
                value={editing.email ?? ""}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              />
              <input
                id="edit-tenant-phone"
                data-testid="edit-tenant-phone"
                className="pm-input"
                placeholder="Phone"
                value={editing.phone ?? ""}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="pm-btn" onClick={saveEdit} disabled={savingEdit || !editing.first_name?.trim() || !editing.last_name?.trim()}>
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
