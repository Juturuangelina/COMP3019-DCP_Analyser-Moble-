import { seed } from "@repo/db/seed";
import { NextResponse } from "next/server";

export async function GET() {
  if (!process.env.E2E) {
    return new Response("Not Available", { status: 501 });
  }

  await seed();
  return NextResponse.json({ message: "Seeded" }, { status: 200 });
}
