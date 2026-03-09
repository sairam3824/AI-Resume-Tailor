export interface ExtractedKeywords {
  requiredSkills: string[];
  preferredSkills: string[];
  tools: string[];
  experienceLevels: string[];
  jobTitle: string;
  allKeywords: string[];
}

export interface ResumeKeywords {
  techSkills: string[];
  softSkills: string[];
  all: string[];
}

const TECH_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'react', 'next.js', 'vue', 'angular', 'svelte', 'node.js', 'express', 'fastapi', 'django', 'flask', 'spring',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'github actions',
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'sqlite',
  'graphql', 'rest', 'grpc', 'websocket', 'kafka', 'rabbitmq',
  'git', 'linux', 'bash', 'nginx', 'apache',
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
  'llm', 'langchain', 'openai', 'ai', 'nlp', 'computer vision',
  'figma', 'sketch', 'adobe', 'photoshop', 'illustrator',
  'agile', 'scrum', 'kanban', 'jira', 'confluence',
  'ci/cd', 'devops', 'sre', 'microservices', 'serverless',
  'html', 'css', 'sass', 'tailwind', 'bootstrap', 'material ui',
  'redux', 'zustand', 'mobx', 'webpack', 'vite', 'rollup',
  'jest', 'cypress', 'playwright', 'selenium',
];

const SOFT_SKILLS = [
  'leadership', 'communication', 'teamwork', 'collaboration', 'problem solving',
  'critical thinking', 'adaptability', 'time management', 'project management',
  'mentoring', 'analytical', 'creative', 'detail-oriented', 'self-motivated',
  'cross-functional', 'stakeholder', 'presentation', 'negotiation', 'empathy',
];

const EXPERIENCE_PATTERNS = [
  /(\d+)\+?\s*years?\s*(of\s+)?experience/gi,
  /(\d+)\+?\s*years?\s*(of\s+)?(professional|relevant|industry)/gi,
  /entry[- ]level/gi,
  /mid[- ]level/gi,
  /senior/gi,
  /staff/gi,
  /principal/gi,
  /lead/gi,
];

export function extractKeywordsFromJD(jdText: string): ExtractedKeywords {
  const text = jdText.toLowerCase();

  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];
  const tools: string[] = [];
  const experienceLevels: string[] = [];

  const requiredSection = extractSection(jdText, ['required', 'requirements', 'must have', 'you will need']);
  const preferredSection = extractSection(jdText, ['preferred', 'nice to have', 'bonus', 'plus', 'desired']);

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const skill of TECH_SKILLS) {
    const skillLower = skill.toLowerCase();
    const skillRegex = new RegExp(`\\b${escapeRegExp(skillLower)}\\b`, 'i');
    if (skillRegex.test(text)) {
      if (requiredSection && requiredSection.toLowerCase().includes(skillLower)) {
        requiredSkills.push(skill);
      } else if (preferredSection && preferredSection.toLowerCase().includes(skillLower)) {
        preferredSkills.push(skill);
      } else {
        requiredSkills.push(skill);
      }
    }
  }

  for (const skill of SOFT_SKILLS) {
    const skillRegex = new RegExp(`\\b${escapeRegExp(skill.toLowerCase())}\\b`, 'i');
    if (skillRegex.test(text)) {
      requiredSkills.push(skill);
    }
  }

  for (const pattern of EXPERIENCE_PATTERNS) {
    const matches = jdText.match(pattern);
    if (matches) {
      experienceLevels.push(...matches.map(m => m.trim()));
    }
  }

  const techPhrases = extractTechPhrases(jdText);
  for (const phrase of techPhrases) {
    if (!requiredSkills.includes(phrase) && !preferredSkills.includes(phrase)) {
      tools.push(phrase);
    }
  }

  const jobTitle = extractJobTitle(jdText);
  const allKeywords = [...new Set([...requiredSkills, ...preferredSkills, ...tools, ...experienceLevels])];

  return {
    requiredSkills: [...new Set(requiredSkills)],
    preferredSkills: [...new Set(preferredSkills)],
    tools: [...new Set(tools)],
    experienceLevels: [...new Set(experienceLevels)],
    jobTitle,
    allKeywords,
  };
}

export function extractKeywordsFromResume(resumeText: string): ResumeKeywords {
  const text = resumeText.toLowerCase();
  const techSkills: string[] = [];
  const softSkills: string[] = [];

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const skill of TECH_SKILLS) {
    const skillRegex = new RegExp(`\\b${escapeRegExp(skill.toLowerCase())}\\b`, 'i');
    if (skillRegex.test(text)) techSkills.push(skill);
  }

  for (const skill of SOFT_SKILLS) {
    const skillRegex = new RegExp(`\\b${escapeRegExp(skill.toLowerCase())}\\b`, 'i');
    if (skillRegex.test(text)) softSkills.push(skill);
  }

  return {
    techSkills: [...new Set(techSkills)],
    softSkills: [...new Set(softSkills)],
    all: [...new Set([...techSkills, ...softSkills])],
  };
}

function extractSection(text: string, headers: string[]): string {
  const lines = text.split('\n');
  let inSection = false;
  let sectionText = '';

  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    const isHeader = headers.some(h => lower.includes(h));
    const isNewSection = /^[A-Z][A-Z\s]{3,}$/.test(line.trim()) || /^#+\s/.test(line.trim());

    if (isHeader) { inSection = true; continue; }
    if (inSection) {
      if (isNewSection && !isHeader) break;
      sectionText += line + '\n';
    }
  }

  return sectionText;
}

function extractTechPhrases(text: string): string[] {
  const phrases: string[] = [];
  const patterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g,
    /\b([A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/g,
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      if (match.length > 2 && match.length < 50) phrases.push(match.trim());
    }
  }

  return [...new Set(phrases)].slice(0, 20);
}

function extractJobTitle(text: string): string {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines[0] && lines[0].length < 100) return lines[0].trim();

  const titlePatterns = [/(?:position|role|title|job title)[:\s]+(.+)/i];
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return 'Position';
}
