import "server-only";

import { readFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    "考题",
    "AIM2M_v2_十大实战考题_最终版.md",
  );

  try {
    const content = await readFile(filePath, "utf8");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "questions_not_found" },
      { status: 404 },
    );
  }
}

