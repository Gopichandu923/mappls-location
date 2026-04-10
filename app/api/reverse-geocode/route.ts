// app/api/reverse-geocode/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = searchParams.get("latitude");
  const longitude = searchParams.get("longitude");

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const apiKey = process.env.MAPPLS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    // Mappls Reverse Geocode URL - using latitude and longitude as query params
    const url = `https://search.mappls.com/search/address/rev-geocode?lat=${latitude}&lng=${longitude}&access_token=${apiKey}`;

    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json({ error: "Mappls API Error", details: text }, { status: response.status });
    }

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
  }
}
