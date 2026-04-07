import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = /(?:^|;\s*)aim2m_auth=([^;]+)/.exec(cookie);
  const token = match?.[1];

  const secretStr = process.env.ACTIVATION_SECRET;
  if (!token || !secretStr) {
    return NextResponse.json({ active: false });
  }

  try {
    const secret = new TextEncoder().encode(secretStr);
    const { payload } = await jwtVerify(token, secret);
    return NextResponse.json({ active: payload.status === "ACTIVE" });
  } catch {
    return NextResponse.json({ active: false });
  }
}

