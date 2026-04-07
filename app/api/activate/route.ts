import { NextResponse } from "next/server";
import { SignJWT } from "jose";

function originAllowed(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return true;
  try {
    const u = new URL(origin);
    return u.host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!originAllowed(req)) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const secretStr = process.env.ACTIVATION_SECRET;
  const masterCode = process.env.MASTER_CODE;
  if (!secretStr || !masterCode) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  const secret = new TextEncoder().encode(secretStr);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const code = (body as { code?: unknown }).code;
  const mode = (body as { mode?: unknown }).mode;

  const isPaymentUnlock = mode === "payment";
  const isCodeUnlock = typeof code === "string" && code === masterCode;

  if (!isPaymentUnlock && !isCodeUnlock) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const token = await new SignJWT({ status: "ACTIVE" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("2h")
    .sign(secret);

  const res = NextResponse.json({ success: true });
  res.cookies.set("aim2m_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  return res;
}

