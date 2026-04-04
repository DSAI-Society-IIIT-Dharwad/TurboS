// lib/huggingface/ner.ts
// FIXED: Updated API URL from api-inference.huggingface.co to router.huggingface.co

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

export interface HuggingFaceEntity {
  entity_group: string
  score: number
  word: string
  start: number
  end: number
}

// Extract negated spans from text so we can exclude them
function getNegatedSpans(text: string): Array<{ start: number; end: number }> {
  const negationPatterns = [
    /\bno\s+\w+/gi,
    /\bnot\s+\w+/gi,
    /\bwithout\s+\w+/gi,
    /\bdenies\s+\w+/gi,
    /\bno\s+history\s+of\s+\w+/gi,
    /\bnot\s+having\s+\w+/gi,
    /\bdoes\s+not\s+have\s+\w+/gi,
  ]
  const spans: Array<{ start: number; end: number }> = []
  for (const pattern of negationPatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      spans.push({ start: match.index, end: match.index + match[0].length + 30 })
    }
  }
  return spans
}

function isNegated(
  entity: HuggingFaceEntity,
  negatedSpans: Array<{ start: number; end: number }>
): boolean {
  return negatedSpans.some(
    span => entity.start >= span.start && entity.start <= span.end
  )
}

export async function extractMedicalEntitiesHF(text: string): Promise<MedicalEntities> {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) {
    console.error('Hugging Face API key not found')
    return getEmptyEntities()
  }

  const negatedSpans = getNegatedSpans(text)

  try {
    // FIXED: Use the new router URL instead of the deprecated api-inference URL
    const response = await fetch(
      'https://router.huggingface.co/hf-inference/models/d4data/biomedical-ner-all',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error(`Hugging Face API error (${response.status}):`, error)

      // Model still loading — wait and retry once
      if (response.status === 503) {
        console.log('HF model is loading, retrying in 10s...')
        await new Promise(resolve => setTimeout(resolve, 10_000))
        return extractMedicalEntitiesHF(text)
      }

      // For any other error fall through to empty
      return getEmptyEntities()
    }

    const raw = await response.json()

    // The router may return { generated_text: [...] } or a flat array depending on model
    // d4data/biomedical-ner-all returns a flat array of entity objects
    let entities: HuggingFaceEntity[] = []
    if (Array.isArray(raw)) {
      entities = raw
    } else if (raw && typeof raw === 'object') {
      // Flatten any nested structure just in case
      const candidate = Object.values(raw).find(v => Array.isArray(v))
      if (candidate) entities = candidate as HuggingFaceEntity[]
    }

    const positiveEntities = entities.filter(e => !isNegated(e, negatedSpans))
    return mapEntitiesToStructure(positiveEntities)

  } catch (error) {
    console.error('Hugging Face NER error:', error)
    return getEmptyEntities()
  }
}

function mapEntitiesToStructure(entities: HuggingFaceEntity[]): MedicalEntities {
  const result: MedicalEntities = getEmptyEntities()

  const mappings: Record<string, keyof MedicalEntities> = {
    'Sign_symptom':          'symptoms',
    'SYMPTOM':               'symptoms',
    'SIGN':                  'symptoms',
    'Medication':            'medications',
    'DRUG':                  'medications',
    'CHEMICAL':              'medications',
    'Drug':                  'medications',
    'Disease_disorder':      'diseases',
    'DISEASE':               'diseases',
    'CONDITION':             'diseases',
    'Diagnostic_procedure':  'procedures',
    'Therapeutic_procedure': 'procedures',
    'PROCEDURE':             'procedures',
    'TREATMENT':             'procedures',
    'Lab_value':             'procedures',
    'Biological_structure':  'bodyParts',
    'ANATOMY':               'bodyParts',
    'BODY_PART':             'bodyParts',
    'Severity':              'severity',
    'SEVERITY':              'severity',
    'Duration':              'duration',
    'DATE':                  'duration',
    'TIME':                  'duration',
    'Frequency':             'frequency',
    'FREQUENCY':             'frequency',
  }

  for (const entity of entities) {
    const category = mappings[entity.entity_group]
    if (category && entity.score > 0.5) {
      const word = entity.word.replace(/^##/, '').trim()
      if (word.length > 1 && !result[category].includes(word)) {
        result[category].push(word)
      }
    }
  }

  return result
}

function getEmptyEntities(): MedicalEntities {
  return {
    symptoms:   [],
    medications: [],
    diseases:   [],
    procedures: [],
    bodyParts:  [],
    severity:   [],
    duration:   [],
    frequency:  [],
  }
}