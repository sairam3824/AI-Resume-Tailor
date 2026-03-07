import { NextRequest, NextResponse } from 'next/server';
import { tailorResume } from '@/lib/tailor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      resumeText,
      resumeSections,
      jdText,
      missingKeywords,
      matchedKeywords,
      beforeScore,
    } = body;

    if (!resumeText || !jdText) {
      return NextResponse.json(
        { error: 'Resume text and job description are required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const result = await tailorResume(
      resumeText,
      resumeSections || [],
      jdText,
      missingKeywords || [],
      matchedKeywords || [],
      beforeScore || 0
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Tailor error:', error);
    return NextResponse.json(
      { error: 'Resume tailoring failed' },
      { status: 500 }
    );
  }
}
