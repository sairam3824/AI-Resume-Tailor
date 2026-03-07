'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import type { TailoredSection } from '@/lib/tailor';

interface BeforeAfterProps {
  sections: TailoredSection[];
}

function diffHighlight(original: string, tailored: string): React.ReactNode {
  if (original === tailored) return <span>{tailored}</span>;
  return (
    <span className="bg-green-100 text-green-900 rounded px-0.5">
      {tailored}
    </span>
  );
}

function SectionCard({ section }: { section: TailoredSection }) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges = section.changes.length > 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
          <span className="font-medium text-sm capitalize">{section.sectionName}</span>
          {hasChanges && (
            <Badge className="bg-blue-100 text-blue-700 text-xs border-blue-200">
              <Sparkles className="h-3 w-3 mr-1" />
              {section.changes.length} change{section.changes.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-3">
          {hasChanges ? (
            <div className="space-y-4">
              {section.changes.map((change, i) => (
                <div key={i} className="space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-red-600 mb-1 flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-400 rounded-full inline-block" />
                        Before
                      </p>
                      <div className="bg-red-50 rounded p-2 text-gray-700 leading-relaxed">
                        {change.original}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-green-600 mb-1 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
                        After
                      </p>
                      <div className="bg-green-50 rounded p-2 text-gray-700 leading-relaxed">
                        {change.tailored}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 italic bg-gray-50 rounded p-1.5">
                    Why: {change.reason}
                  </p>
                  {i < section.changes.length - 1 && (
                    <hr className="border-gray-200" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
              <pre className="whitespace-pre-wrap font-sans">{section.tailored}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BeforeAfter({ sections }: BeforeAfterProps) {
  const sectionsWithChanges = sections.filter(s => s.changes.length > 0);
  const totalChanges = sections.reduce((sum, s) => sum + s.changes.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">
          {totalChanges} AI-powered improvement{totalChanges !== 1 ? 's' : ''} across {sectionsWithChanges.length} section{sectionsWithChanges.length !== 1 ? 's' : ''}
        </span>
      </div>

      <Tabs defaultValue="changes">
        <TabsList className="h-8">
          <TabsTrigger value="changes" className="text-xs">By Section</TabsTrigger>
          <TabsTrigger value="full" className="text-xs">Full Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="changes" className="space-y-2 mt-3">
          {sections.map((section, i) => (
            <SectionCard key={i} section={section} />
          ))}
        </TabsContent>

        <TabsContent value="full" className="mt-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-red-400 rounded-full" />
                Original Resume
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono leading-relaxed max-h-96 overflow-y-auto border">
                {sections.map((s, i) => (
                  <div key={i} className="mb-4">
                    <p className="font-bold uppercase text-gray-500 text-[10px] mb-1">
                      {s.sectionName}
                    </p>
                    <pre className="whitespace-pre-wrap font-sans text-gray-700">
                      {s.original}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-green-600 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                Tailored Resume
              </p>
              <div className="bg-green-50 rounded-lg p-4 text-xs font-mono leading-relaxed max-h-96 overflow-y-auto border border-green-200">
                {sections.map((s, i) => (
                  <div key={i} className="mb-4">
                    <p className="font-bold uppercase text-gray-500 text-[10px] mb-1">
                      {s.sectionName}
                    </p>
                    <pre className="whitespace-pre-wrap font-sans text-gray-700">
                      {s.tailored}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
