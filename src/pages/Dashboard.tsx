import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDate } from "../utils/formatter";

// Minimal local types (keeps this file standalone)
type ActivityItem = {
  kind: "payment" | "lease" | "tenant" | "property" | "unit";
  id: string;
  when: string; // ISO
  label: string;
  sub?: string;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  // summary metrics
  const [propertyCount, setPropertyCount] = useState(0);
  const [unitCount, setUnitCount] = useState(0);
  const [activeLeaseCount, setActiveLeaseCount] = useState(0);
  const [totalMonthlyRentCents, setTotalMonthlyRentCents] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  // sections
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [upcoming, setUpcoming] = useState<
    Array<{
      lease_id: string;
      due_date: string; // YYYY-MM-DD
      amount_cents: number;
      property: string;
      unit: string;
      tenant: string;
      paid: boolean;
    }>
  >([]);

  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // date helpers (current month window)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const firstOfMonth = new Date(year, month, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // === Summary: counts & total rent ===
        const [{ count: propsCnt }, { count: unitsCnt }] = await Promise.all([
          supabase.from("properties").select("*", { count: "exact", head: true }),
          supabase.from("units").select("*", { count: "exact", head: true }),
        ]);

        // Active leases + sum of rent
        const { data: activeLeases, error: leaseErr } = await supabase
          .from("leases")
          .select(
            `
            id, created_at, start_date, end_date, rent_cents, due_day, status,
            unit:units ( id, label, property:properties ( id, name ) ),
            tenant:tenants ( id, first_name, last_name )
          `
          )
          .eq("status", "active");
        if (leaseErr) throw leaseErr;

        setPropertyCount(propsCnt ?? 0);
        setUnitCount(unitsCnt ?? 0);
        setActiveLeaseCount(activeLeases?.length ?? 0);
        setTotalMonthlyRentCents(
          (activeLeases ?? []).reduce((sum, l: any) => sum + (l.rent_cents || 0), 0)
        );

        // === Activity feed (latest 10 across tables) ===
        const [recentPayments, recentLeases, recentTenants, recentProps, recentUnits] = await Promise.all([
          supabase
            .from("payments")
            .select(
              `
              id, created_at, paid_on, amount_cents,
              lease:leases (
                id,
                unit:units ( id, label, property:properties ( id, name ) ),
                tenant:tenants ( id, first_name, last_name )
              )
            `
            )
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("leases")
            .select(
              `
              id, created_at, start_date,
              unit:units ( id, label, property:properties ( id, name ) ),
              tenant:tenants ( id, first_name, last_name )
            `
            )
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("tenants")
            .select("id, created_at, first_name, last_name")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("properties")
            .select("id, created_at, name")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("units")
            .select(
              `
              id, created_at, label,
              property:properties ( id, name )
            `
            )
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        const feed: ActivityItem[] = [
          ...(recentPayments.data ?? []).map((p: any) => ({
            kind: "payment" as const,
            id: p.id,
            when: p.created_at,
            label: `Payment received ${money(p.amount_cents)}`,
            sub: `${p.lease?.tenant?.first_name ?? ""} ${p.lease?.tenant?.last_name ?? ""} • ${
              p.lease?.unit?.property?.name ?? ""
            } • ${p.lease?.unit?.label ?? ""}`,
          })),
          ...(recentLeases.data ?? []).map((l: any) => ({
            kind: "lease" as const,
            id: l.id,
            when: l.created_at,
            label: `Lease created • ${l.tenant?.first_name ?? ""} ${l.tenant?.last_name ?? ""}`,
            sub: `${l.unit?.property?.name ?? ""} • ${l.unit?.label ?? ""} • Starts ${l.start_date}`,
          })),
          ...(recentTenants.data ?? []).map((t: any) => ({
            kind: "tenant" as const,
            id: t.id,
            when: t.created_at,
            label: `Tenant added • ${t.first_name} ${t.last_name}`,
          })),
          ...(recentProps.data ?? []).map((p: any) => ({
            kind: "property" as const,
            id: p.id,
            when: p.created_at,
            label: `Property added • ${p.name}`,
          })),
          ...(recentUnits.data ?? []).map((u: any) => ({
            kind: "unit" as const,
            id: u.id,
            when: u.created_at,
            label: `Unit added • ${u.label}`,
            sub: u.property?.name,
          })),
        ]
          .sort((a, b) => b.when.localeCompare(a.when))
          .slice(0, 10);

        setActivity(feed);

        // === Upcoming payments (this month) + Overdue ===
        // pull payments for the current month, bucket by lease_id
        const { data: monthPayments, error: pmErr } = await supabase
          .from("payments")
          .select("id, lease_id, paid_on")
          .gte("paid_on", fmt(firstOfMonth))
          .lt("paid_on", fmt(nextMonth));
        if (pmErr) throw pmErr;

        const paidLeaseIds = new Set((monthPayments ?? []).map((p) => p.lease_id));

        // build list off active leases (respecting end date not before this month’s due)
        const upcomingList =
          (activeLeases ?? [])
            .map((l: any) => {
              const dueDay = Math.min(Math.max(Number(l.due_day) || 1, 1), 28);
              const dueDate = new Date(year, month, dueDay);
              // if lease starts after due date, shift to start date’s month/day for display
              const starts = new Date(l.start_date);
              const ends = l.end_date ? new Date(l.end_date) : null;
              const effectiveDue =
                starts > dueDate ? starts : dueDate; // simple UX rule: show first due >= start
              // hide if ended before this month’s due
              if (ends && ends < firstOfMonth) return null;

              return {
                lease_id: l.id as string,
                due_date: formatDate(fmt(effectiveDue)),
                amount_cents: l.rent_cents as number,
                property: l.unit?.property?.name ?? "",
                unit: l.unit?.label ?? "",
                tenant: `${l.tenant?.first_name ?? ""} ${l.tenant?.last_name ?? ""}`.trim(),
                paid: paidLeaseIds.has(l.id),
              };
            })
            .filter(Boolean) as NonNullable<any>[];

        setUpcoming(
          upcomingList.sort((a, b) => a.due_date.localeCompare(b.due_date))
        );

        // overdue = unpaid with due date < today
        const todayStr = fmt(now);
        const overdue = upcomingList.filter((i) => !i.paid && i.due_date < todayStr).length;
        setOverdueCount(overdue);
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line

  const totals = useMemo(
    () => [
      { label: "Properties", value: propertyCount.toString() },
      { label: "Units", value: unitCount.toString() },
      { label: "Active Leases", value: activeLeaseCount.toString() },
      { label: "Monthly Rent", value: money(totalMonthlyRentCents) },
      { label: "Overdue", value: overdueCount.toString() },
    ],
    [propertyCount, unitCount, activeLeaseCount, totalMonthlyRentCents, overdueCount]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {totals.map((t) => (
              <div key={t.label} className="pm-card">
                <div className="text-xs uppercase tracking-wide text-slate-500">{t.label}</div>
                <div className="text-2xl font-semibold mt-1">{t.value}</div>
              </div>
            ))}
          </div>

          {/* Two columns: Activity + Upcoming */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent activity */}
            <div className="pm-card">
              <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
              {activity.length === 0 ? (
                <p className="text-slate-600 italic">No recent activity.</p>
              ) : (
                <ul className="divide-y">
                  {activity.map((a) => (
                    <li key={`${a.kind}-${a.id}`} className="py-2">
                      <div className="font-medium">{a.label}</div>
                      {a.sub && <div className="text-sm text-slate-600">{a.sub}</div>}
                      <div className="text-xs text-slate-500">{new Date(a.when).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Upcoming payments (this month) */}
            <div className="pm-card overflow-auto">
              <h2 className="text-lg font-semibold mb-3">Upcoming Payments (This Month)</h2>
              {upcoming.length === 0 ? (
                <p className="text-slate-600 italic">No active leases.</p>
              ) : (
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Due</th>
                      <th className="text-left p-2">Tenant</th>
                      <th className="text-left p-2">Property</th>
                      <th className="text-left p-2">Unit</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map((u) => (
                      <tr key={u.lease_id} className="border-b hover:bg-slate-50">
                        <td className="p-2">{u.due_date}</td>
                        <td className="p-2">{u.tenant}</td>
                        <td className="p-2">{u.property}</td>
                        <td className="p-2">{u.unit}</td>
                        <td className="p-2">{money(u.amount_cents)}</td>
                        <td className="p-2">
                          {u.paid ? (
                            <span className="inline-block rounded px-2 py-0.5 text-xs bg-green-100 text-green-700">
                              Paid
                            </span>
                          ) : (
                            <span className="inline-block rounded px-2 py-0.5 text-xs bg-amber-100 text-amber-700">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="text-xs text-slate-500 mt-2">
                Overdue = unpaid with a due date earlier than today.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
