import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.MAPPLS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const response = await fetch(`https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${apiKey}`);

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch SDK" }, { status: response.status });
    }

    const script = await response.text();

    return new NextResponse(script, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error proxying Mappls SDK:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}