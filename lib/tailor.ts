import OpenAI from 'openai';

export interface TailoredSection {
  sectionName: string;
  original: string;
  tailored: string;
  changes: Change[];
}

export interface Change {
  original: string;
  tailored: string;
  reason: string;
}

export interface TailoredResume {
  sections: TailoredSection[];
  fullText: string;
  improvementChecklist: string[];
  beforeScore: number;
  afterScore: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function tailorResume(
  resumeText: string,
  resumeSections: { name: string; content: string }[],
  jdText: string,
  missingKeywords: string[],
  matchedKeywords: string[],
  beforeScore: number
): Promise<TailoredResume> {
  const systemPrompt = `You are an expert resume writer and ATS optimization specialist.
Your task is to rewrite resume bullet points to better match job descriptions while preserving authenticity.
Rules:
- Never fabricate experience or skills the candidate doesn't have
- Incorporate JD keywords naturally into existing bullet points
- Quantify achievements where possible (add percentages, numbers, scale)
- Use strong action verbs
- Keep bullet points concise (1-2 lines max)
- Return ONLY valid JSON, no markdown code blocks`;

  const tailoredSections: TailoredSection[] = [];

  // Tailor each major section
  for (const section of resumeSections) {
    if (!['experience', 'work experience', 'employment', 'projects', 'skills'].includes(section.name.toLowerCase())) {
      tailoredSections.push({
        sectionName: section.name,
        original: section.content,
        tailored: section.content,
        changes: [],
      });
      continue;
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Rewrite this resume section to better match the job description.

RESUME SECTION (${section.name}):
${section.content}

JOB DESCRIPTION:
${jdText.slice(0, 2000)}

MISSING KEYWORDS TO INCORPORATE (if relevant to this section):
${missingKeywords.slice(0, 10).join(', ')}

ALREADY MATCHED KEYWORDS:
${matchedKeywords.slice(0, 10).join(', ')}

Return a JSON object with this exact structure:
{
  "tailored": "the rewritten section text",
  "changes": [
    {
      "original": "original bullet point",
      "tailored": "rewritten bullet point",
      "reason": "brief explanation of change"
    }
  ]
}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content || '{}';
      // Strip markdown code blocks if present
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      tailoredSections.push({
        sectionName: section.name,
        original: section.content,
        tailored: parsed.tailored || section.content,
        changes: parsed.changes || [],
      });
    } catch {
      tailoredSections.push({
        sectionName: section.name,
        original: section.content,
        tailored: section.content,
        changes: [],
      });
    }
  }

  // Generate improvement checklist
  const checklist = await generateImprovementChecklist(
    resumeText,
    jdText,
    missingKeywords,
    beforeScore
  );

  // Estimate after score (improvement based on keywords added)
  const keywordsAdded = tailoredSections.reduce(
    (sum, s) => sum + s.changes.length,
    0
  );
  const afterScore = Math.min(beforeScore + keywordsAdded * 2 + 10, 100);

  const fullText = tailoredSections.map(s => s.tailored).join('\n\n');

  return {
    sections: tailoredSections,
    fullText,
    improvementChecklist: checklist,
    beforeScore,
    afterScore,
  };
}

async function generateImprovementChecklist(
  resumeText: string,
  jdText: string,
  missingKeywords: string[],
  score: number
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Based on this resume and job description, generate a concise improvement checklist.

Missing keywords: ${missingKeywords.slice(0, 8).join(', ')}
Current ATS score: ${score}/100

Return ONLY a JSON array of strings, each being a specific, actionable improvement item:
["Add X to skills section", "Quantify achievement Y", ...]

Maximum 8 items. Focus on highest impact improvements.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 400,
    });

    const content = response.choices[0].message.content || '[]';
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return missingKeywords.slice(0, 5).map(k => `Add "${k}" to your resume`);
  }
}
