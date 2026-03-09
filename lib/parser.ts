export interface ParsedResume {
  text: string;
  sections: {
    name: string;
    content: string;
  }[];
}

export async function parsePDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text;
}

export async function parseDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export function extractSections(text: string): { name: string; content: string }[] {
  const sectionHeaders = [
    'summary', 'objective', 'experience', 'work experience', 'employment',
    'education', 'skills', 'technical skills', 'projects', 'certifications',
    'awards', 'publications', 'volunteer', 'languages', 'interests', 'references'
  ];

  const lines = text.split('\n');
  const sections: { name: string; content: string }[] = [];
  let currentSection = { name: 'header', content: '' };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.length > 50) {
      currentSection.content += line + '\n';
      continue;
    }

    const lower = trimmed.toLowerCase();
    // Match common section names even if they have prefixes/suffixes
    // e.g., "Professional Experience", "My Skills", "Personal Projects"
    const matchedHeader = sectionHeaders.find(h => {
      const regex = new RegExp(`(^|\\s)${h}(\\s|:|$|s)`, 'i');
      return regex.test(lower);
    });

    // Check if it looks like a header (short, maybe uppercase, not starting with bullet)
    const looksLikeHeader = matchedHeader && !/^[-•*]/.test(trimmed);

    if (looksLikeHeader) {
      if (currentSection.content.trim()) {
        sections.push({ ...currentSection });
      }
      currentSection = { name: matchedHeader, content: line + '\n' };
    } else {
      currentSection.content += line + '\n';
    }
  }

  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }

  return sections;
}

export function parseResume(text: string): ParsedResume {
  const sections = extractSections(text);
  return { text, sections };
}
