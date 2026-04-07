"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type RegisterResponse =
  | { ok: true; created: boolean; user: Record<string, unknown> }
  | { ok: false; error: string; details?: string };

type PingResponse = { ok: boolean; error?: string; details?: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export default function CitizensPage() {
  const [identifier, setIdentifier] = useState("");
  const [referrerId, setReferrerId] = useState<string>("");
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegisterResponse | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferrerId(ref);
  }, []);

  const ping = useCallback(async () => {
    try {
      const res = await fetch("/api/citizens/ping", { cache: "no-store" });
      const json = (await res.json()) as PingResponse;
      setDbOk(Boolean(json.ok));
    } catch {
      setDbOk(false);
    }
  }, []);

  useEffect(() => {
    void ping();
  }, [ping]);

  const onSubmit = useCallback(async () => {
    const id = identifier.trim();
    if (!id) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/citizens/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: id,
          referrer_id: referrerId.trim() ? referrerId.trim() : undefined,
        }),
      });
      const json = (await res.json()) as unknown;
      if (!isRecord(json)) {
        setResult({ ok: false, error: "invalid_response" });
        return;
      }
      const ok = typeof json.ok === "boolean" ? json.ok : false;
      if (ok) {
        const created = typeof json.created === "boolean" ? json.created : false;
        const user = isRecord(json.user) ? json.user : {};
        setResult({ ok: true, created, user });
        setDbOk(true);
      } else {
        const error = typeof json.error === "string" ? json.error : "unknown_error";
        const details = typeof json.details === "string" ? json.details : undefined;
        setResult({ ok: false, error, details });
        setDbOk(false);
      }
    } catch {
      setResult({ ok: false, error: "network_error" });
      setDbOk(false);
    } finally {
      setLoading(false);
    }
  }, [identifier, referrerId]);

  const badge = useMemo(() => {
    if (dbOk === null) return "bg-slate-500/15 text-slate-200";
    return dbOk ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200";
  }, [dbOk]);

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">子民繁殖系统</h1>
            <div className="mt-1 text-sm text-slate-400">Citizen Enrollment / Referral Entry</div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`rounded-xl px-3 py-2 text-xs font-semibold shadow-[0_0_0_1px_rgba(229,231,235,0.12)] ${badge}`}>
              DB: {dbOk === null ? "CHECKING" : dbOk ? "ONLINE" : "OFFLINE"}
            </div>
            <Link
              href="/"
              className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
            >
              返回主界面
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl">
          <div className="text-sm font-semibold text-slate-100">登记 / Register</div>
          <div className="mt-4 space-y-3">
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="手机号 / 邮箱 / 任意标识（最长 64）"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/60"
            />
            <input
              value={referrerId}
              onChange={(e) => setReferrerId(e.target.value)}
              placeholder="推荐人 ID（可选，URL 参数 ref=… 会自动填入）"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/60"
            />
            <button
              type="button"
              onClick={() => void onSubmit()}
              disabled={loading || !identifier.trim()}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-sky-500/20 text-sm font-bold text-sky-100 shadow-[0_0_0_1px_rgba(14,165,233,0.32)] transition hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "提交中…" : "生成子民档案 / Create Citizen"}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-300">
            {result ? (
              <pre className="whitespace-pre-wrap break-words">{JSON.stringify(result, null, 2)}</pre>
            ) : (
              <div>提交后将显示数据库回执（若 Supabase 未配置会返回错误）。</div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/25 p-5 text-xs text-slate-400">
          需要在部署环境设置：SUPABASE_URL 与 SUPABASE_ANON_KEY（服务端读取，不会下发到浏览器）。
        </div>
      </div>
    </main>
  );
}
