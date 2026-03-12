import { GATEWAY_URL } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${GATEWAY_URL}/v0/public/handles/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Gateway error" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
