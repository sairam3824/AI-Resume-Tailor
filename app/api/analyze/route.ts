import { NextRequest, NextResponse } from 'next/server';
import { extractKeywordsFromJD, extractKeywordsFromResume } from '@/lib/keyword-extractor';
import { matchResumeToJD } from '@/lib/matcher';
import { analyzeResumeText } from '@/lib/python-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeText, resumeSections, jdText, jdUrl } = body;

    if (!resumeText) {
      return NextResponse.json({ error: 'Resume text is required' }, { status: 400 });
    }

    let finalJDText = jdText;

    if (jdUrl && !jdText) {
      try {
        const scrapeResponse = await fetch(jdUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResumeBot/1.0)' },
        });
        const html = await scrapeResponse.text();
        finalJDText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      } catch {
        return NextResponse.json({ error: 'Failed to scrape job description URL' }, { status: 400 });
      }
    }

    if (!finalJDText) {
      return NextResponse.json({ error: 'Job description text or URL is required' }, { status: 400 });
    }

    // Run Python NLP analysis and TS keyword extraction in parallel
    const [pythonResult, jdKeywords, resumeKeywords] = await Promise.all([
      analyzeResumeText(resumeText, finalJDText),
      Promise.resolve(extractKeywordsFromJD(finalJDText)),
      Promise.resolve(extractKeywordsFromResume(resumeText)),
    ]);

    // TS-based matching (JD vs resume keywords)
    const matchResult = matchResumeToJD(
      resumeText,
      resumeKeywords.all,
      jdKeywords,
      resumeSections || [],
      resumeKeywords.softSkills,
    );

    // Merge Python results into matchResult if available
    if (pythonResult) {
      // Override ATS breakdown with Python's richer scoring
      matchResult.atsBreakdown = {
        contactInfo: pythonResult.score.breakdown.contactInfo,
        structure: pythonResult.score.breakdown.structure,
        contentLength: pythonResult.score.breakdown.contentLength,
        keywords: pythonResult.score.breakdown.keywords,
        impact: pythonResult.score.breakdown.impact,
      };
      matchResult.atsScore =
        matchResult.atsBreakdown.contactInfo +
        matchResult.atsBreakdown.structure +
        matchResult.atsBreakdown.contentLength +
        matchResult.atsBreakdown.keywords +
        matchResult.atsBreakdown.impact;

      // Override contact info with spaCy NER
      matchResult.contactInfo = {
        name: pythonResult.profile.name,
        email: pythonResult.profile.email,
        phone: pythonResult.profile.phone,
        location: pythonResult.profile.location,
        linkedin: pythonResult.profile.linkedin,
      };

      // Use Python soft skills (richer set)
      if (pythonResult.softSkills.length > 0) {
        matchResult.softSkillsFound = pythonResult.softSkills;
      }
    }

    // AI insights: from Python service (includes predicted roles, summary critique, missing skills)
    const aiInsights = pythonResult
      ? {
          predictedRoles: pythonResult.predictedRoles,
          summaryCritique: pythonResult.summaryCritique,
          missingSkillsAI: pythonResult.missingSkills,
          aiFeedback: pythonResult.score.feedback,
          pythonKeywords: pythonResult.keywords,
          namedSkills: pythonResult.namedSkills,
          serviceInfo: {
            spaCy: pythonResult.spaCyAvailable,
            ai: pythonResult.aiAvailable,
          },
        }
      : {
          predictedRoles: [],
          summaryCritique: '',
          missingSkillsAI: [],
          aiFeedback: [],
          pythonKeywords: [],
          namedSkills: [],
          serviceInfo: { spaCy: false, ai: false },
        };

    return NextResponse.json({
      jdKeywords,
      resumeKeywords,
      matchResult,
      jdText: finalJDText,
      aiInsights,
    });
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
