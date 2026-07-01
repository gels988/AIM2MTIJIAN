import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("c")?.trim() ?? "";
  const ref = url.searchParams.get("ref")?.trim() ?? "";
  const token = code || ref;
  const destination = new URL("/register.html", url.origin);
  if (token) {
    destination.searchParams.set("ref", token);
  }
  return NextResponse.redirect(destination);
}
