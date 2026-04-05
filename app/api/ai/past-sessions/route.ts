// app/api/ai/past-sessions/route.ts
// Returns summary of a patient's previous sessions for AI context

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { personId, domain, department, currentSessionId } = await req.json()

    if (!personId) {
      return NextResponse.json({ error: 'Missing personId' }, { status: 400 })
    }

    // Fetch the last 5 completed sessions for this person
    // Filter by same domain, optionally same department
    const pastSessions = await prisma.session.findMany({
      where: {
        personId,
        domain: domain || undefined,
        // Include all departments for this person — the AI can decide relevance
        id: currentSessionId ? { not: currentSessionId } : undefined,
        status: { in: ['COMPLETED', 'ARCHIVED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        domain: true,
        department: true,
        extractedData: true,
        nerEntities: true,
        finalReport: true,
        smartSummary: true,
        createdAt: true,
        status: true,
      },
    })

    if (pastSessions.length === 0) {
      return NextResponse.json({ pastContext: null, sessionCount: 0 })
    }

    // Build a concise summary for AI consumption
    const summaries = pastSessions.map((s, i) => {
      const date = new Date(s.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
      const dept = s.department.replace(/_/g, ' ')

      // Extract key info from extractedData
      let keyData = ''
      if (s.extractedData && typeof s.extractedData === 'object') {
        const ed = s.extractedData as any
        const parts: string[] = []
        if (ed.chiefComplaint) parts.push(`Chief complaint: ${ed.chiefComplaint}`)
        if (ed.currentMedications) parts.push(`Medications: ${Array.isArray(ed.currentMedications) ? ed.currentMedications.join(', ') : ed.currentMedications}`)
        if (ed.allergies) parts.push(`Allergies: ${ed.allergies}`)
        if (ed.pastMedicalHistory) parts.push(`Past history: ${ed.pastMedicalHistory}`)
        // Finance fields
        if (ed.clientGoals) parts.push(`Goals: ${Array.isArray(ed.clientGoals) ? ed.clientGoals.join(', ') : ed.clientGoals}`)
        if (ed.riskProfile) parts.push(`Risk profile: ${ed.riskProfile}`)
        if (ed.currentIncome) parts.push(`Income: ${ed.currentIncome}`)
        keyData = parts.join('; ')
      }

      // Extract key NER entities
      let entities = ''
      if (s.nerEntities && typeof s.nerEntities === 'object') {
        const ne = s.nerEntities as any
        const parts: string[] = []
        if (ne.symptoms?.length) parts.push(`Symptoms: ${ne.symptoms.join(', ')}`)
        if (ne.diseases?.length) parts.push(`Diseases: ${ne.diseases.join(', ')}`)
        if (ne.medications?.length) parts.push(`Medications: ${ne.medications.join(', ')}`)
        if (ne.procedures?.length) parts.push(`Procedures: ${ne.procedures.join(', ')}`)
        // Finance entities
        if (ne.investments?.length) parts.push(`Investments: ${ne.investments.join(', ')}`)
        if (ne.goals?.length) parts.push(`Goals: ${ne.goals.join(', ')}`)
        entities = parts.join('; ')
      }

      // Extract summary if available
      let smartSummaryText = ''
      if (s.smartSummary && typeof s.smartSummary === 'object') {
        const ss = s.smartSummary as any
        if (ss.english?.mainProblem) smartSummaryText = ss.english.mainProblem
      }

      return `Session ${i + 1} (${date}, ${dept}): ${smartSummaryText || keyData || 'No details'}${entities ? ` | Entities: ${entities}` : ''}`
    })

    const pastContext = {
      sessionCount: pastSessions.length,
      summary: summaries.join('\n'),
      sessions: pastSessions.map(s => ({
        department: s.department,
        date: s.createdAt,
        extractedData: s.extractedData,
        nerEntities: s.nerEntities,
      })),
    }

    return NextResponse.json({ pastContext })
  } catch (error: any) {
    console.error('Past sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch past sessions', details: error.message },
      { status: 500 }
    )
  }
}
