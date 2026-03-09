import { ExtractedKeywords } from './keyword-extractor';

export interface ContactInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
}

export interface ATSBreakdown {
  contactInfo: number;   // 0-20
  structure: number;     // 0-20
  contentLength: number; // 0-20
  keywords: number;      // 0-20
  impact: number;        // 0-20
}

export interface MatchResult {
  matched: string[];
  missing: string[];
  partial: string[];
  atsScore: number;
  atsBreakdown: ATSBreakdown;
  fitScore: number;
  sectionScores: Record<string, number>;
  skillGaps: SkillGap[];
  contactInfo: ContactInfo;
  softSkillsFound: string[];
}

export interface SkillGap {
  keyword: string;
  category: 'required' | 'preferred' | 'tool';
  importance: 'high' | 'medium' | 'low';
  suggestion: string;
}

export function extractContactInfo(resumeText: string): ContactInfo {
  // Email
  const emailMatch = resumeText.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : null;

  // Phone (matches common US/international formats)
  const phoneMatch = resumeText.match(
    /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/
  );
  const phone = phoneMatch ? phoneMatch[0].trim() : null;

  // LinkedIn
  const linkedinMatch = resumeText.match(/linkedin\.com\/in\/[\w-]+/i);
  const linkedin = linkedinMatch ? linkedinMatch[0] : null;

  // Location: "City, ST" or "City, Country"
  const locationMatch = resumeText.match(
    /\b([A-Z][a-zA-Z\s]+),\s*([A-Z]{2}|[A-Z][a-z]+)\b/
  );
  const location = locationMatch ? locationMatch[0] : null;

  // Name heuristic: first line with 2-4 Title Case words, no digits, before any section header
  const lines = resumeText.split('\n').map(l => l.trim()).filter(Boolean);
  let name: string | null = null;
  for (const line of lines.slice(0, 5)) {
    // Skip lines with common non-name content
    if (/@|http|linkedin|github|\.com|\d{3}/i.test(line)) continue;
    // Title case words, 2-4 words, length reasonable
    if (/^[A-Z][a-z]+([\s-][A-Z][a-z]+){1,3}$/.test(line) && line.length < 50) {
      name = line;
      break;
    }
    // ALL CAPS name
    if (/^[A-Z]+([\s][A-Z]+){1,3}$/.test(line) && line.length < 40) {
      name = line.split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
      break;
    }
  }

  return { name, email, phone, location, linkedin };
}

export function matchResumeToJD(
  resumeText: string,
  resumeKeywords: string[],
  jdKeywords: ExtractedKeywords,
  resumeSections: { name: string; content: string }[],
  softSkillsFound: string[]
): MatchResult {
  const resumeLower = resumeText.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];
  const partial: string[] = [];

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Check each JD keyword against resume
  for (const keyword of jdKeywords.allKeywords) {
    const kLower = keyword.toLowerCase();
    const kRegex = new RegExp(`\\b${escapeRegExp(kLower)}\\b`, 'i');

    if (kRegex.test(resumeLower)) {
      matched.push(keyword);
    } else {
      const words = kLower.split(/\s+/);
      const partialMatch = words.length > 1 && words.some(w => {
        const wRegex = new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i');
        return wRegex.test(resumeLower) && w.length > 3;
      });

      if (partialMatch) {
        partial.push(keyword);
      } else {
        missing.push(keyword);
      }
    }
  }

  // Fit score
  const totalKeywords = jdKeywords.allKeywords.length || 1;
  const fitScore = Math.round(
    ((matched.length + partial.length * 0.5) / totalKeywords) * 100
  );

  // ATS score with 5-category breakdown
  const { score: atsScore, breakdown: atsBreakdown } = calculateATSScore(
    resumeText, resumeSections, matched, jdKeywords
  );

  // Per-section scores
  const sectionScores = calculateSectionScores(resumeSections, jdKeywords);

  // Skill gaps
  const skillGaps = generateSkillGaps(missing, partial, jdKeywords);

  // Contact info
  const contactInfo = extractContactInfo(resumeText);

  return {
    matched,
    missing,
    partial,
    atsScore,
    atsBreakdown,
    fitScore,
    sectionScores,
    skillGaps,
    contactInfo,
    softSkillsFound,
  };
}

function calculateATSScore(
  resumeText: string,
  sections: { name: string; content: string }[],
  matched: string[],
  jdKeywords: ExtractedKeywords
): { score: number; breakdown: ATSBreakdown } {
  const breakdown: ATSBreakdown = {
    contactInfo: 0,
    structure: 0,
    contentLength: 0,
    keywords: 0,
    impact: 0,
  };

  // 1. Contact Info (20 pts)
  const contact = extractContactInfo(resumeText);
  if (contact.email) breakdown.contactInfo += 8;
  if (contact.phone) breakdown.contactInfo += 7;
  if (contact.name) breakdown.contactInfo += 3;
  if (contact.linkedin) breakdown.contactInfo += 2;
  breakdown.contactInfo = Math.min(breakdown.contactInfo, 20);

  // 2. Structure / Sections (20 pts)
  const requiredSections = ['experience', 'education', 'skills', 'projects', 'summary'];
  const sectionNames = sections.map(s => s.name.toLowerCase());
  const sectionText = resumeText.toLowerCase();
  const presentSections = requiredSections.filter(
    s => sectionNames.some(sn => sn.includes(s)) || sectionText.includes(s)
  );
  breakdown.structure = Math.round((presentSections.length / requiredSections.length) * 20);

  // 3. Content Length (20 pts)
  const wordCount = resumeText.split(/\s+/).length;
  if (wordCount >= 400 && wordCount <= 1000) {
    breakdown.contentLength = 20;
  } else if (wordCount >= 250 || wordCount > 1000) {
    breakdown.contentLength = 10;
  } else {
    breakdown.contentLength = 5;
  }

  // 4. Keywords (20 pts)
  const keywordRatio = matched.length / Math.max(jdKeywords.allKeywords.length, 1);
  breakdown.keywords = Math.round(keywordRatio * 20);

  // 5. Quantifiable Impact (20 pts) — ported from resume-matcher
  const metrics = resumeText.match(/\d+%|\$[\d,]+|\d+x|\d+\s*\+/g) || [];
  const actionVerbs = ['managed', 'developed', 'led', 'created', 'designed', 'implemented',
    'analyzed', 'collaborated', 'engineered', 'optimized', 'built', 'launched', 'delivered',
    'reduced', 'increased', 'improved', 'scaled', 'automated', 'architected'];
  const impactWords = ['increased', 'decreased', 'reduced', 'improved', 'grew', 'saved', 'generated'];
  const foundVerbs = actionVerbs.filter(v => resumeText.toLowerCase().includes(v));
  const foundImpact = impactWords.filter(w => resumeText.toLowerCase().includes(w));
  const bulletPoints = (resumeText.match(/^[\s]*[•\-\*]/gm) || []).length;

  if (metrics.length >= 3 || (metrics.length > 0 && foundImpact.length > 0)) {
    breakdown.impact = 20;
  } else if (metrics.length > 0 || foundImpact.length > 0) {
    breakdown.impact = 10;
  } else if (foundVerbs.length >= 5) {
    breakdown.impact = 8;
  } else if (bulletPoints > 5) {
    breakdown.impact = 5;
  }

  const score = breakdown.contactInfo + breakdown.structure + breakdown.contentLength +
    breakdown.keywords + breakdown.impact;

  return { score: Math.min(score, 100), breakdown };
}

function calculateSectionScores(
  sections: { name: string; content: string }[],
  jdKeywords: ExtractedKeywords
): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const section of sections) {
    const sectionLower = section.content.toLowerCase();
    let matched = 0;
    for (const keyword of jdKeywords.allKeywords) {
      if (sectionLower.includes(keyword.toLowerCase())) matched++;
    }
    const score = Math.round((matched / Math.max(jdKeywords.allKeywords.length, 1)) * 100);
    scores[section.name] = Math.min(score * 3, 100);
  }

  return scores;
}

function generateSkillGaps(
  missing: string[],
  partial: string[],
  jdKeywords: ExtractedKeywords
): SkillGap[] {
  const gaps: SkillGap[] = [];

  for (const keyword of missing) {
    const isRequired = jdKeywords.requiredSkills.includes(keyword);
    const isPreferred = jdKeywords.preferredSkills.includes(keyword);

    gaps.push({
      keyword,
      category: isRequired ? 'required' : isPreferred ? 'preferred' : 'tool',
      importance: isRequired ? 'high' : isPreferred ? 'medium' : 'low',
      suggestion: generateSuggestion(keyword, isRequired),
    });
  }

  for (const keyword of partial) {
    gaps.push({
      keyword,
      category: 'preferred',
      importance: 'medium',
      suggestion: `Explicitly mention "${keyword}" in your resume`,
    });
  }

  return gaps.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.importance] - order[b.importance];
  });
}

function generateSuggestion(keyword: string, isRequired: boolean): string {
  const prefix = isRequired ? 'Required' : 'Consider adding';
  return `${prefix}: Add "${keyword}" to your skills section or weave it into relevant experience`;
}
