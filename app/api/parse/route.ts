import { NextRequest, NextResponse } from 'next/server';
import { parsePDF, parseDOCX, parseResume } from '@/lib/parser';
import { analyzeResumeText } from '@/lib/python-client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name.toLowerCase();

    let text = '';

    if (fileName.endsWith('.pdf')) {
      text = await parsePDF(buffer);
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      text = await parseDOCX(buffer);
    } else if (fileName.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload PDF, DOCX, or TXT.' },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text. Ensure the file is not image-based.' },
        { status: 400 }
      );
    }

    const parsed = parseResume(text);

    // Call Python NLP service for richer profile extraction
    // Runs in parallel — if service is down, we still return parsed text
    const nlpAnalysis = await analyzeResumeText(text);

    return NextResponse.json({
      text: parsed.text,
      sections: parsed.sections,
      wordCount: text.split(/\s+/).length,
      // Python-enriched fields (null if service unavailable)
      nlp: nlpAnalysis
        ? {
            profile: nlpAnalysis.profile,
            keywords: nlpAnalysis.keywords,
            namedSkills: nlpAnalysis.namedSkills,
            softSkills: nlpAnalysis.softSkills,
            spaCyAvailable: nlpAnalysis.spaCyAvailable,
          }
        : null,
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json({ error: 'Failed to parse resume file' }, { status: 500 });
  }
}
