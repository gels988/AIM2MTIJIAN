import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 102_400;

function hourBucket(nowMs: number) {
  return Math.floor(nowMs / 3_600_000);
}

function baguaIndex(nowMs: number) {
  return hourBucket(nowMs) % 8;
}

function baguaBits(nowMs: number) {
  return baguaIndex(nowMs).toString(2).padStart(3, "0");
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return new NextResponse("Payload Too Large", { status: 413 });
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return new NextResponse("Payload Too Large", { status: 413 });
    }
    body = JSON.parse(text) as unknown;
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const data = (body as { data?: unknown }).data;
  if (data === undefined) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const now = Date.now();
  const bits = baguaBits(now);
  const bucket = hourBucket(now);

  if (isRecord(data) && data.prot === "PROT-1.1" && typeof data.he9 === "string") {
    const secret = process.env.ACTIVATION_SECRET ?? "PUBLIC";
    const expected = (await sha256Hex(`${bits}:${bucket}:${secret}`)).slice(0, 9);
    if (data.he9 === expected) {
      const voucher = (await sha256Hex(`VOUCHER:${expected}:${secret}`)).slice(0, 32);
      return NextResponse.json({
        received: true,
        prot: "PROT-1.1",
        binary_bagua: bits,
        status: "M2M_READY",
        voucher,
      });
    }
    return NextResponse.json({
      received: true,
      prot: "PROT-1.1",
      binary_bagua: bits,
      status: "DENY",
    });
  }

  return NextResponse.json({ received: true, binary_bagua: bits, status: "ok" });
}

export async function GET() {
  const now = Date.now();
  return NextResponse.json({
    status: "ok",
    prot: "PROT-1.1",
    binary_bagua: baguaBits(now),
    hour_bucket: hourBucket(now),
  });
}
