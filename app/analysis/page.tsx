'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Loader2, Sparkles, CheckSquare, Target,
  BarChart2, FileDown, AlertTriangle, Mail, Phone,
  MapPin, Linkedin, User, Briefcase, MessageSquare
} from 'lucide-react';
import ScoreGauge from '../components/ScoreGauge';
import SkillGap from '../components/SkillGap';
import BeforeAfter from '../components/BeforeAfter';
import PDFPreview from '../components/PDFPreview';
import type { MatchResult } from '@/lib/matcher';
import type { TailoredResume } from '@/lib/tailor';
import type { ExtractedKeywords, ResumeKeywords } from '@/lib/keyword-extractor';

interface AIInsights {
  predictedRoles: string[];
  summaryCritique: string;
  missingSkillsAI: string[];
  aiFeedback: string[];
  pythonKeywords: string[];
  namedSkills: string[];
  serviceInfo: { spaCy: boolean; ai: boolean };
}

interface AnalysisData {
  resumeText: string;
  resumeSections: { name: string; content: string }[];
  jdText: string;
  jdKeywords: ExtractedKeywords;
  resumeKeywords: ResumeKeywords;
  matchResult: MatchResult;
  aiInsights: AIInsights;
}

function ContactInfoCard({ info }: { info: MatchResult['contactInfo'] }) {
  if (!info.name && !info.email && !info.phone) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4 text-blue-500" /> Candidate Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 text-sm">
          {info.name && (
            <span className="font-semibold text-gray-800">{info.name}</span>
          )}
          {info.email && (
            <a href={`mailto:${info.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
              <Mail className="h-3.5 w-3.5" /> {info.email}
            </a>
          )}
          {info.phone && (
            <span className="flex items-center gap-1 text-gray-600">
              <Phone className="h-3.5 w-3.5" /> {info.phone}
            </span>
          )}
          {info.location && (
            <span className="flex items-center gap-1 text-gray-600">
              <MapPin className="h-3.5 w-3.5" /> {info.location}
            </span>
          )}
          {info.linkedin && (
            <a
              href={`https://${info.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              <Linkedin className="h-3.5 w-3.5" /> LinkedIn
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ATSBreakdownCard({ breakdown }: { breakdown: MatchResult['atsBreakdown'] }) {
  const categories = [
    { key: 'contactInfo', label: 'Contact Info', max: 20, color: 'bg-blue-500' },
    { key: 'structure', label: 'Section Structure', max: 20, color: 'bg-purple-500' },
    { key: 'contentLength', label: 'Content Length', max: 20, color: 'bg-cyan-500' },
    { key: 'keywords', label: 'JD Keywords', max: 20, color: 'bg-green-500' },
    { key: 'impact', label: 'Quantified Impact', max: 20, color: 'bg-orange-500' },
  ] as const;

  return (
    <div className="space-y-3">
      {categories.map(({ key, label, max, color }) => {
        const val = breakdown[key];
        const pct = Math.round((val / max) * 100);
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">{label}</span>
              <span className="font-semibold">{val}/{max}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-2 ${color} rounded-full transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalysisPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [tailored, setTailored] = useState<TailoredResume | null>(null);
  const [tailoring, setTailoring] = useState(false);
  const [tailorError, setTailorError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const stored = sessionStorage.getItem('analysisData');
    if (!stored) { router.push('/'); return; }
    try { setData(JSON.parse(stored)); } catch { router.push('/'); }
  }, [router]);

  const handleTailor = async () => {
    if (!data) return;
    setTailoring(true);
    setTailorError('');

    try {
      const res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: data.resumeText,
          resumeSections: data.resumeSections,
          jdText: data.jdText,
          missingKeywords: data.matchResult.missing,
          matchedKeywords: data.matchResult.matched,
          beforeScore: data.matchResult.atsScore,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Tailoring failed');
      setTailored(result);
      setActiveTab('tailored');
    } catch (e: unknown) {
      setTailorError(e instanceof Error ? e.message : 'Tailoring failed');
    } finally {
      setTailoring(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const { matchResult, jdKeywords, resumeKeywords, aiInsights } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div>
              <h1 className="font-semibold text-sm">Resume Analysis</h1>
              {jdKeywords.jobTitle && (
                <p className="text-xs text-gray-500">{jdKeywords.jobTitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                ATS: {matchResult.atsScore}/100
              </Badge>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                Fit: {matchResult.fitScore}%
              </Badge>
            </div>
            <Button onClick={handleTailor} disabled={tailoring} size="sm">
              {tailoring ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Tailoring...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" /> Tailor Resume</>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {tailorError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {tailorError}
          </div>
        )}

        {/* Service status badge */}
        {aiInsights.serviceInfo && (
          <div className="flex gap-2 mb-3">
            <Badge className={aiInsights.serviceInfo.spaCy
              ? 'bg-purple-100 text-purple-700 border-purple-200 text-xs'
              : 'bg-gray-100 text-gray-500 border-gray-200 text-xs'
            }>
              spaCy NER: {aiInsights.serviceInfo.spaCy ? 'active' : 'offline'}
            </Badge>
            <Badge className={aiInsights.serviceInfo.ai
              ? 'bg-green-100 text-green-700 border-green-200 text-xs'
              : 'bg-gray-100 text-gray-500 border-gray-200 text-xs'
            }>
              AI Analysis: {aiInsights.serviceInfo.ai ? 'active' : 'offline'}
            </Badge>
          </div>
        )}

        {/* Contact info always visible */}
        <ContactInfoCard info={matchResult.contactInfo} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              <BarChart2 className="h-4 w-4 mr-1" /> Overview
            </TabsTrigger>
            <TabsTrigger value="keywords">
              <Target className="h-4 w-4 mr-1" /> Skill Gap
            </TabsTrigger>
            {tailored && (
              <>
                <TabsTrigger value="tailored">
                  <Sparkles className="h-4 w-4 mr-1" /> Tailored
                </TabsTrigger>
                <TabsTrigger value="download">
                  <FileDown className="h-4 w-4 mr-1" /> Download
                </TabsTrigger>
                <TabsTrigger value="checklist">
                  <CheckSquare className="h-4 w-4 mr-1" /> Checklist
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* ── OVERVIEW TAB ── */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              {/* ATS Score gauge */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">ATS Score</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <ScoreGauge score={matchResult.atsScore} label="ATS Compatibility" size="lg" />
                  {tailored && (
                    <div className="mt-3 text-center">
                      <p className="text-xs text-gray-500">After tailoring</p>
                      <p className="text-2xl font-bold text-green-600">{tailored.afterScore}</p>
                      <p className="text-xs text-green-600">+{tailored.afterScore - matchResult.atsScore} pts</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Fit score gauge */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Job Fit</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <ScoreGauge score={matchResult.fitScore} label="Keyword Match Rate" size="lg" />
                  <div className="mt-3 w-full space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Matched</span><span>{matchResult.matched.length}</span>
                    </div>
                    <Progress value={matchResult.fitScore} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>

              {/* 5-category ATS breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">ATS Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ATSBreakdownCard breakdown={matchResult.atsBreakdown} />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Predicted roles */}
              {aiInsights.predictedRoles.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-indigo-500" /> Best Suited Roles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {aiInsights.predictedRoles.map(role => (
                        <Badge key={role} className="bg-indigo-100 text-indigo-800 border-indigo-200">
                          {role}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">AI-predicted based on your resume</p>
                  </CardContent>
                </Card>
              )}

              {/* Summary critique */}
              {aiInsights.summaryCritique && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-amber-500" /> Summary Critique
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 leading-relaxed">{aiInsights.summaryCritique}</p>
                  </CardContent>
                </Card>
              )}

              {/* Soft skills found in resume */}
              {matchResult.softSkillsFound.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Soft Skills Detected</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {matchResult.softSkillsFound.map(s => (
                        <Badge key={s} className="bg-teal-100 text-teal-800 border-teal-200 text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Python NLP feedback */}
              {aiInsights.aiFeedback?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" /> Resume Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {aiInsights.aiFeedback.map((f, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                          <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span> {f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Named skills from spaCy */}
              {aiInsights.namedSkills?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Named Skills (spaCy NER)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {aiInsights.namedSkills.map(s => (
                        <Badge key={s} className="bg-violet-100 text-violet-800 border-violet-200 text-xs">{s}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* JD Requirements */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">JD Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {jdKeywords.requiredSkills.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase mb-1">Required</p>
                        <div className="flex flex-wrap gap-1">
                          {jdKeywords.requiredSkills.map(k => (
                            <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {jdKeywords.preferredSkills.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase mb-1">Preferred</p>
                        <div className="flex flex-wrap gap-1">
                          {jdKeywords.preferredSkills.map(k => (
                            <Badge key={k} variant="outline" className="text-xs text-gray-500">{k}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {jdKeywords.experienceLevels.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase mb-1">Experience</p>
                        <div className="flex flex-wrap gap-1">
                          {jdKeywords.experienceLevels.map(k => (
                            <Badge key={k} className="bg-purple-100 text-purple-700 border-purple-200 text-xs">{k}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── SKILL GAP TAB ── */}
          <TabsContent value="keywords">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Keyword Analysis & Skill Gaps</CardTitle>
              </CardHeader>
              <CardContent>
                {/* AI missing skills */}
                {aiInsights.missingSkillsAI.length > 0 && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-2">
                      AI-identified missing skills (high priority)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiInsights.missingSkillsAI.map(s => (
                        <Badge key={s} className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                          + {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <SkillGap
                  matched={matchResult.matched}
                  missing={matchResult.missing}
                  partial={matchResult.partial}
                  skillGaps={matchResult.skillGaps}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAILORED TAB ── */}
          {tailored && (
            <TabsContent value="tailored">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" /> AI-Tailored Changes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BeforeAfter sections={tailored.sections} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── DOWNLOAD TAB ── */}
          {tailored && (
            <TabsContent value="download">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Download Tailored Resume</CardTitle>
                </CardHeader>
                <CardContent>
                  <PDFPreview sections={tailored.sections} jobTitle={jdKeywords.jobTitle} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── CHECKLIST TAB ── */}
          {tailored && (
            <TabsContent value="checklist">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-green-500" /> Improvement Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tailored.improvementChecklist.map((item, i) => (
                      <label key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer group">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-blue-500" />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">{item}</span>
                      </label>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-800 mb-3">Score Improvement</p>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-600">{tailored.beforeScore}</p>
                        <p className="text-xs text-gray-500">Before</p>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-2 bg-blue-400 rounded-full" style={{ width: `${tailored.beforeScore}%` }} />
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-2 bg-green-400 rounded-full" style={{ width: `${tailored.afterScore}%` }} />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{tailored.afterScore}</p>
                        <p className="text-xs text-gray-500">After</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
