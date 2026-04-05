// app/api/ai/suggest-questions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { groq, MODELS } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { context, messages, domain, department, extractedData, nerEntities, pastSessionContext } = await req.json()

    const conversationHistory = messages
      ?.map((m: any) => `${m.speaker === 'doctor' ? 'Doctor' : 'Patient'}: ${m.text}`)
      .join('\n') || ''

    // Build past session context block if available
    const pastContextBlock = pastSessionContext?.summary
      ? `\n**Patient's Past Session History:**\n${pastSessionContext.summary}\n\nUse this history to ask more informed, relevant follow-up questions. Reference past symptoms, diagnoses, medications, or financial data when appropriate.\n`
      : ''

    const prompt = domain === 'HEALTHCARE' 
      ? `You are an AI assistant helping a ${department.replace('_', ' ')} doctor conduct a patient interview.

**Conversation so far:**
${conversationHistory}

**Already extracted symptoms/conditions:**
${JSON.stringify(nerEntities, null, 2)}

**Extracted data:**
${JSON.stringify(extractedData, null, 2)}
${pastContextBlock}
Based on the conversation, generate 3-5 smart follow-up questions the doctor should ask to:
1. Clarify symptoms
2. Understand severity and duration
3. Identify risk factors
4. Complete medical history
${pastSessionContext?.summary ? '5. Follow up on findings from previous sessions' : ''}

CRITICAL RULES:
- You are ONLY suggesting questions. Do NOT provide diagnoses, feedback, or your own medical opinions.
- Do NOT give treatment advice or speculative assessments.
- Questions should be direct, medical, and build on previous answers.
${pastSessionContext?.summary ? '- Reference the patient\'s history from past sessions when formulating questions.' : ''}

Return ONLY a JSON object: { "questions": ["question1", "question2", ...] }`
      : `You are an AI assistant helping a ${department.replace('_', ' ')} financial advisor.

**Conversation so far:**
${conversationHistory}

**Extracted data:**
${JSON.stringify(extractedData, null, 2)}
${pastContextBlock}
Based on the conversation, generate 3-5 smart follow-up questions to:
1. Understand financial goals
2. Assess risk profile
3. Know current financial situation
4. Identify tax optimization opportunities
${pastSessionContext?.summary ? '5. Follow up on financial plans from previous sessions' : ''}

CRITICAL RULES:
- You are ONLY suggesting questions. Do NOT provide financial advice, opinions, or your own recommendations.
- Do NOT give investment suggestions or speculative assessments.
${pastSessionContext?.summary ? '- Reference the client\'s history from past sessions when formulating questions.' : ''}

Return ONLY a JSON object: { "questions": ["question1", "question2", ...] }`
    const response = await groq.chat.completions.create({
      model: MODELS.SMART,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content!)

    return NextResponse.json({ questions: result.questions || [] })
  } catch (error) {
    console.error('Question generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}