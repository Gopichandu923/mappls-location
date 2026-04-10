// app/api/mappls/suggest/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const apiKey = process.env.MAPPLS_API_KEY;

  try {
    const response = await fetch(
      `https://atlas.mappls.com/api/places/geocode/autosuggest?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch suggestions' }, { status: 500 });
  }
}
