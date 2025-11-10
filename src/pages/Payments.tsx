import { useEffect, useMemo, useState } from "react";
import type { Payment } from "../types";
import { listLeases, type LeaseRow } from "../api/leases";
import {
  listPayments,
  createPayment,
  updatePayment,   // 👈 new
  deletePayment,   // 👈 new
  type PaymentRow,
} from "../api/payments";
import { formatDate } from "../utils/formatter";
import PortalMenu from "../components/portalMenu"; // 👈 NEW

export default function Payments() {
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null); // 👈 NEW

  // row menu + edit modal
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<{
    lease_id?: string;
    paid_on: string;
    amount_dollars?: string;
    method: Payment["method"];
    memo?: string;
  }>({ paid_on: today, method: "ach" });

  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const canSave = useMemo(
    () => Boolean(form.lease_id && form.paid_on && form.amount_dollars && Number(form.amount_dollars) > 0),
    [form]
  );

  // Load leases + payments
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [ls, ps] = await Promise.all([listLeases(), listPayments()]);
        setLeases(ls);
        setPayments(ps);
      } catch (e) {
        console.error("Error loading payments/leases:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function addPayment() {
    if (!canSave) return;
    try {
      setSaving(true);
      const amount_cents = Math.round(Number(form.amount_dollars) * 100);
      const newPayment = await createPayment({
        lease_id: form.lease_id!,
        paid_on: form.paid_on,
        amount_cents,
        method: form.method,
        memo: form.memo ?? "",
      });
      setPayments((prev) => [newPayment, ...prev]);
      setForm((f) => ({ ...f, amount_dollars: "", memo: "" }));
    } catch (e) {
      console.error("Failed to add payment:", e);
    } finally {
      setSaving(false);
    }
  }

  // Row menu helpers
  const openMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId((cur) => (cur === id ? null : id));
    setAnchorEl(e.currentTarget as HTMLElement); // 👈 anchor for PortalMenu
  };

  const onChooseEdit = (e: React.MouseEvent, p: PaymentRow) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setEditing(p);
  };

  const onChooseDelete = async (e: React.MouseEvent, p: PaymentRow) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const ok = confirm(
      `Delete payment of ${money(p.amount_cents)} on ${p.paid_on} for ${p.lease?.tenant?.first_name ?? ""} ${p.lease?.tenant?.last_name ?? ""}?`
    );
    if (!ok) return;
    try {
      await deletePayment(p.id);
      setPayments((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      console.error("Failed to delete payment:", err);
      alert("Failed to delete payment. Check console for details.");
    }
  };

  // Save edit
  const saveEdit = async () => {
    if (!editing) return;
    try {
      setSavingEdit(true);
      const patch = {
        paid_on: editing.paid_on,
        amount_cents: editing.amount_cents,
        method: editing.method,
        memo: editing.memo ?? "",
      };
      const updated = await updatePayment(editing.id, patch);
      setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditing(null);
    } catch (err) {
      console.error("Failed to update payment:", err);
      alert("Failed to update payment. Check console for details.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payments</h1>
        <button className="pm-btn" onClick={addPayment} disabled={!canSave || saving}>
          {saving ? "Saving..." : "+ Record Payment"}
        </button>
      </div>

      {/* Form */}
      <div className="pm-card space-y-3">
        <div className="grid gap-2 sm:grid-cols-4">
          <select
            id="payment-lease"
            data-testid="payment-lease"
            className="pm-input"
            value={form.lease_id ?? ""}
            onChange={(e) => setForm({ ...form, lease_id: e.target.value })}
          >
            <option value="">Select lease…</option>
            {leases.map((l) => (
              <option key={l.id} value={l.id}>
                {l.unit?.property?.name ?? "Property"} • {l.unit?.label ?? "Unit"} — {l.tenant?.first_name} {" "}
                {l.tenant?.last_name}
              </option>
            ))}
          </select>

          <input
            id="payment-date"
            data-testid="payment-date"
            className="pm-input"
            type="date"
            value={form.paid_on}
            onChange={(e) => setForm({ ...form, paid_on: e.target.value })}
          />

          <input
            id="payment-amount"
            data-testid="payment-amount"
            className="pm-input"
            type="number"
            inputMode="decimal"
            placeholder="Amount (dollars)"
            value={form.amount_dollars ?? ""}
            onChange={(e) => setForm({ ...form, amount_dollars: e.target.value })}
          />

          <select
            id="payment-method"
            data-testid="payment-method"
            className="pm-input"
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value as Payment["method"] })}
          >
            {(["cash", "check", "ach", "card", "other"] as const).map((m) => (
              <option key={m} value={m}>
                {m.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <input
          id="payment-memo"
          data-testid="payment-memo"
          className="pm-input w-full"
          placeholder="Memo (optional)"
          value={form.memo ?? ""}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
        />
      </div>

      {/* List */}
      <div className="pm-card overflow-auto">
        {loading ? (
          <p>Loading…</p>
        ) : payments.length === 0 ? (
          <p className="text-slate-600 italic">No payments yet.</p>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Property</th>
                <th className="text-left p-2">Unit</th>
                <th className="text-left p-2">Tenant</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Method</th>
                <th className="text-left p-2">Memo</th>
                <th className="text-right p-2 w-10"> </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b hover:bg-slate-50">
                  <td className="p-2">{formatDate(p.paid_on)}</td>
                  <td className="p-2">{p.lease?.unit?.property?.name ?? ""}</td>
                  <td className="p-2">{p.lease?.unit?.label ?? ""}</td>
                  <td className="p-2">
                    {p.lease?.tenant ? `${p.lease.tenant.first_name} ${p.lease.tenant.last_name}` : ""}
                  </td>
                  <td className="p-2">{money(p.amount_cents)}</td>
                  <td className="p-2 uppercase">{p.method}</td>
                  <td className="p-2">{p.memo ?? ""}</td>
                  <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block text-left">
                      <button
                        className="rounded p-1 hover:bg-slate-200"
                        aria-label="More"
                        onClick={(e) => openMenu(e, p.id)}
                      >
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

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/40" onClick={() => setEditing(null)}>
          <div className="pm-card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-3">Edit Payment</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-500" htmlFor="edit-payment-date">Date</label>
                <input
                  id="edit-payment-date"
                  data-testid="edit-payment-date"
                  className="pm-input"
                  type="date"
                  value={editing.paid_on}
                  onChange={(e) => setEditing({ ...editing, paid_on: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500" htmlFor="edit-payment-amount">Amount (USD)</label>
                <input
                  id="edit-payment-amount"
                  data-testid="edit-payment-amount"
                  className="pm-input"
                  type="number"
                  inputMode="decimal"
                  value={(editing.amount_cents / 100).toString()}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      amount_cents: Math.round(Number(e.target.value || 0) * 100),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-500" htmlFor="edit-payment-method">Method</label>
                <select
                  id="edit-payment-method"
                  data-testid="edit-payment-method"
                  className="pm-input"
                  value={editing.method}
                  onChange={(e) => setEditing({ ...editing, method: e.target.value as Payment["method"] })}
                >
                  {(["cash", "check", "ach", "card", "other"] as const).map((m) => (
                    <option key={m} value={m}>
                      {m.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500" htmlFor="edit-payment-memo">Memo</label>
                <input
                  id="edit-payment-memo"
                  data-testid="edit-payment-memo"
                  className="pm-input"
                  value={editing.memo ?? ""}
                  onChange={(e) => setEditing({ ...editing, memo: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="pm-btn" data-testid="edit-payment-save" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save"}
              </button>
              <button className="px-3 py-2 rounded border" data-testid="edit-payment-cancel" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
