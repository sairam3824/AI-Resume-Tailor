from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import CountVectorizer
import re
import io
import json
import os
from typing import Optional, List
from openai import OpenAI
from pii import PIIRedactor

app = FastAPI(title="Resume Matcher NLP Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load spaCy model
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
    SPACY_AVAILABLE = True
except Exception:
    SPACY_AVAILABLE = False
    nlp = None
    print("WARNING: spaCy not available, falling back to regex-only extraction")

# Initialize PII Redactor
redactor = PIIRedactor(nlp)


class TextAnalysisRequest(BaseModel):
    text: str
    jd_text: Optional[str] = None
    redact_pii: bool = False

class RedactionRequest(BaseModel):
    text: str
    placeholder_style: str = "label"  # label, mask, char


# ── Profile Extraction ──────────────────────────────────────────────────────

def extract_profile_info(text: str, nlp_doc=None) -> dict:
    email_match = re.search(r'[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}', text)
    phone_match = re.search(
        r'(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})', text
    )
    linkedin_match = re.search(r'linkedin\.com/in/[\w-]+', text, re.IGNORECASE)
    github_match = re.search(r'github\.com/[\w-]+', text, re.IGNORECASE)

    person_name = None
    location = None

    if nlp_doc:
        for ent in nlp_doc.ents:
            if ent.label_ == "PERSON" and not person_name:
                # Only pick up short person names near top of doc
                if ent.start_char < 300 and len(ent.text.split()) <= 4:
                    person_name = ent.text
            if ent.label_ == "GPE" and not location:
                location = ent.text
    else:
        # Regex fallback: Look for a sequence of 2-4 Title Case words in the first few non-empty lines
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        for line in lines[:5]:
            # Skip common section headers
            if line.lower() in ["experience", "summary", "education", "skills"]:
                 continue
            name_match = re.search(r'^([A-Z][a-z]+(?:[\s-][A-Z][a-z]+){1,3})', line)
            if name_match:
                person_name = name_match.group(1)
                break

    return {
        "name": person_name,
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0).strip() if phone_match else None,
        "location": location,
        "linkedin": linkedin_match.group(0) if linkedin_match else None,
        "github": github_match.group(0) if github_match else None,
    }


# ── Keyword Extraction ───────────────────────────────────────────────────────

def extract_keywords_basic(text: str, n: int = 20) -> list:
    try:
        vectorizer = CountVectorizer(
            stop_words='english', max_features=n, ngram_range=(1, 2)
        )
        vectorizer.fit_transform([text])
        return list(vectorizer.get_feature_names_out())
    except Exception:
        return []


def extract_named_skills(text: str, nlp_doc=None) -> list:
    """Extract skills/tools using spaCy + patterns."""
    skills = []
    if nlp_doc:
        # Extract ORG, PRODUCT entities as potential tools
        for ent in nlp_doc.ents:
            if ent.label_ in ("ORG", "PRODUCT") and len(ent.text) < 30:
                skills.append(ent.text)
    return list(set(skills))[:15]


# ── Rule-Based ATS Scoring ───────────────────────────────────────────────────

def calculate_rule_based_score(text: str, profile: dict) -> dict:
    score = 0
    feedback = []
    breakdown = {
        "contact_info": 0,
        "structure": 0,
        "content_length": 0,
        "keywords": 0,
        "impact": 0,
    }

    # 1. Contact Info (20 pts)
    if profile.get("email"):
        score += 8; breakdown["contact_info"] += 8
    else:
        feedback.append("Add your email address")

    if profile.get("phone"):
        score += 7; breakdown["contact_info"] += 7
    else:
        feedback.append("Add your phone number")

    if profile.get("name"):
        score += 3; breakdown["contact_info"] += 3

    if profile.get("linkedin"):
        score += 2; breakdown["contact_info"] += 2

    # 2. Content Length (20 pts)
    word_count = len(text.split())
    if 400 <= word_count <= 1000:
        score += 20; breakdown["content_length"] += 20
    elif word_count >= 250:
        score += 10; breakdown["content_length"] += 10
        if word_count < 400:
            feedback.append("Resume is too short — add more detail about your experience")
        else:
            feedback.append("Resume may be too long — aim for 400–1000 words")
    else:
        score += 5; breakdown["content_length"] += 5
        feedback.append("Resume is very short — add much more detail")

    # 3. Section Structure (20 pts)
    sections = ["experience", "education", "skills", "projects", "summary", "profile", "objective"]
    found_sections = [s for s in sections if re.search(rf'\b{s}\b', text, re.IGNORECASE)]
    section_score = min(len(found_sections) * 4, 20)
    score += section_score; breakdown["structure"] += section_score

    missing_sections = [s for s in ["experience", "education", "skills"] if not re.search(rf'\b{s}\b', text, re.IGNORECASE)]
    if missing_sections:
        feedback.append(f"Add missing sections: {', '.join(missing_sections)}")

    # 4. Action Verbs / Keywords (20 pts)
    action_verbs = [
        "managed", "developed", "led", "created", "designed", "implemented",
        "analyzed", "collaborated", "engineered", "optimized", "built", "launched",
        "delivered", "reduced", "increased", "improved", "scaled", "automated",
        "architected", "mentored", "deployed", "migrated", "integrated",
    ]
    found_verbs = [v for v in action_verbs if re.search(rf'\b{v}\b', text, re.IGNORECASE)]
    keyword_score = min(len(found_verbs) * 2, 20)
    score += keyword_score; breakdown["keywords"] += keyword_score

    if len(found_verbs) < 5:
        feedback.append("Use more strong action verbs (Managed, Developed, Led, Optimized, Built…)")

    # 5. Quantifiable Impact (20 pts)
    metrics = re.findall(r'\d+%|\$[\d,]+|\d+x|\d+\s*\+', text)
    impact_words = ["increased", "decreased", "reduced", "improved", "grew", "saved", "generated", "delivered"]
    found_impact = [w for w in impact_words if re.search(rf'\b{w}\b', text, re.IGNORECASE)]

    if len(metrics) >= 3 or (len(metrics) > 0 and len(found_impact) > 0):
        score += 20; breakdown["impact"] += 20
    elif len(metrics) > 0 or len(found_impact) > 0:
        score += 10; breakdown["impact"] += 10
        feedback.append("Good start with numbers — quantify more results (e.g. 'Increased sales by 20%')")
    else:
        feedback.append("Add quantifiable results: use numbers, percentages, and $ amounts to show impact")

    return {
        "total_score": min(score, 100),
        "breakdown": breakdown,
        "feedback": feedback,
    }


# ── AI Analysis ──────────────────────────────────────────────────────────────

async def get_ai_analysis(text: str, jd_text: str = "") -> Optional[dict]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    client = OpenAI(api_key=api_key)

    jd_section = f"""
JOB DESCRIPTION (for targeted gap analysis):
{jd_text[:1500]}
""" if jd_text else ""

    prompt = f"""You are an expert ATS analyst and senior tech recruiter.
Analyze the resume{' against the job description' if jd_text else ''} and return ONLY valid JSON:
{{
    "total_score": <number 0-100>,
    "breakdown": {{
        "contact_info": <0-20>,
        "structure": <0-20>,
        "content_length": <0-20>,
        "keywords": <0-20>,
        "impact": <0-20>
    }},
    "feedback": [<5-8 specific, actionable improvement strings>],
    "extracted_keywords": [<top 15 technical skills/tools found in resume>],
    "soft_skills": [<top 6 soft skills found>],
    "missing_skills": [<8 crucial skills the JD expects but resume lacks>],
    "predicted_roles": [<top 4 job titles this candidate is best suited for>],
    "summary_critique": "<1-2 sentence critique of the professional summary section>"
}}

Focus heavily on Impact — look for quantified results in Work Experience.
{jd_section}
RESUME:
{text[:3500]}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=700,
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"AI analysis error: {e}")
        return None


# ── Routes ───────────────────────────────────────────────────────────────────

@app.post("/api/analyze-text")
async def analyze_text(body: TextAnalysisRequest):
    """Main endpoint: accepts raw resume text + optional JD text, returns full NLP analysis."""
    text = body.text
    jd_text = body.jd_text or ""

    # PII Redaction if requested
    redacted_text = None
    if body.redact_pii:
        redacted_text = redactor.redact(text)

    # spaCy NLP
    nlp_doc = nlp(text[:5000]) if SPACY_AVAILABLE else None

    # Profile extraction
    profile = extract_profile_info(text, nlp_doc)

    # Keyword extraction
    cv_keywords = extract_keywords_basic(text, n=20)
    named_skills = extract_named_skills(text, nlp_doc)

    # Rule-based score (always available, fast fallback)
    rule_score = calculate_rule_based_score(text, profile)

    # AI analysis (runs if OpenAI key present)
    ai = await get_ai_analysis(text, jd_text)

    # Merge: AI takes priority over rule-based
    if ai:
        final_score = {
            "total_score": ai.get("total_score", rule_score["total_score"]),
            "breakdown": ai.get("breakdown", rule_score["breakdown"]),
            "feedback": ai.get("feedback", rule_score["feedback"]),
        }
        # Append missing skills to feedback
        if ai.get("missing_skills"):
            final_score["feedback"].append(
                f"Key missing skills: {', '.join(ai['missing_skills'][:6])}"
            )
        keywords = ai.get("extracted_keywords") or cv_keywords
        soft_skills = ai.get("soft_skills", [])
        predicted_roles = ai.get("predicted_roles", [])
        missing_skills = ai.get("missing_skills", [])
        summary_critique = ai.get("summary_critique", "")
    else:
        final_score = rule_score
        keywords = cv_keywords
        soft_skills = []
        predicted_roles = []
        missing_skills = []
        summary_critique = ""

    return {
        "profile": profile,
        "score": {
            "totalScore": final_score["total_score"],
            "breakdown": {
                "contactInfo": final_score["breakdown"].get("contact_info", 0),
                "structure": final_score["breakdown"].get("structure", 0),
                "contentLength": final_score["breakdown"].get("content_length", 0),
                "keywords": final_score["breakdown"].get("keywords", 0),
                "impact": final_score["breakdown"].get("impact", 0),
            },
            "feedback": final_score["feedback"],
        },
        "keywords": keywords,
        "namedSkills": named_skills,
        "softSkills": soft_skills,
        "predictedRoles": predicted_roles,
        "missingSkills": missing_skills,
        "summaryCritique": summary_critique,
        "spaCyAvailable": SPACY_AVAILABLE,
        "aiAvailable": ai is not None,
        "redactedText": redacted_text,
    }


@app.post("/api/redact")
async def redact_content(body: RedactionRequest):
    """Specific endpoint for PII redaction (anonymization)."""
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    
    redacted = redactor.redact(body.text, placeholder_style=body.placeholder_style)
    return {"original": body.text, "redacted": redacted}


@app.post("/api/parser")
async def parse_resume_file(file: UploadFile = File(...)):
    """Legacy PDF file upload endpoint (kept for compatibility)."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files supported on this endpoint")
    content = await file.read()
    try:
        from pdfminer.high_level import extract_text
        text = extract_text(io.BytesIO(content))
        body = TextAnalysisRequest(text=text)
        return await analyze_text(body)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "spacy": SPACY_AVAILABLE,
        "openai": bool(os.getenv("OPENAI_API_KEY")),
    }
