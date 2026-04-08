import { NextResponse } from "next/server";

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function getErrorCode(err: unknown) {
  const e = err as { cause?: unknown; code?: unknown; message?: unknown };
  const cause = e?.cause as { code?: unknown; message?: unknown } | undefined;
  const code = typeof cause?.code === "string" ? cause.code : typeof e?.code === "string" ? e.code : null;
  const message =
    typeof cause?.message === "string"
      ? cause.message
      : typeof e?.message === "string"
        ? e.message
        : null;
  return { code, message };
}

async function probeSupabase(url: string, anonKey: string) {
  const endpoint = `${url.replace(/\/+$/, "")}/rest/v1/`;
  try {
    const res = await fetch(endpoint, {
      method: "HEAD",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
      },
      cache: "no-store",
    });
    return { ok: true, status: res.status };
  } catch (err) {
    const { code, message } = getErrorCode(err);
    return { ok: false, status: null as number | null, code, message };
  }
}

export async function GET() {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.json(
      {
        ok: false,
        error: "supabase_env_missing",
        remediation: {
          required_env: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
          accepted_fallbacks: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
          next_steps: [
            "Vercel 项目 -> Settings -> Environment Variables：补齐 SUPABASE_URL 与 SUPABASE_ANON_KEY（Production）",
            "Deployments -> Redeploy 触发重新部署",
          ],
        },
      },
      { status: 500 },
    );
  }

  const probe = await probeSupabase(env.url, env.anonKey);
  if (!probe.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "supabase_unreachable",
        details: probe.code ? `${probe.code}${probe.message ? `: ${probe.message}` : ""}` : probe.message ?? "fetch_failed",
        remediation: {
          next_steps: [
            "确认该 Supabase Project URL 在 Supabase 控制台仍存在且可访问",
            "如已失效：新建 Supabase 项目，并用 Settings -> API 获取新的 Project URL 与 anon key",
            "更新 Vercel 环境变量后重新部署",
          ],
        },
      },
      { status: 502 },
    );
  }

  const baseUrl = env.url.replace(/\/+$/, "");
  const queryUrl = `${baseUrl}/rest/v1/app_users?select=id&limit=1`;
  try {
    const res = await fetch(queryUrl, {
      method: "GET",
      headers: {
        apikey: env.anonKey,
        authorization: `Bearer ${env.anonKey}`,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const ct = res.headers.get("content-type") || "";
      const body = ct.includes("application/json")
        ? JSON.stringify(await res.json()).slice(0, 240)
        : (await res.text()).slice(0, 240);
      return NextResponse.json(
        {
          ok: false,
          error: "supabase_http_error",
          details: `HTTP ${res.status} ${body}`,
          remediation: {
            next_steps: [
              "如果报 permission denied/RLS：在 Supabase SQL Editor 执行 scripts/init-db.sql 里的 RLS 策略（或按需调整策略）",
              "如果表不存在：在 Supabase SQL Editor 执行 scripts/init-db.sql 初始化 app_users 表",
            ],
          },
        },
        { status: 502 },
      );
    }
  } catch (err) {
    const { code, message } = getErrorCode(err);
    return NextResponse.json(
      {
        ok: false,
        error: "supabase_query_failed",
        details: code ? `${code}${message ? `: ${message}` : ""}` : message ?? "fetch_failed",
        remediation: {
          next_steps: [
            "优先检查：Supabase Project URL 是否能被解析（DNS）",
            "其次检查：Vercel 环境变量是否已注入 Production 并完成 Redeploy",
            "最后检查：RLS 策略与表结构（scripts/init-db.sql）",
          ],
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
