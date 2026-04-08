"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type CheckRow = {
  id: string;
  label: string;
  ok: boolean | null;
  details?: string;
};

function badgeClass(ok: boolean | null) {
  if (ok === null) return "bg-slate-500/15 text-slate-200";
  return ok ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200";
}

export default function SelfCheckPage() {
  const [rows, setRows] = useState<CheckRow[]>([
    { id: "api_auth", label: "API /api/auth", ok: null },
    { id: "api_questions", label: "API /api/questions", ok: null },
    { id: "api_w2w", label: "API /api/w2w", ok: null },
    { id: "db_supabase", label: "DB Supabase(app_users)", ok: null },
  ]);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    const next: CheckRow[] = [];

    const runOne = async (id: string, label: string, url: string, mode: "json" | "text") => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          let details = `HTTP ${res.status}`;
          try {
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              const json = (await res.json()) as unknown;
              details = `${details} ${JSON.stringify(json).slice(0, 240)}`;
            } else {
              const text = await res.text();
              if (text.trim()) details = `${details} ${text.slice(0, 240)}`;
            }
          } catch {}
          next.push({ id, label, ok: false, details });
          return;
        }
        if (mode === "json") {
          const json = (await res.json()) as unknown;
          next.push({ id, label, ok: true, details: JSON.stringify(json).slice(0, 160) });
          return;
        }
        const text = await res.text();
        next.push({ id, label, ok: true, details: text.slice(0, 160) });
      } catch (e) {
        next.push({
          id,
          label,
          ok: false,
          details: e instanceof Error ? e.message : "network_error",
        });
      }
    };

    await Promise.all([
      runOne("api_auth", "API /api/auth", "/api/auth", "json"),
      runOne("api_questions", "API /api/questions", "/api/questions", "text"),
      runOne("api_w2w", "API /api/w2w", "/api/w2w", "json"),
      runOne("db_supabase", "DB Supabase(app_users)", "/api/citizens/ping", "json"),
    ]);

    setRows(next);
    setRunning(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void run();
    }, 0);
    return () => window.clearTimeout(id);
  }, [run]);

  const overall = useMemo(() => {
    const decided = rows.filter((r) => r.ok !== null);
    if (!decided.length) return null;
    return decided.every((r) => r.ok);
  }, [rows]);

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">自检系统</h1>
            <div className="mt-1 text-sm text-slate-400">Connectivity & Runtime Sanity Check</div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`rounded-xl px-3 py-2 text-xs font-semibold shadow-[0_0_0_1px_rgba(229,231,235,0.12)] ${badgeClass(
                overall,
              )}`}
            >
              OVERALL: {overall === null ? "CHECKING" : overall ? "PASS" : "FAIL"}
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-slate-100">检查项</div>
            <button
              type="button"
              onClick={() => void run()}
              disabled={running}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white/5 px-4 text-xs font-semibold text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? "运行中…" : "重新自检"}
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-100">{r.label}</div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(r.ok)}`}>
                    {r.ok === null ? "…" : r.ok ? "OK" : "ERR"}
                  </div>
                </div>
                <div className="font-mono text-xs text-slate-400">{r.details ?? "—"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/25 p-5 text-xs text-slate-400">
          DB 检查依赖服务端环境变量：SUPABASE_URL、SUPABASE_ANON_KEY（或 NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY）。
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/25 p-5 text-xs text-slate-300">
          <div className="text-sm font-semibold text-slate-100">DB 修复指南（只看这一段就够）</div>
          <div className="mt-3 space-y-2">
            <div>1）先打开：/api/citizens/ping（末尾不要带“。”等标点）看返回 JSON 里的 error/details。</div>
            <div>2）如果是 Invalid API key：去 Supabase Settings → API 复制本项目的 anon public key（通常 eyJ… 开头）。</div>
            <div>3）如果是 ENOTFOUND：说明 Project URL 已失效或填错，必须换成仍存在的 https://xxxx.supabase.co。</div>
            <div>4）更换变量后，在 Vercel 里对 Production 做一次 Redeploy（否则新变量不会注入运行时）。</div>
            <div>5）新项目是空库时，去 Supabase SQL Editor 执行 scripts/init-db.sql 建表与 RLS 策略。</div>
          </div>
        </div>
      </div>
    </main>
  );
}
