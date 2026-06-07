import { NextResponse } from 'next/server';
import { ScrapeReturnDict } from '../../backend/scrape';
export async function POST(request) {
  try {
    const { url } = await request.json();
    console.log("Scraping URL:", url);
    const result = await ScrapeReturnDict(url);
    for (const key in result) {
      console.log(`${key}: ${result[key]}`);
    }
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error scraping URL:', error);
    return NextResponse.json(
      { error: 'Failed to scrape URL' },
      { status: 500 }
    );
  }
}