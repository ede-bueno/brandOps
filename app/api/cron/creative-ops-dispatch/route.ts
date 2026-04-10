import { NextResponse } from "next/server";

export async function GET(request: Request) {
  void request;
  return NextResponse.json({
    disabled: true,
    reason: "creative_ops_replanned",
  });
}
