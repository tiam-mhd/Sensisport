"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <button className="button button-outline" type="button" disabled={busy} onClick={async () => { setBusy(true); await fetch("/api/auth/logout", { method: "POST" }); router.replace("/"); router.refresh(); }}>{label}</button>;
}
