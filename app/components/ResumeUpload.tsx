'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, X, Loader2, User, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NLPProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
}

interface ResumeUploadProps {
  onParsed: (text: string, sections: { name: string; content: string }[]) => void;
  onTextChange: (text: string) => void;
  resumeText: string;
}

export default function ResumeUpload({ onParsed, onTextChange, resumeText }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [profile, setProfile] = useState<NLPProfile | null>(null);
  const [nlpBadge, setNlpBadge] = useState<'spacy' | 'regex' | null>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setLoading(true);
    setError('');
    setProfile(null);

    const formData = new FormData();
    formData.append('file', f);

    try {
      const res = await fetch('/api/parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parse failed');
      onParsed(data.text, data.sections);
      onTextChange(data.text);

      if (data.nlp?.profile) {
        setProfile(data.nlp.profile);
        setNlpBadge(data.nlp.spaCyAvailable ? 'spacy' : 'regex');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  }, [onParsed, onTextChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant={mode === 'upload' ? 'default' : 'outline'} size="sm" onClick={() => setMode('upload')}>
          Upload File
        </Button>
        <Button variant={mode === 'paste' ? 'default' : 'outline'} size="sm" onClick={() => setMode('paste')}>
          Paste Text
        </Button>
      </div>

      {mode === 'upload' ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => document.getElementById('resume-file-input')?.click()}
        >
          <input
            id="resume-file-input"
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-600">Parsing resume + NLP analysis…</p>
            </div>
          ) : file && resumeText ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-8 w-8 text-green-500" />
              <p className="text-sm font-medium text-green-700">{file.name}</p>
              <p className="text-xs text-gray-500">{resumeText.split(/\s+/).length} words extracted</p>
              {nlpBadge && (
                <Badge className={nlpBadge === 'spacy'
                  ? 'bg-purple-100 text-purple-700 border-purple-200 text-xs'
                  : 'bg-gray-100 text-gray-600 border-gray-200 text-xs'
                }>
                  {nlpBadge === 'spacy' ? 'spaCy NER' : 'Regex extraction'}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={e => {
                e.stopPropagation();
                setFile(null);
                setProfile(null);
                onTextChange('');
              }}>
                <X className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="text-sm font-medium">Drop your resume here</p>
              <p className="text-xs text-gray-500">PDF, DOCX, or TXT</p>
            </div>
          )}
        </div>
      ) : (
        <textarea
          className="w-full h-48 p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          placeholder="Paste your resume text here..."
          value={resumeText}
          onChange={e => { onTextChange(e.target.value); onParsed(e.target.value, []); }}
        />
      )}

      {/* Instant profile preview from spaCy NER */}
      {profile && (profile.name || profile.email || profile.phone) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-green-700 mb-1.5">Detected Profile</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
            {profile.name && (
              <span className="flex items-center gap-1 font-medium">
                <User className="h-3 w-3" /> {profile.name}
              </span>
            )}
            {profile.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {profile.email}
              </span>
            )}
            {profile.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {profile.phone}
              </span>
            )}
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {profile.location}
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <X className="h-4 w-4" /> {error}
        </p>
      )}
    </div>
  );
}
