import { useEffect, useMemo, useState } from "react";
import type { Lease, Tenant, Property, Unit } from "../types";
import { listProperties } from "../api/properties";
import { listTenants } from "../api/tenants";
import { listUnitsForProperty } from "../api/units";
import {
  listLeases,
  createLease,
  updateLease,     // 👈 update
  deleteLease,     // 👈 update
  type LeaseRow,
} from "../api/leases";
import { formatDate } from "../utils/formatter";
import PortalMenu from "../components/portalMenu"; // 👈 NEW

export default function Leases() {
  // dropdown data
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // list + form
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // row menu + edit modal
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null); // 👈 NEW
  const [editing, setEditing] = useState<LeaseRow | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [form, setForm] = useState<{
    property_id?: string;
    unit_id?: string;
    tenant_id?: string;
    start_date?: string;
    end_date?: string;
    rent_dollars?: string;
    due_day?: number;
    deposit_dollars?: string;
    status?: Lease["status"];
  }>({ due_day: 1, status: "active" });

  // Load dropdown sources + existing leases
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [props, tens, ls] = await Promise.all([listProperties(), listTenants(), listLeases()]);
        setProperties(props);
        setTenants(tens);
        setLeases(ls);
        if (props.length > 0) {
          const us = await listUnitsForProperty(props[0].id as string);
          setUnits(us);
        }
      } catch (e) {
        console.error("Error loading leases:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // When property changes → refresh units
  useEffect(() => {
    if (!form.property_id) return;
    (async () => {
      const us = await listUnitsForProperty(form.property_id!);
      setUnits(us);
      if (form.unit_id && !us.some((u) => u.id === form.unit_id)) {
        setForm((f) => ({ ...f, unit_id: undefined }));
      }
    })();
  }, [form.property_id]);

  // helpers
  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const tenantName = (t?: { first_name: string; last_name: string }) => (t ? `${t.first_name} ${t.last_name}` : "");

  const canSave = useMemo(
    () =>
      Boolean(
        form.property_id &&
          form.unit_id &&
          form.tenant_id &&
          form.start_date &&
          form.rent_dollars &&
          form.due_day &&
          form.status
      ),
    [form]
  );

  async function addLease() {
    if (!canSave) return;
    try {
      setSaving(true);
      const rent_cents = Math.round(Number(form.rent_dollars) * 100);
      const deposit_cents =
        form.deposit_dollars && form.deposit_dollars.trim() !== ""
          ? Math.round(Number(form.deposit_dollars) * 100)
          : undefined;

      const newLease = await createLease({
        unit_id: form.unit_id!,
        tenant_id: form.tenant_id!,
        start_date: form.start_date!,
        end_date: form.end_date || undefined,
        rent_cents,
        due_day: Number(form.due_day),
        deposit_cents,
        status: form.status!,
      });

      setLeases((prev) => [newLease, ...prev]);
      setForm((f) => ({ property_id: f.property_id, unit_id: f.unit_id, status: "active", due_day: 1 }));
    } catch (e) {
      console.error("Failed to add lease:", e);
    } finally {
      setSaving(false);
    }
  }

  // Row menu helpers
  const openMenu = (e: React.MouseEvent<HTMLElement>, id: string) => {
    e.stopPropagation();
    setOpenMenuId((cur) => (cur === id ? null : id));
    setAnchorEl(e.currentTarget as HTMLElement); // 👈 anchor for PortalMenu
  };

  const onChooseEdit = (e: React.MouseEvent, l: LeaseRow) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setEditing(l);
  };

  const onChooseDelete = async (e: React.MouseEvent, l: LeaseRow) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const ok = confirm(
      `Delete this lease for ${tenantName(l.tenant)} at ${l.unit?.property?.name} • ${l.unit?.label}?`
    );
    if (!ok) return;
    try {
      await deleteLease(l.id);
      setLeases((prev) => prev.filter((x) => x.id !== l.id));
    } catch (err) {
      console.error("Failed to delete lease:", err);
      alert("Failed to delete lease. It may be referenced by payments.");
    }
  };

  // Save edit
  const saveEdit = async () => {
    if (!editing) return;
    try {
      setSavingEdit(true);
      const patch = {
        start_date: editing.start_date,
        end_date: editing.end_date ?? undefined,
        rent_cents: editing.rent_cents,
        due_day: editing.due_day,
        deposit_cents: editing.deposit_cents ?? undefined,
        status: editing.status,
      };

      const updated = await updateLease(editing.id, patch);
      setLeases((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setEditing(null);
    } catch (err) {
      console.error("Failed to update lease:", err);
      alert("Failed to update lease. Check console for details.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leases</h1>
        <button className="pm-btn" onClick={addLease} disabled={!canSave || saving}>
          {saving ? "Saving..." : "+ Add Lease"}
        </button>
      </div>

      {/* Form */}
      <div className="pm-card space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            className="pm-input"
            value={form.property_id ?? ""}
            onChange={(e) => setForm({ ...form, property_id: e.target.value })}
          >
            <option value="">Select property…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            className="pm-input"
            value={form.unit_id ?? ""}
            onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
            disabled={!form.property_id}
          >
            <option value="">{form.property_id ? "Select unit…" : "Pick a property first"}</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>

          <select
            className="pm-input"
            value={form.tenant_id ?? ""}
            onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
          >
            <option value="">Select tenant…</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.first_name} {t.last_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          <input
            className="pm-input"
            type="date"
            value={form.start_date ?? ""}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            placeholder="Start date"
          />
          <input
            className="pm-input"
            type="date"
            value={form.end_date ?? ""}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            placeholder="End date (optional)"
          />
          <input
            className="pm-input"
            type="number"
            inputMode="decimal"
            placeholder="Rent (dollars)"
            value={form.rent_dollars ?? ""}
            onChange={(e) => setForm({ ...form, rent_dollars: e.target.value })}
          />
          <input
            className="pm-input"
            type="number"
            min={1}
            max={28}
            placeholder="Due day"
            value={form.due_day ?? 1}
            onChange={(e) => setForm({ ...form, due_day: Number(e.target.value) })}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="pm-input"
            type="number"
            inputMode="decimal"
            placeholder="Deposit (dollars, optional)"
            value={form.deposit_dollars ?? ""}
            onChange={(e) => setForm({ ...form, deposit_dollars: e.target.value })}
          />
          <select
            className="pm-input"
            value={form.status ?? "active"}
            onChange={(e) => setForm({ ...form, status: e.target.value as Lease["status"] })}
          >
            {(["pending", "active", "ended", "defaulted"] as const).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="pm-card overflow-auto">
        {loading ? (
          <p>Loading…</p>
        ) : leases.length === 0 ? (
          <p className="text-slate-600 italic">No leases yet.</p>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Property</th>
                <th className="text-left p-2">Unit</th>
                <th className="text-left p-2">Tenant</th>
                <th className="text-left p-2">Start</th>
                <th className="text-left p-2">End</th>
                <th className="text-left p-2">Rent</th>
                <th className="text-left p-2">Due</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2 w-10"> </th>
              </tr>
            </thead>
            <tbody>
              {leases.map((l) => (
                <tr key={l.id} className="border-b hover:bg-slate-50">
                  <td className="p-2">{l.unit?.property?.name ?? ""}</td>
                  <td className="p-2">{l.unit?.label ?? ""}</td>
                  <td className="p-2">{tenantName(l.tenant)}</td>
                  <td className="p-2">{formatDate(l.start_date)}</td>
                  <td className="p-2">{formatDate(l.end_date ?? "")}</td>
                  <td className="p-2">{money(l.rent_cents)}</td>
                  <td className="p-2">{l.due_day}</td>
                  <td className="p-2 capitalize">{l.status}</td>
                  <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block text-left">
                      <button
                        ref={(el) => {
                          // keep the latest anchor when this row's menu is open
                          if (openMenuId === l.id && el) setAnchorEl(el);
                        }}
                        className="rounded p-1 hover:bg-slate-200"
                        aria-label="More"
                        onClick={(e) => openMenu(e, l.id)}
                      >
                        <span className="inline-block w-5 text-center">⋯</span>
                      </button>

                      {/* 🌟 Portal-based dropdown to avoid clipping */}
                      <PortalMenu
                        open={openMenuId === l.id}
                        anchorEl={anchorEl}
                        onClose={() => setOpenMenuId(null)}
                        minWidth={128}
                      >
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={(e) => onChooseEdit(e, l)}
                        >
                          Edit
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={(e) => onChooseDelete(e, l)}
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
            <h2 className="text-lg font-semibold mb-3">Edit Lease</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-500">Start</label>
                <input
                  className="pm-input"
                  type="date"
                  value={editing.start_date}
                  onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">End</label>
                <input
                  className="pm-input"
                  type="date"
                  value={editing.end_date ?? ""}
                  onChange={(e) => setEditing({ ...editing, end_date: e.target.value || null })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Rent (USD)</label>
                <input
                  className="pm-input"
                  type="number"
                  inputMode="decimal"
                  value={(editing.rent_cents / 100).toString()}
                  onChange={(e) =>
                    setEditing({ ...editing, rent_cents: Math.round(Number(e.target.value || 0) * 100) })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Due day (1–28)</label>
                <input
                  className="pm-input"
                  type="number"
                  min={1}
                  max={28}
                  value={editing.due_day}
                  onChange={(e) => setEditing({ ...editing, due_day: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Deposit (USD)</label>
                <input
                  className="pm-input"
                  type="number"
                  inputMode="decimal"
                  value={((editing.deposit_cents ?? 0) / 100).toString()}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      deposit_cents:
                        e.target.value.trim() === "" ? null : Math.round(Number(e.target.value) * 100),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Status</label>
                <select
                  className="pm-input"
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as Lease["status"] })}
                >
                  {(["pending", "active", "ended", "defaulted"] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="pm-btn" onClick={saveEdit} disabled={savingEdit}>
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
