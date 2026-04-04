// lib/ner/medical-ner.ts

import { groq, MODELS } from '@/lib/groq'

export interface MedicalEntities {
  symptoms: string[]
  medications: string[]
  diseases: string[]
  procedures: string[]
  bodyParts: string[]
  severity: string[]
  duration: string[]
  frequency: string[]
}

export async function extractMedicalEntities(text: string): Promise<MedicalEntities> {
  const prompt = `You are a strict medical Named Entity Recognition (NER) system.

CRITICAL RULES:
- Extract ONLY entities that are POSITIVELY mentioned
- If the patient says "no vomiting", "no fever", "no cough" — DO NOT include those in the list
- Negated symptoms must be completely excluded
- Do NOT hallucinate or infer entities not explicitly stated
- Only include what was directly said, not what might be implied

**Conversation to analyze:**
${text}

**Extract ONLY positively confirmed entities:**
1. SYMPTOMS - Symptoms the patient CONFIRMS having (NOT denied symptoms)
2. MEDICATIONS - Drugs/medicines being taken
3. DISEASES - Confirmed or suspected diagnoses mentioned
4. PROCEDURES - Tests or procedures mentioned (e.g., "blood test", "X-ray", "malaria screening")
5. BODY_PARTS - Body parts mentioned in context of symptoms
6. SEVERITY - Severity words used (e.g., "mild", "severe", "high")
7. DURATION - Time references (e.g., "3 days", "since morning")
8. FREQUENCY - Frequency words (e.g., "daily", "twice a day")

**Negation patterns to exclude:** "no X", "without X", "denies X", "not having X", "no history of X"

Return ONLY valid JSON:
{
  "symptoms": [],
  "medications": [],
  "diseases": [],
  "procedures": [],
  "bodyParts": [],
  "severity": [],
  "duration": [],
  "frequency": []
}`

  try {
    const response = await groq.chat.completions.create({
      model: MODELS.SMART,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 1000
    })
    const entities = JSON.parse(response.choices[0].message.content!)
    return entities as MedicalEntities
  } catch (error) {
    console.error('NER extraction failed:', error)
    return {
      symptoms: [],
      medications: [],
      diseases: [],
      procedures: [],
      bodyParts: [],
      severity: [],
      duration: [],
      frequency: []
    }
  }
}