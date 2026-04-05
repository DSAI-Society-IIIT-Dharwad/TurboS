// app/api/ai/label-speakers/route.ts
// Uses Groq to label each sentence in a transcript as "doctor" or "patient"

import { NextRequest, NextResponse } from 'next/server'
import { groqWithFallback } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { sentences, domain, department } = await req.json()

    if (!sentences || !Array.isArray(sentences) || sentences.length === 0) {
      return NextResponse.json({ error: 'sentences array required' }, { status: 400 })
    }

    const numberedSentences = sentences
      .map((s: string, i: number) => `${i + 1}. "${s}"`)
      .join('\n')

    const domainContext = domain === 'HEALTHCARE'
      ? `This is a medical consultation between a doctor and a patient in the ${(department || 'general').replace(/_/g, ' ')} department.`
      : `This is a financial consultation between a financial advisor (doctor role) and a client (patient role) in ${(department || 'general').replace(/_/g, ' ')}.`

    const prompt = `${domainContext}

Below is a transcript of a conversation. Each line is a separate sentence spoken during the session. These sentences were extracted from continuous recordings where BOTH the doctor and patient may have spoken in a single recording. Your job is to classify WHO said each sentence — either "doctor" or "patient".

**CRITICAL: Mixed-Speaker Recordings**
The sentences below were split from longer recordings. Within what was originally a single recording, MULTIPLE speakers may be present. For example:
- A recording might contain: "Okay." (patient acknowledging) followed by "So, have you taken any medicines?" (doctor asking) — these are TWO different speakers in what was ONE recording.
- Short acknowledgments like "Okay", "Yes", "Hmm", "Alright", "I see", "Thank you" are often the LISTENER responding, not the main speaker.
- When a question follows an acknowledgment, the question is likely from the OPPOSITE speaker.

**Guidelines:**
- Questions about symptoms, medical history, lifestyle, health status, medications, side effects → typically asked by the DOCTOR
- Answers describing personal symptoms, feelings, pain, duration of illness, personal history → typically said by the PATIENT
- Medical advice, prescriptions, diagnoses, recommendations, follow-up instructions → typically said by the DOCTOR
- Greetings and introductions like "I am Dr. ..." → DOCTOR
- Greetings like "Hello doctor", "I have been having..." → PATIENT
- Short affirmative responses ("Yes", "Okay", "Hmm") — determine speaker from context: if the previous sentence was a doctor's question, this is likely the PATIENT answering, and vice versa
- For finance domain: questions about income, investments, goals → ADVISOR (label as "doctor"), answers about personal finances → CLIENT (label as "patient")

**Conversational Flow Patterns:**
- Doctor asks → Patient answers → Doctor follows up: this is the most common pattern
- If two consecutive sentences both seem like questions, the first is likely the doctor's question and the second might be the patient asking for clarification
- If you see a pattern like "Yes [acknowledgment]. [New question]" — the acknowledgment and the question may be from DIFFERENT speakers
- Pay close attention to pronoun usage: "I feel..." (patient), "You should..." (doctor)

**Transcript:**
${numberedSentences}

Return ONLY a JSON object in this exact format:
{
  "labels": [
    { "index": 0, "speaker": "doctor" },
    { "index": 1, "speaker": "patient" },
    ...
  ]
}

Rules:
- "index" is 0-based (first sentence = 0)
- "speaker" must be exactly "doctor" or "patient"
- Label ALL ${sentences.length} sentences
- Do NOT assume each sentence alternates speakers — analyze the CONTENT of each sentence
- Use context clues from the conversation flow (doctors ask, patients answer)
- Detect speaker changes WITHIN what might have been a single continuous recording
- If unsure, use the conversational flow context: doctors typically initiate and patients respond`

    const response = await groqWithFallback({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      stream: false,
    }, false) as any // use FAST model since this is a classification task

    const result = JSON.parse(response.choices[0].message.content!)
    const labels: Array<{ index: number; speaker: 'doctor' | 'patient' }> = result.labels || []

    // Validate and fill gaps — ensure every sentence has a label
    const finalLabels = sentences.map((_: string, i: number) => {
      const found = labels.find(l => l.index === i)
      if (found && (found.speaker === 'doctor' || found.speaker === 'patient')) {
        return found.speaker
      }
      // Fallback: alternate starting with doctor
      return i % 2 === 0 ? 'doctor' : 'patient'
    })

    return NextResponse.json({ labels: finalLabels })
  } catch (error: any) {
    console.error('Speaker labeling error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to label speakers' },
      { status: 500 }
    )
  }
}
