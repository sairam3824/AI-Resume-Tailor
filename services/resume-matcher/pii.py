import re
import spacy
from typing import List, Tuple, Optional

class PIIRedactor:
    def __init__(self, nlp_model):
        self.nlp = nlp_model
        # Regex patterns for common identifiers
        self.patterns = {
            "EMAIL": r'[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}',
            "PHONE": r'(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})|\b\d{3}[-.\s]\d{4}\b',
            "LINKEDIN": r'linkedin\.com/in/[\w-]+',
            "GITHUB": r'github\.com/[\w-]+',
            "WEBSITE": r'(?:https?://)?(?:www\.)?[\w-]+\.[\w./?=&%-]+'
        }

    def detect(self, text: str) -> List[Tuple[int, int, str]]:
        """Detect entities and return (start, end, label)."""
        findings = []

        # 1. Regex detection
        for label, pattern in self.patterns.items():
            for match in re.finditer(pattern, text, re.IGNORECASE):
                findings.append((match.start(), match.end(), label))

        # 2. NER detection
        if self.nlp:
            doc = self.nlp(text[:10000]) # Limit to prevent timeouts
            for ent in doc.ents:
                # We target PERSON, GPE (Location), and potentially ORG if needed
                if ent.label_ in ("PERSON", "GPE"):
                    # Check if already covered by regex
                    already_found = any(f[0] <= ent.start_char and f[1] >= ent.end_char for f in findings)
                    if not already_found:
                        # Safety check: don't redact if it's a common section header or too short
                        if ent.text.lower() not in ["experience", "summary", "education", "skills"] and len(ent.text) > 2:
                            findings.append((ent.start_char, ent.end_char, ent.label_))

        # Sort by start position
        return sorted(findings, key=lambda x: x[0])

    def redact(self, text: str, placeholder_style: str = "label") -> str:
        """
        Redact PII in text.
        Styles: 'label' -> [PERSON], 'mask' -> [REDACTED], 'char' -> *****
        """
        findings = self.detect(text)
        
        # Sort in reverse to replace without affecting indices
        findings.sort(key=lambda x: x[0], reverse=True)
        
        result = text
        for start, end, label in findings:
            if placeholder_style == "label":
                replacement = f"[{label}]"
            elif placeholder_style == "mask":
                replacement = "[REDACTED]"
            else:
                replacement = "*" * (end - start)
            
            result = result[:start] + replacement + result[end:]
        
        return result

# Simple test if run directly
if __name__ == "__main__":
    try:
        nlp = spacy.load("en_core_web_sm")
    except:
        nlp = None
        
    redactor = PIIRedactor(nlp)
    test_text = "John Doe lives in New York. You can contact him at john.doe@example.com or 555-123-4567. He is on LinkedIn at linkedin.com/in/johndoe."
    print("Original:", test_text)
    print("Redacted:", redactor.redact(test_text))
