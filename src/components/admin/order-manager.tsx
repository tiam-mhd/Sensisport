"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type OrderRow = { id: string; publicId: string; email: string; recipientName: string; status: string; totalMinor: number | null; currency: string | null; createdAt: string };
const nextStatuses: Record<string, string[]> = { quote_requested: ["cancelled"], pending_payment: ["cancelled"], paid: ["processing"], processing: ["shipped"], shipped: ["completed"], completed: [], cancelled: [], payment_failed: ["cancelled"] };

export function OrderManager({ initial, locale }: { initial: OrderRow[]; locale: "fa" | "en" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const isFa = locale === "fa";
  async function update(event: FormEvent<HTMLFormElement>, order: OrderRow) {
    event.preventDefault(); setError(""); setBusyId(order.id);
    const status = String(new FormData(event.currentTarget).get("status"));
    const response = await fetch(`/api/admin/orders/${order.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) setError(result.error ?? "Could not update the order."); else router.refresh();
    setBusyId("");
  }
  return <>{error && <p className="form-error" role="alert">{error}</p>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{isFa ? "سفارش" : "Order"}</th><th>{isFa ? "گیرنده" : "Recipient"}</th><th>{isFa ? "وضعیت" : "Status"}</th><th>{isFa ? "مبلغ" : "Total"}</th><th>{isFa ? "ثبت" : "Created"}</th><th>{isFa ? "تغییر وضعیت" : "Update"}</th></tr></thead><tbody>{initial.map((order) => <tr key={order.id}><td>{order.publicId.slice(0, 12)}…</td><td>{order.recipientName}<br />{order.email}</td><td>{order.status}</td><td>{order.totalMinor == null ? (isFa ? "استعلام" : "Quote") : `${order.totalMinor} ${order.currency ?? ""}`}</td><td>{new Intl.DateTimeFormat(isFa ? "fa-IR" : "en-US", { dateStyle: "short" }).format(new Date(order.createdAt))}</td><td>{nextStatuses[order.status]?.length ? <form className="inline-status" onSubmit={(event) => update(event, order)}><select name="status" defaultValue={nextStatuses[order.status][0]}>{nextStatuses[order.status].map((status) => <option value={status} key={status}>{status}</option>)}</select><button className="button button-outline" disabled={busyId === order.id}>{isFa ? "ثبت" : "Save"}</button></form> : "—"}</td></tr>)}</tbody></table></div></>;
}
