// app/api/ai/generate-summary/route.ts
// Generates a simple, patient-friendly plain-language summary in EN, HI, KN

import { NextRequest, NextResponse } from 'next/server'
import { groq, MODELS } from '@/lib/groq'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const {
      sessionId,
      extractedData,
      nerEntities,
      domain,
      department,
      personName,
      transcript,
    } = await req.json()

    if (!domain) {
      return NextResponse.json({ error: 'Missing domain' }, { status: 400 })
    }

    const deptName = (department || '').replace(/_/g, ' ')
    const isHealthcare = domain === 'HEALTHCARE'

    // ── Build context string ───────────────────────────────────────────────
    const context = [
      transcript ? `CONVERSATION:\n${transcript.slice(0, 3000)}` : '',
      nerEntities && Object.keys(nerEntities).length > 0
        ? `EXTRACTED ENTITIES:\n${JSON.stringify(nerEntities, null, 2)}`
        : '',
      extractedData && Object.keys(extractedData).length > 0
        ? `STRUCTURED DATA:\n${JSON.stringify(extractedData, null, 2)}`
        : '',
    ].filter(Boolean).join('\n\n')

    // ── Check cache ────────────────────────────────────────────────────────
    const hashInput = transcript + JSON.stringify(extractedData || {}) + JSON.stringify(nerEntities || {})
    const currentHash = crypto.createHash('sha256').update(hashInput).digest('hex')

    if (sessionId) {
      const session = await prisma.session.findUnique({ where: { id: sessionId } })
      if (session?.smartSummaryHash === currentHash && session?.smartSummary) {
        return NextResponse.json({ summary: session.smartSummary })
      }
    }

    // ── Healthcare prompt ──────────────────────────────────────────────────
    const healthcarePrompt = `You are a compassionate doctor's assistant. Based on the consultation data below, write a simple, clear patient summary that ANY person can understand — even someone with no medical education.

Patient: ${personName || 'the patient'}
Department: ${deptName}

${context}

Generate a JSON with these EXACT keys. Each value must be in complete sentences that a layperson can easily understand. No medical jargon. Use simple everyday words.

Return JSON only:
{
  "english": {
    "mainProblem": "1-2 simple sentences describing what the problem is",
    "keyFindings": ["simple finding 1", "simple finding 2", "..."],
    "medicines": ["medicine name — what it does and when to take it", "..."],
    "doList": ["specific thing to do or avoid", "..."],
    "followUp": "when and why to come back",
    "redFlags": ["warning sign — come immediately if...", "..."],
    "encouragement": "one warm, encouraging sentence for the patient"
  },
  "hindi": {
    "mainProblem": "मुख्य समस्या सरल हिंदी में",
    "keyFindings": ["सरल जाँच परिणाम 1", "..."],
    "medicines": ["दवाई का नाम — क्या करती है और कब लेनी है", "..."],
    "doList": ["क्या करें या न करें", "..."],
    "followUp": "अगली बार कब और क्यों आएं",
    "redFlags": ["खतरे का संकेत — तुरंत आएं अगर...", "..."],
    "encouragement": "मरीज के लिए एक गर्मजोशी भरा प्रोत्साहन वाक्य"
  },
  "kannada": {
    "mainProblem": "ಮುಖ್ಯ ಸಮಸ್ಯೆ ಸರಳ ಕನ್ನಡದಲ್ಲಿ",
    "keyFindings": ["ಸರಳ ತೀರ್ಮಾನ 1", "..."],
    "medicines": ["ಔಷಧಿ ಹೆಸರು — ಏನು ಮಾಡುತ್ತದೆ ಮತ್ತು ಯಾವಾಗ ತೆಗೆದುಕೊಳ್ಳಬೇಕು", "..."],
    "doList": ["ಏನು ಮಾಡಬೇಕು ಅಥವಾ ಮಾಡಬಾರದು", "..."],
    "followUp": "ಮುಂದಿನ ಭೇಟಿ ಯಾವಾಗ ಮತ್ತು ಏಕೆ",
    "redFlags": ["ಅಪಾಯದ ಸಂಕೇತ — ತಕ್ಷಣ ಬನ್ನಿ ಅಂದರೆ...", "..."],
    "encouragement": "ರೋಗಿಗೆ ಪ್ರೋತ್ಸಾಹ ನೀಡುವ ಒಂದು ಬೆಚ್ಚಗಿನ ವಾಕ್ಯ"
  }
}`

    // ── Finance prompt ─────────────────────────────────────────────────────
    const financePrompt = `You are a friendly financial advisor's assistant. Based on the consultation data below, write a simple, clear client summary that ANY person can understand — no finance jargon allowed.

Client: ${personName || 'the client'}
Department: ${deptName}

${context}

Return JSON only with these EXACT keys:
{
  "english": {
    "mainProblem": "1-2 simple sentences about what was discussed and what the main goal is",
    "keyFindings": ["simple observation 1", "..."],
    "actionItems": ["specific action to take — by when", "..."],
    "doList": ["what to do or avoid financially", "..."],
    "followUp": "when to meet again and why",
    "redFlags": ["financial warning sign to watch out for", "..."],
    "encouragement": "one warm, motivating sentence for the client"
  },
  "hindi": {
    "mainProblem": "मुख्य वित्तीय लक्ष्य सरल हिंदी में",
    "keyFindings": ["सरल अवलोकन 1", "..."],
    "actionItems": ["क्या कदम उठाएं — कब तक", "..."],
    "doList": ["क्या करें या न करें", "..."],
    "followUp": "अगली मुलाकात कब और क्यों",
    "redFlags": ["वित्तीय चेतावनी संकेत", "..."],
    "encouragement": "ग्राहक के लिए प्रेरणादायक वाक्य"
  },
  "kannada": {
    "mainProblem": "ಮುಖ್ಯ ಆರ್ಥಿಕ ಗುರಿ ಸರಳ ಕನ್ನಡದಲ್ಲಿ",
    "keyFindings": ["ಸರಳ ಅವಲೋಕನ 1", "..."],
    "actionItems": ["ಯಾವ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಬೇಕು — ಯಾವಾಗ", "..."],
    "doList": ["ಏನು ಮಾಡಬೇಕು ಅಥವಾ ಮಾಡಬಾರದು", "..."],
    "followUp": "ಮುಂದಿನ ಭೇಟಿ ಯಾವಾಗ ಮತ್ತು ಏಕೆ",
    "redFlags": ["ಆರ್ಥಿಕ ಎಚ್ಚರಿಕೆ ಸಂಕೇತ", "..."],
    "encouragement": "ಗ್ರಾಹಕರಿಗೆ ಪ್ರೇರಣಾದಾಯಕ ವಾಕ್ಯ"
  }
}`

    const response = await groq.chat.completions.create({
      model: MODELS.SMART,
      messages: [{ role: 'user', content: isHealthcare ? healthcarePrompt : financePrompt }],
      temperature: 0.4,
      response_format: { type: 'json_object' },
      max_tokens: 3000,
    })

    let summary: any = {}
    try {
      summary = JSON.parse(response.choices[0].message.content!)
    } catch {
      summary = {
        english: { mainProblem: 'Summary could not be generated. Please generate the full report first.', keyFindings: [], medicines: [], doList: [], followUp: 'Please consult your doctor.', redFlags: [], encouragement: 'Take care!' },
        hindi: { mainProblem: 'सारांश तैयार नहीं हो सका।', keyFindings: [], medicines: [], doList: [], followUp: 'कृपया डॉक्टर से मिलें।', redFlags: [], encouragement: 'ख्याल रखें!' },
        kannada: { mainProblem: 'ಸಾರಾಂಶ ತಯಾರಿಸಲಾಗಲಿಲ್ಲ.', keyFindings: [], medicines: [], doList: [], followUp: 'ದಯವಿಟ್ಟು ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ.', redFlags: [], encouragement: 'ಆರೋಗ್ಯವಾಗಿರಿ!' },
      }
    }

    if (sessionId && Object.keys(summary).length > 0) {
      try {
        await prisma.session.update({
          where: { id: sessionId },
          data: { smartSummary: summary, smartSummaryHash: currentHash }
        })
      } catch (e) { console.error('Failed to update session summary cache', e) }
    }

    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error('Generate summary error:', error)
    return NextResponse.json({ error: 'Failed to generate summary', details: error.message }, { status: 500 })
  }
}