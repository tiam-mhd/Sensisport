"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { Locale } from "@/i18n/config";

export function AccountForm({ locale, mode, adminOnly = false }: { locale: Locale; mode: "login" | "register"; adminOnly?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isFa = locale === "fa";
  const register = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`/api/auth/${register ? "register" : "login"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const user = await response.json() as { role?: string; error?: string };
      if (!response.ok) { setError(user.error ?? (isFa ? "اطلاعات ورود معتبر نیست." : "The credentials are invalid.")); setBusy(false); return; }
      if (adminOnly && user.role !== "admin") {
        await fetch("/api/auth/logout", { method: "POST" });
        setError(isFa ? "این حساب دسترسی مدیریت ندارد." : "This account does not have administrator access."); setBusy(false); return;
      }
      router.replace(adminOnly ? `/${locale}/admin` : `/${locale}/account/orders`);
      router.refresh();
    } catch {
      setError(isFa ? "ارتباط با سرور ممکن نشد." : "Could not reach the server."); setBusy(false);
    }
  }

  return <form className="login-form" onSubmit={submit}>
    {register && <label>{isFa ? "نام" : "Name"}<input name="name" autoComplete="name" minLength={2} maxLength={200} required /></label>}
    <label>{isFa ? "ایمیل" : "Email"}<input name="email" type="email" autoComplete="email" dir="ltr" maxLength={320} required /></label>
    <label>{isFa ? "گذرواژه" : "Password"}<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={10} maxLength={200} dir="ltr" required /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary" type="submit" disabled={busy}>{busy ? (isFa ? "در حال بررسی…" : "Checking…") : (isFa ? (register ? "ساخت حساب" : "ورود") : (register ? "Create account" : "Sign in"))}</button>
    {!adminOnly && <p className="account-alt">{isFa ? (register ? "حساب دارید؟ " : "حساب ندارید؟ ") : (register ? "Already have an account? " : "New here? ")}<Link href={`/${locale}/account/${register ? "login" : "register"}`}>{isFa ? (register ? "ورود" : "ساخت حساب") : (register ? "Sign in" : "Create account")}</Link></p>}
  </form>;
}
