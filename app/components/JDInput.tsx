'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link, FileText, Loader2, X } from 'lucide-react';

interface JDInputProps {
  jdText: string;
  jdUrl: string;
  onJDTextChange: (text: string) => void;
  onJDUrlChange: (url: string) => void;
}

export default function JDInput({ jdText, jdUrl, onJDTextChange, onJDUrlChange }: JDInputProps) {
  const [mode, setMode] = useState<'text' | 'url'>('text');

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          variant={mode === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('text')}
        >
          <FileText className="h-4 w-4 mr-1" /> Paste JD
        </Button>
        <Button
          variant={mode === 'url' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('url')}
        >
          <Link className="h-4 w-4 mr-1" /> From URL
        </Button>
      </div>

      {mode === 'text' ? (
        <div className="relative">
          <textarea
            className="w-full h-48 p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste the job description here..."
            value={jdText}
            onChange={e => onJDTextChange(e.target.value)}
          />
          {jdText && (
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => onJDTextChange('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="url"
            className="w-full p-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://company.com/jobs/..."
            value={jdUrl}
            onChange={e => onJDUrlChange(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            The job description will be scraped from the URL during analysis.
          </p>
        </div>
      )}

      {jdText && (
        <p className="text-xs text-gray-500">
          {jdText.split(/\s+/).length} words
        </p>
      )}
    </div>
  );
}
