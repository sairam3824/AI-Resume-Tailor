'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import type { TailoredSection } from '@/lib/tailor';

interface PDFPreviewProps {
  sections: TailoredSection[];
  jobTitle?: string;
}

export default function PDFPreview({ sections, jobTitle }: PDFPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  const fullText = sections.map(s => {
    return `${s.sectionName.toUpperCase()}\n${'─'.repeat(40)}\n${s.tailored}\n`;
  }).join('\n');

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Build printable HTML
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tailored Resume${jobTitle ? ` - ${jobTitle}` : ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #111;
      padding: 0.75in;
      max-width: 8.5in;
      margin: 0 auto;
    }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1.5px solid #333;
      padding-bottom: 2px;
      margin-top: 16px;
      margin-bottom: 8px;
    }
    .section-content {
      white-space: pre-wrap;
      font-size: 10.5pt;
    }
    @media print {
      body { padding: 0.5in; }
    }
  </style>
</head>
<body>
  ${sections.map(s => `
    <div class="section">
      <div class="section-title">${s.sectionName}</div>
      <div class="section-content">${s.tailored.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>
  `).join('')}
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tailored-resume${jobTitle ? `-${jobTitle.replace(/\s+/g, '-').toLowerCase()}` : ''}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tailored-resume.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button onClick={handleDownload} disabled={downloading} size="sm">
          <Download className="h-4 w-4 mr-1" />
          Download HTML
        </Button>
        <Button onClick={handleDownloadTxt} variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-1" />
          Download TXT
        </Button>
      </div>

      {/* Preview */}
      <div className="border rounded-lg bg-white shadow-inner max-h-96 overflow-y-auto">
        <div className="p-6 text-[11px] font-serif leading-relaxed">
          {sections.map((section, i) => (
            <div key={i} className="mb-4">
              <div className="font-bold uppercase tracking-wider border-b border-gray-800 pb-0.5 mb-2 text-[10px]">
                {section.sectionName}
              </div>
              <pre className="whitespace-pre-wrap font-serif text-gray-800">
                {section.tailored}
              </pre>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Download as HTML and open in browser to print as PDF using your browser's print dialog.
      </p>
    </div>
  );
}
