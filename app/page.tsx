'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileText, Target, Sparkles, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import ResumeUpload from './components/ResumeUpload';
import JDInput from './components/JDInput';

export default function HomePage() {
  const router = useRouter();
  const [resumeText, setResumeText] = useState('');
  const [resumeSections, setResumeSections] = useState<{ name: string; content: string }[]>([]);
  const [jdText, setJDText] = useState('');
  const [jdUrl, setJDUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [redactPii, setRedactPii] = useState(false);

  const canAnalyze = resumeText.trim().length > 50 && (jdText.trim().length > 50 || jdUrl.trim().length > 10);

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setAnalyzing(true);
    setError('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          resumeSections,
          jdText: jdText || undefined,
          jdUrl: jdUrl || undefined,
          redactPii,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');

      sessionStorage.setItem(
        'analysisData',
        JSON.stringify({
          resumeText,
          resumeSections,
          jdText: data.jdText,
          jdKeywords: data.jdKeywords,
          matchResult: data.matchResult,
        })
      );

      router.push('/analysis');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">AI Resume Tailor</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Target className="h-4 w-4" /> ATS Optimized
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" /> AI-Powered
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero text */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tailor Your Resume to Any Job
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Upload your resume and paste the job description. AI analyzes skill gaps,
            rewrites bullet points to match keywords, and gives you an ATS score.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            'Keyword extraction',
            'ATS scoring',
            'Skill gap analysis',
            'AI bullet rewriting',
            'Before/after comparison',
            'PDF download',
          ].map(f => (
            <span
              key={f}
              className="bg-white border text-xs text-gray-600 px-3 py-1 rounded-full shadow-sm"
            >
              {f}
            </span>
          ))}
        </div>

        {/* Main split view */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Resume Upload */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                Your Resume
              </CardTitle>
              <CardDescription className="text-xs">
                Upload PDF/DOCX or paste your resume text
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResumeUpload
                resumeText={resumeText}
                onTextChange={setResumeText}
                onParsed={(text, sections) => {
                  setResumeText(text);
                  setResumeSections(sections);
                }}
              />
              {resumeText && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
                  {resumeText.split(/\s+/).length} words loaded
                </p>
              )}
            </CardContent>
          </Card>

          {/* Job Description */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                Job Description
              </CardTitle>
              <CardDescription className="text-xs">
                Paste JD text or provide a job posting URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JDInput
                jdText={jdText}
                jdUrl={jdUrl}
                onJDTextChange={setJDText}
                onJDUrlChange={setJDUrl}
              />
            </CardContent>
          </Card>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Analyze button */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
            <input
              type="checkbox"
              id="redact-pii"
              checked={redactPii}
              onChange={(e) => setRedactPii(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="redact-pii" className="text-xs font-medium text-slate-600 cursor-pointer select-none">
              Privacy Mode (Redact name, email, phone from AI)
            </label>
            <div className={`ml-1 w-2 h-2 rounded-full ${redactPii ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze || analyzing}
            size="lg"
            className="px-8"
          >
            {analyzing ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="h-5 w-5 mr-2" /> Analyze & Score <ArrowRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </div>

        {!canAnalyze && (resumeText || jdText || jdUrl) && (
          <p className="text-center text-xs text-gray-400 mt-2">
            {!resumeText ? 'Add your resume to continue' : 'Add a job description to continue'}
          </p>
        )}

        {/* How it works */}
        <Separator className="my-10" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            {
              title: 'Upload Resume',
              desc: 'PDF, DOCX, or paste text. AI extracts your skills, experience, and achievements.',
              icon: FileText,
              color: 'text-blue-500 bg-blue-50',
            },
            {
              title: 'Paste Job Description',
              desc: 'We extract required skills, keywords, and experience levels from the JD.',
              icon: Target,
              color: 'text-purple-500 bg-purple-50',
            },
            {
              title: 'Get Tailored Resume',
              desc: 'AI rewrites your bullets to match the JD, shows gaps, and gives an ATS score.',
              icon: Sparkles,
              color: 'text-green-500 bg-green-50',
            },
          ].map(({ title, desc, icon: Icon, color }) => (
            <div key={title} className="space-y-2">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
