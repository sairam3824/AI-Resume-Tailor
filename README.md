# AI Resume Tailor

> Auto-customize your resume for every job application. Upload your resume + paste a job description → AI analyzes skill gaps, rewrites bullet points to match JD keywords, scores your ATS fit, and generates a tailored resume.

## ✨ Features

| Feature | Description |
|---|---|
| **Resume Upload** | Supports PDF, DOCX, or raw text paste. Parses and extracts structured sections automatically. |
| **JD Input** | Paste job description text or provide a URL to scrape. |
| **Keyword Analysis** | Extracts required/preferred skills, tools, and experience levels from the JD using NLP (spaCy) + AI. |
| **ATS Scoring (0–100)** | Measures keyword density, section structure, formatting, quantified achievements, and contact info completeness. |
| **Skill Gap Analysis** | Visual matched ✅ / partial 🟡 / missing 🔴 keyword breakdown with prioritized suggestions. |
| **AI Resume Tailoring** | Rewrites bullet points to incorporate JD keywords while preserving authenticity (powered by GPT-4o-mini). |
| **Before/After Comparison** | Side-by-side view of original vs. tailored content with change reasons. |
| **Score Improvement** | Before/after ATS score comparison after tailoring. |
| **Improvement Checklist** | AI-generated actionable checklist for further improvements. |
| **AI Insights** | Predicted best-fit job roles, professional summary critique, soft skills detection, and named entity extraction. |
| **Download** | Export tailored resume as HTML (print to PDF) or plain text. |

---

## 🏗️ Architecture

The app is a **full-stack** system with two services:

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│   Next.js Frontend + API     │  HTTP  │   Python NLP Microservice    │
│   (Port 3000)                │◄──────►│   (Port 8000)                │
│                              │        │                              │
│  • React UI (App Router)     │        │  • spaCy NER (en_core_web_sm)│
│  • PDF/DOCX parsing          │        │  • scikit-learn keywords     │
│  • Keyword extraction        │        │  • Rule-based ATS scoring    │
│  • JD matching & scoring     │        │  • OpenAI GPT-4o-mini        │
│  • AI bullet-point rewriting │        │  • Profile extraction        │
│  • Tailwind + shadcn/ui      │        │  • FastAPI + Uvicorn         │
└──────────────────────────────┘        └──────────────────────────────┘
```

The Python NLP service is **optional** — the Next.js app provides its own keyword extraction, matching, and ATS scoring as a fallback if the Python service is unavailable.

---

## 🛠️ Tech Stack

### Frontend & API
- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** components
- **Geist** font family (Sans + Mono)
- **Recharts** for data visualization
- **lucide-react** for icons
- **pdf-parse** for PDF text extraction
- **mammoth** for DOCX parsing
- **OpenAI SDK** (GPT-4o-mini) for AI-powered bullet point rewriting

### Python NLP Microservice
- **FastAPI** + **Uvicorn**
- **spaCy** (`en_core_web_sm`) for named entity recognition
- **scikit-learn** (`CountVectorizer`) for keyword extraction
- **OpenAI** (GPT-4o-mini) for deep AI analysis
- **pdfminer.six** for server-side PDF parsing

---

## 📁 Project Structure

```
ai-resume-tailor/
├── app/
│   ├── page.tsx                     # Home — resume upload + JD input (split view)
│   ├── layout.tsx                   # Root layout with Geist fonts & metadata
│   ├── globals.css                  # Global styles (Tailwind v4)
│   ├── analysis/
│   │   └── page.tsx                 # Analysis dashboard (ATS score, gaps, tailoring)
│   ├── components/
│   │   ├── ResumeUpload.tsx         # File upload + drag & drop + text paste
│   │   ├── JDInput.tsx              # JD text/URL input
│   │   ├── ScoreGauge.tsx           # Semicircle ATS score gauge
│   │   ├── SkillGap.tsx             # Keyword match/gap visualization
│   │   ├── BeforeAfter.tsx          # Side-by-side original vs tailored
│   │   └── PDFPreview.tsx           # Resume preview + download
│   └── api/
│       ├── parse/route.ts           # Resume file parsing endpoint
│       ├── analyze/route.ts         # JD analysis + keyword matching
│       └── tailor/route.ts          # AI resume rewriting endpoint
├── components/
│   └── ui/                          # shadcn/ui primitives
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── progress.tsx
│       ├── scroll-area.tsx
│       ├── separator.tsx
│       └── tabs.tsx
├── lib/
│   ├── parser.ts                    # PDF/DOCX text extraction + section detection
│   ├── keyword-extractor.ts         # JD keyword extraction logic
│   ├── matcher.ts                   # Resume ↔ JD matching + ATS scoring
│   ├── tailor.ts                    # OpenAI-powered bullet point rewriting
│   ├── python-client.ts             # HTTP client for Python NLP service
│   └── utils.ts                     # Utility helpers (cn)
├── services/
│   └── resume-matcher/
│       ├── main.py                  # FastAPI NLP service (spaCy + OpenAI)
│       └── requirements.txt         # Python dependencies
├── start-dev.sh                     # One-command full-stack launcher
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── components.json                  # shadcn/ui config
└── .env.local                       # API keys (not committed)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Conda** (for the Python NLP service)
- **OpenAI API key**

### 1. Clone & Install

```bash
git clone https://github.com/your-username/ai-resume-tailor.git
cd ai-resume-tailor
npm install
```

### 2. Configure Environment

Create `.env.local` in the project root:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Set Up Python NLP Service (Optional)

```bash
conda create -n resume-nlp python=3.11 -y
conda activate resume-nlp
pip install -r services/resume-matcher/requirements.txt
```

### 4. Run (Full Stack)

The easiest way to start everything:

```bash
bash start-dev.sh
```

This launches:
- ⚡ **Next.js** dev server → [http://localhost:3000](http://localhost:3000)
- 🐍 **Python NLP** service → [http://localhost:8000](http://localhost:8000)

Or run services individually:

```bash
# Next.js only
npm run dev

# Python NLP only
npm run dev:python
```

---

## 📖 Usage

1. **Upload your resume** — drag & drop a PDF/DOCX or paste the text directly
2. **Paste the job description** — enter the JD text or a job posting URL
3. Click **Analyze & Score** to get:
   - ATS compatibility score (0–100) with per-category breakdown
   - Keyword match/gap analysis (matched, partial, missing)
   - AI insights: predicted roles, summary critique, soft skills
4. Click **Tailor Resume** to get AI-rewritten bullet points optimized for the JD
5. **Review** the before/after comparison and improvement checklist
6. **Download** the tailored resume

---

## 🔌 API Endpoints

### Next.js API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/parse` | Parse uploaded resume file (PDF/DOCX) → extracted text |
| `POST` | `/api/analyze` | Analyze resume text against JD → match results + ATS score |
| `POST` | `/api/tailor` | AI-rewrite resume bullet points for the target JD |

### Python NLP Service

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze-text` | Full NLP analysis: profile, keywords, ATS score, AI insights |
| `POST` | `/api/parser` | Legacy PDF upload + analysis |
| `GET` | `/health` | Health check (spaCy + OpenAI status) |

---

## 📄 License

[MIT](LICENSE)
