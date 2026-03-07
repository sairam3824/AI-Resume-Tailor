const PYTHON_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export interface PythonProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
}

export interface PythonScoreBreakdown {
  contactInfo: number;
  structure: number;
  contentLength: number;
  keywords: number;
  impact: number;
}

export interface PythonAnalysis {
  profile: PythonProfile;
  score: {
    totalScore: number;
    breakdown: PythonScoreBreakdown;
    feedback: string[];
  };
  keywords: string[];
  namedSkills: string[];
  softSkills: string[];
  predictedRoles: string[];
  missingSkills: string[];
  summaryCritique: string;
  spaCyAvailable: boolean;
  aiAvailable: boolean;
}

export async function analyzeResumeText(
  text: string,
  jdText?: string
): Promise<PythonAnalysis | null> {
  try {
    const res = await fetch(`${PYTHON_URL}/api/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, jd_text: jdText || '' }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.warn('Python service returned', res.status);
      return null;
    }

    return res.json();
  } catch (e) {
    // Service not running — graceful fallback
    console.warn('Python NLP service unavailable:', (e as Error).message);
    return null;
  }
}

export async function isPythonServiceUp(): Promise<boolean> {
  try {
    const res = await fetch(`${PYTHON_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
