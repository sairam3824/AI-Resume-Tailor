'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, MinusCircle } from 'lucide-react';
import type { SkillGap as SkillGapType } from '@/lib/matcher';

interface SkillGapProps {
  matched: string[];
  missing: string[];
  partial: string[];
  skillGaps: SkillGapType[];
}

export default function SkillGap({ matched, missing, partial, skillGaps }: SkillGapProps) {
  const highPriority = skillGaps.filter(g => g.importance === 'high');
  const medPriority = skillGaps.filter(g => g.importance === 'medium');
  const lowPriority = skillGaps.filter(g => g.importance === 'low');

  return (
    <div className="space-y-4">
      {/* Keyword summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-700">{matched.length}</p>
          <p className="text-xs text-green-600">Matched</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center">
          <MinusCircle className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-yellow-700">{partial.length}</p>
          <p className="text-xs text-yellow-600">Partial</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <AlertCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-700">{missing.length}</p>
          <p className="text-xs text-red-600">Missing</p>
        </div>
      </div>

      {/* Matched keywords */}
      {matched.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Matched Keywords
          </p>
          <div className="flex flex-wrap gap-1.5">
            {matched.map(k => (
              <Badge
                key={k}
                className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 text-xs"
              >
                {k}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Partial matches */}
      {partial.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Partial Matches
          </p>
          <div className="flex flex-wrap gap-1.5">
            {partial.map(k => (
              <Badge
                key={k}
                className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 text-xs"
              >
                {k}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Missing keywords / skill gaps */}
      {skillGaps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Skill Gaps
          </p>
          <div className="space-y-2">
            {highPriority.length > 0 && (
              <div>
                <p className="text-xs text-red-600 font-medium mb-1">High Priority</p>
                <div className="space-y-1.5">
                  {highPriority.map(gap => (
                    <div key={gap.keyword} className="bg-red-50 rounded-md p-2 text-xs">
                      <span className="font-medium text-red-700">{gap.keyword}</span>
                      <p className="text-red-600 mt-0.5">{gap.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {medPriority.length > 0 && (
              <div>
                <p className="text-xs text-yellow-600 font-medium mb-1">Medium Priority</p>
                <div className="flex flex-wrap gap-1.5">
                  {medPriority.map(gap => (
                    <Badge
                      key={gap.keyword}
                      className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs"
                    >
                      + {gap.keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {lowPriority.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Low Priority</p>
                <div className="flex flex-wrap gap-1.5">
                  {lowPriority.map(gap => (
                    <Badge
                      key={gap.keyword}
                      variant="outline"
                      className="text-gray-600 text-xs"
                    >
                      + {gap.keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
