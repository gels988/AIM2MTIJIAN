import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const base =
    process.env.VERCEL_URL && !process.env.VERCEL_URL.startsWith("http")
      ? `https://${process.env.VERCEL_URL}`
      : process.env.VERCEL_URL || "";

  const url = base ? new URL("/api/citizens/ping", base) : new URL("/api/citizens/ping", req.url);

  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as unknown;
    return NextResponse.json({
      status: res.ok ? "ok" : "error",
      timestamp: new Date().toISOString(),
      database: res.ok ? "connected" : "failed",
      users: null,
      details: json,
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "failed",
        users: null,
        error: e instanceof Error ? e.message : "fetch_failed",
      },
      { status: 502 },
    );
  }
}

