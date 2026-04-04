// app/api/ai/generate-report/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { groq, MODELS } from '@/lib/groq'
import { extractMedicalEntities } from '@/lib/ner/medical-ner'

// Section color map for clinical assessment subheadings
const SECTION_COLORS: Record<string, { dark: string; light: string; icon: string }> = {
  'Differential Diagnosis':     { dark: '#60A5FA', light: '#1d4ed8', icon: '⊕' },
  'Most Likely Diagnosis':      { dark: '#34D399', light: '#065f46', icon: '✓' },
  'Recommended Investigations': { dark: '#FBBF24', light: '#92400e', icon: '🔬' },
  'Treatment Plan':             { dark: '#F472B6', light: '#9d174d', icon: '💊' },
  'Follow-up Recommendations':  { dark: '#A78BFA', light: '#4c1d95', icon: '📅' },
  'Red Flags':                  { dark: '#F87171', light: '#991b1b', icon: '⚠' },
}

export async function POST(req: NextRequest) {
  try {
    const {
      transcript,
      extractedData,
      nerEntities,
      domain,
      department,
      template,
      personName
    } = await req.json()

    if (!transcript || !domain || !department) {
      return NextResponse.json(
        { error: 'Missing required fields: transcript, domain, department' },
        { status: 400 }
      )
    }

    let finalReport = ''

    if (domain === 'HEALTHCARE') {
      try {
        let entities = nerEntities
        if (!entities || Object.keys(entities).length === 0) {
          entities = await extractMedicalEntities(transcript)
        }

        // Structured clinical data extraction
        const structuredPrompt = `Analyze this clinical consultation and extract structured information.
CRITICAL:
- Only extract what was EXPLICITLY mentioned
- If denied (e.g. "no vomiting"), do NOT include it
- Never invent or infer

Conversation:
${transcript}

NER confirmed entities:
${JSON.stringify(entities, null, 2)}

Return JSON only:
{
  "chiefComplaint": "primary complaint as stated",
  "historyOfPresentIllness": "symptom history in 1-2 sentences",
  "pastMedicalHistory": "if mentioned, else null",
  "currentMedications": ["only explicitly mentioned medications"],
  "allergies": "if mentioned, else null",
  "familyHistory": "if mentioned, else null",
  "physicalExamination": "if mentioned, else null",
  "vitals": {
    "bp": "if mentioned, else null",
    "pulse": "if mentioned, else null",
    "temp": "if mentioned, else null",
    "spo2": "if mentioned, else null",
    "rr": "if mentioned, else null"
  }
}`

        const structuredResponse = await groq.chat.completions.create({
          model: MODELS.SMART,
          messages: [{ role: 'user', content: structuredPrompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' },
          max_tokens: 1500
        })

        let sd: any = {}
        try {
          sd = JSON.parse(structuredResponse.choices[0].message.content!)
        } catch {
          sd = { chiefComplaint: 'See consultation notes', historyOfPresentIllness: transcript.substring(0, 200) }
        }

        // Clinical assessment — request clean HTML with exact section names
        const assessmentPrompt = `You are an experienced ${department.replace(/_/g, ' ')} physician.
Write a clinical assessment based ONLY on what was discussed.

Confirmed symptoms: ${JSON.stringify(entities.symptoms)}
Confirmed diseases: ${JSON.stringify(entities.diseases)}
Confirmed procedures/tests: ${JSON.stringify(entities.procedures)}
Medications: ${JSON.stringify(entities.medications)}

Conversation:
${transcript}

Write clean HTML only. No markdown. No backticks.
Use EXACTLY these section names in <h3> tags (spelling must match exactly):
- Differential Diagnosis
- Most Likely Diagnosis
- Recommended Investigations
- Treatment Plan
- Follow-up Recommendations
- Red Flags

Format each section as:
<h3>Section Name</h3>
<p>explanation...</p>
<ul><li>item</li></ul>

Important: Base ONLY on confirmed symptoms. Do not include denied symptoms.`

        const assessmentResponse = await groq.chat.completions.create({
          model: MODELS.SMART,
          messages: [{ role: 'user', content: assessmentPrompt }],
          temperature: 0.4,
          max_tokens: 2000
        })

        let assessmentHtml = assessmentResponse.choices[0].message.content!
          .replace(/```html/gi, '').replace(/```/g, '').trim()

        // Inject colored subheadings by replacing <h3>Section Name</h3>
        // with a styled version that has data-section attribute
        Object.entries(SECTION_COLORS).forEach(([name, colors]) => {
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`<h3>\\s*${escaped}\\s*</h3>`, 'gi')
          assessmentHtml = assessmentHtml.replace(regex, `<h3 data-section="${name}">${name}</h3>`)
        })

        const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
        const deptName = department.replace(/_/g, ' ')
        const medications = Array.isArray(sd.currentMedications)
          ? (sd.currentMedications.join(', ') || 'None')
          : (sd.currentMedications || 'None')

        // Build vitals row if any are available
        const vitalsEntries = [
          sd.vitals?.bp    && `BP: ${sd.vitals.bp}`,
          sd.vitals?.pulse && `Pulse: ${sd.vitals.pulse}`,
          sd.vitals?.temp  && `Temp: ${sd.vitals.temp}`,
          sd.vitals?.spo2  && `SpO2: ${sd.vitals.spo2}`,
          sd.vitals?.rr    && `RR: ${sd.vitals.rr}`,
        ].filter(Boolean).join('  |  ')

        finalReport = `
<div class="rpt-wrap">

  <div class="rpt-header">
    <h1 class="rpt-title">MEDICAL CONSULTATION REPORT</h1>
    <p class="rpt-subtitle">Confidential &nbsp;•&nbsp; ${deptName} Department</p>
  </div>

  <div class="rpt-info-box">
    <h2 class="rpt-section-title rpt-section-title--blue">Patient Information</h2>
    <table class="rpt-table">
      <tr>
        <td class="rpt-td-label">Name</td>
        <td class="rpt-td-value">${personName || 'Unknown'}</td>
        <td class="rpt-td-label">Date</td>
        <td class="rpt-td-value">${date}</td>
      </tr>
      <tr>
        <td class="rpt-td-label">Department</td>
        <td class="rpt-td-value">${deptName}</td>
        <td class="rpt-td-label">Medications</td>
        <td class="rpt-td-value">${medications}</td>
      </tr>
      ${sd.allergies ? `<tr>
        <td class="rpt-td-label">Allergies</td>
        <td class="rpt-td-value" colspan="3">${sd.allergies}</td>
      </tr>` : ''}
      ${vitalsEntries ? `<tr>
        <td class="rpt-td-label">Vitals</td>
        <td class="rpt-td-value" colspan="3">${vitalsEntries}</td>
      </tr>` : ''}
    </table>
  </div>

  <div class="rpt-section">
    <h2 class="rpt-section-title rpt-section-title--blue">Chief Complaint</h2>
    <p class="rpt-body">${sd.chiefComplaint || 'Not specified'}</p>
  </div>

  <div class="rpt-section">
    <h2 class="rpt-section-title rpt-section-title--blue">History of Present Illness</h2>
    <p class="rpt-body">${sd.historyOfPresentIllness || 'Not documented'}</p>
  </div>

  ${sd.pastMedicalHistory ? `<div class="rpt-section">
    <h2 class="rpt-section-title rpt-section-title--blue">Past Medical History</h2>
    <p class="rpt-body">${sd.pastMedicalHistory}</p>
  </div>` : ''}

  <div class="rpt-section rpt-assessment">
    <h2 class="rpt-section-title rpt-section-title--green">Clinical Assessment &amp; Plan</h2>
    <div class="rpt-assessment-body">${assessmentHtml}</div>
  </div>

  <div class="rpt-footer">
    Generated by Voice Intelligence System &nbsp;|&nbsp; ${date}
  </div>

</div>

<style>
/* ─── Base structure ─────────────────────────────────────────── */
.rpt-wrap { font-family: Georgia, 'Times New Roman', serif; max-width: 780px; }
.rpt-header { text-align: center; border-bottom: 2px solid; padding-bottom: 12px; margin-bottom: 20px; }
.rpt-title { font-size: 1.35rem; font-weight: 700; letter-spacing: 0.05em; margin: 0 0 4px 0; }
.rpt-subtitle { font-size: 0.78rem; margin: 0; opacity: 0.55; }

.rpt-info-box { border-radius: 6px; padding: 12px; margin-bottom: 16px; border: 1px solid; }
.rpt-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.rpt-td-label { font-weight: 700; padding: 5px 8px; width: 18%; opacity: 0.65; }
.rpt-td-value { padding: 5px 8px; }

.rpt-section { margin-bottom: 14px; }
.rpt-section-title {
  font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; padding-left: 10px;
  margin: 0 0 7px 0; border-left: 3px solid;
}
.rpt-body { font-size: 0.875rem; line-height: 1.75; margin: 0; }

/* Assessment subheading base */
.rpt-assessment-body h3 {
  font-size: 0.88rem;
  font-weight: 700;
  margin: 16px 0 5px 0;
  padding: 5px 10px 5px 12px;
  border-radius: 4px;
  border-left: 3px solid;
  display: block;
}
.rpt-assessment-body p  { font-size: 0.875rem; line-height: 1.75; margin: 0 0 6px 0; }
.rpt-assessment-body ul, .rpt-assessment-body ol { font-size: 0.875rem; padding-left: 20px; margin: 4px 0 8px; }
.rpt-assessment-body li { margin-bottom: 4px; line-height: 1.65; }
.rpt-assessment-body strong { font-weight: 700; }

.rpt-footer { font-size: 0.72rem; text-align: center; margin-top: 24px; padding-top: 8px; border-top: 1px solid; opacity: 0.45; }

/* ─── DARK theme (inside #report-content) ───────────────────── */
#report-content .rpt-wrap { color: #CCC; }
#report-content .rpt-header { border-color: #2A2A2A; }
#report-content .rpt-title { color: #E8E8E8; }
#report-content .rpt-info-box { background: #0D1520; border-color: #1E3A5F; }
#report-content .rpt-table td { border-color: #1A2A3A; }
#report-content .rpt-td-label { color: #6B8FAF; }
#report-content .rpt-td-value { color: #CCC; }
#report-content .rpt-section-title--blue { color: #60A5FA; border-color: #3b82f6; }
#report-content .rpt-section-title--green { color: #34D399; border-color: #10b981; }
#report-content .rpt-body { color: #BBB; }
#report-content .rpt-footer { border-color: #2A2A2A; color: #555; }

/* Assessment body dark */
#report-content .rpt-assessment-body { color: #BBB; }
#report-content .rpt-assessment-body p { color: #BBB; }
#report-content .rpt-assessment-body li { color: #BBB; }
#report-content .rpt-assessment-body strong { color: #E8E8E8; }

/* Colored subheadings — DARK */
#report-content .rpt-assessment-body h3[data-section="Differential Diagnosis"]     { color: #60A5FA; background: #0A1828; border-color: #3b82f6; }
#report-content .rpt-assessment-body h3[data-section="Most Likely Diagnosis"]      { color: #34D399; background: #051A10; border-color: #10b981; }
#report-content .rpt-assessment-body h3[data-section="Recommended Investigations"] { color: #FBBF24; background: #1A1200; border-color: #f59e0b; }
#report-content .rpt-assessment-body h3[data-section="Treatment Plan"]             { color: #F472B6; background: #1A0510; border-color: #ec4899; }
#report-content .rpt-assessment-body h3[data-section="Follow-up Recommendations"]  { color: #A78BFA; background: #0F0A1A; border-color: #8b5cf6; }
#report-content .rpt-assessment-body h3[data-section="Red Flags"]                  { color: #F87171; background: #1A0505; border-color: #ef4444; }

/* ─── LIGHT theme (PDF clone — no #report-content parent) ────── */
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-header { border-color: #1a3a5c; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-title  { color: #1a3a5c; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-info-box { background: #eff6ff; border-color: #bfdbfe; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-table td { border-color: #d1d5db; background: #fff; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-table tr:nth-child(even) td { background: #f9fafb; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-td-label { color: #4b5563; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-td-value { color: #111827; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-section-title--blue  { color: #1d4ed8; border-color: #2563eb; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-section-title--green { color: #065f46; border-color: #059669; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-body { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-footer { border-color: #e5e7eb; color: #9ca3af; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body p  { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body li { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body strong { color: #111827; }

/* Colored subheadings — LIGHT (PDF) */
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Differential Diagnosis"]     { color: #1d4ed8; background: #eff6ff; border-color: #2563eb; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Most Likely Diagnosis"]      { color: #065f46; background: #ecfdf5; border-color: #059669; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Recommended Investigations"] { color: #92400e; background: #fffbeb; border-color: #f59e0b; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Treatment Plan"]             { color: #9d174d; background: #fdf2f8; border-color: #ec4899; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Follow-up Recommendations"]  { color: #4c1d95; background: #f5f3ff; border-color: #8b5cf6; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-section="Red Flags"]                  { color: #991b1b; background: #fef2f2; border-color: #ef4444; }
</style>`

      } catch (err) {
        console.error('Healthcare report error:', err)
        const date = new Date().toLocaleDateString('en-IN')
        finalReport = `<div class="rpt-wrap">
  <div class="rpt-header"><h1 class="rpt-title">MEDICAL CONSULTATION REPORT</h1></div>
  <p class="rpt-body"><strong>Patient:</strong> ${personName || 'Unknown'} &nbsp;|&nbsp; <strong>Date:</strong> ${date}</p>
  <p class="rpt-body" style="white-space:pre-wrap;">${transcript}</p>
</div>`
      }

    } else {
      // Finance domain
      try {
        const financePrompt = `You are a senior financial advisor. Analyze this financial consultation thoroughly. Only extract what was EXPLICITLY mentioned. Be detailed and specific.

Conversation:
${transcript}

${nerEntities ? `Extracted entities:\n${JSON.stringify(nerEntities, null, 2)}` : ''}

Return JSON only:
{
  "clientGoals": ["list each financial goal discussed in detail"],
  "currentIncome": "monthly/annual income if mentioned, else null",
  "monthlyExpenses": "total or breakdown if mentioned, else null",
  "savingsRate": "percentage or amount if mentioned, else null",
  "riskProfile": "conservative/moderate/aggressive — infer from discussion",
  "taxSituation": "current tax bracket, filings, deductions mentioned",
  "liabilities": [{"type":"loan/debt type","amount":"if mentioned","rate":"interest rate if mentioned","tenure":"if mentioned"}],
  "existingInvestments": [{"type":"MF/FD/stocks/etc","details":"specifics mentioned"}],
  "recommendations": [{"title":"short title","detail":"detailed recommendation with reasoning","priority":"high/medium/low","timeline":"when to act"}],
  "taxOptimization": [{"strategy":"strategy name","detail":"how to implement","potentialSaving":"estimated saving if possible"}],
  "riskAssessment": {"overallRisk":"low/medium/high","factors":["risk factors identified"],"mitigations":["suggested mitigations"]},
  "incomeExpenseBreakdown": {"income":[{"source":"source","amount":"amount"}],"expenses":[{"category":"category","amount":"amount"}]},
  "insuranceReview": "insurance coverage mentioned or gaps identified, null if not discussed",
  "emergencyFund": "status of emergency fund if discussed, null if not",
  "actionItems": [{"action":"specific action","deadline":"suggested timeline","priority":"high/medium/low"}],
  "summary": "2-3 sentence executive summary of the entire consultation"
}`

        const financeResponse = await groq.chat.completions.create({
          model: MODELS.SMART,
          messages: [{ role: 'user', content: financePrompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
          max_tokens: 3000
        })

        let fd: any = {}
        try { fd = JSON.parse(financeResponse.choices[0].message.content!) }
        catch { fd = { clientGoals: [], recommendations: [{ title: 'Review needed', detail: 'Please review manually', priority: 'high', timeline: 'Immediate' }] } }

        // Generate detailed analysis narrative
        const analysisPrompt = `You are a senior financial advisor. Based on this consultation, write a detailed financial analysis.

Conversation:
${transcript}

Extracted data:
${JSON.stringify(fd, null, 2)}

Write clean HTML only. No markdown. No backticks. Use these EXACT section names in <h3> tags:
- Financial Health Assessment
- Investment Strategy
- Risk Analysis
- Tax Planning Strategy
- Debt Management Plan
- Retirement & Long-term Planning

Format each section as:
<h3>Section Name</h3>
<p>detailed analysis...</p>
<ul><li>specific point</li></ul>

Be thorough and specific. Reference actual numbers discussed. Provide actionable insights.`

        const analysisResponse = await groq.chat.completions.create({
          model: MODELS.SMART,
          messages: [{ role: 'user', content: analysisPrompt }],
          temperature: 0.4,
          max_tokens: 2500
        })

        let analysisHtml = analysisResponse.choices[0].message.content!
          .replace(/```html/gi, '').replace(/```/g, '').trim()

        const FIN_ANALYSIS_SECTIONS: Record<string, { dark: string; bg: string; border: string }> = {
          'Financial Health Assessment': { dark: '#34D399', bg: '#051A10', border: '#10b981' },
          'Investment Strategy': { dark: '#60A5FA', bg: '#0A1828', border: '#3b82f6' },
          'Risk Analysis': { dark: '#F87171', bg: '#1A0505', border: '#ef4444' },
          'Tax Planning Strategy': { dark: '#FBBF24', bg: '#1A1200', border: '#f59e0b' },
          'Debt Management Plan': { dark: '#F472B6', bg: '#1A0510', border: '#ec4899' },
          'Retirement & Long-term Planning': { dark: '#A78BFA', bg: '#0F0A1A', border: '#8b5cf6' },
        }

        Object.entries(FIN_ANALYSIS_SECTIONS).forEach(([name, colors]) => {
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`<h3>\\s*${escaped}\\s*</h3>`, 'gi')
          analysisHtml = analysisHtml.replace(regex, `<h3 data-finsection="${name}">${name}</h3>`)
        })

        const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
        const deptName = department.replace(/_/g, ' ')

        // Build liabilities table
        const liabilitiesHtml = fd.liabilities?.length > 0 ? `
<div class="rpt-section">
  <h2 class="rpt-fin-heading" data-fin="liabilities">Outstanding Liabilities</h2>
  <table class="rpt-table"><tr><td class="rpt-td-label">Type</td><td class="rpt-td-label">Amount</td><td class="rpt-td-label">Rate</td><td class="rpt-td-label">Tenure</td></tr>
  ${fd.liabilities.map((l: any) => `<tr><td class="rpt-td-value">${l.type || '-'}</td><td class="rpt-td-value">${l.amount || '-'}</td><td class="rpt-td-value">${l.rate || '-'}</td><td class="rpt-td-value">${l.tenure || '-'}</td></tr>`).join('')}
  </table>
</div>` : ''

        // Build recommendations with priority badges
        const recsHtml = fd.recommendations?.length > 0 ? fd.recommendations.map((r: any) => `
<div style="padding:10px 14px;border-radius:8px;margin-bottom:8px;border-left:3px solid ${r.priority === 'high' ? '#ef4444' : r.priority === 'medium' ? '#f59e0b' : '#34D399'};">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
    <strong>${r.title || 'Recommendation'}</strong>
    <span style="font-size:10px;padding:1px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:0.05em;
      background:${r.priority === 'high' ? '#1A050522' : r.priority === 'medium' ? '#1A120022' : '#051A1022'};
      color:${r.priority === 'high' ? '#F87171' : r.priority === 'medium' ? '#FBBF24' : '#34D399'};">${r.priority || 'medium'}</span>
    ${r.timeline ? `<span style="font-size:10px;color:#666;">⏱ ${r.timeline}</span>` : ''}
  </div>
  <p class="rpt-body">${r.detail || ''}</p>
</div>`).join('') : '<p class="rpt-body">No specific recommendations at this time.</p>'

        // Build action items
        const actionsHtml = fd.actionItems?.length > 0 ? fd.actionItems.map((a: any) => `
<li class="rpt-body"><strong>${a.action}</strong>${a.deadline ? ` — <em>by ${a.deadline}</em>` : ''}${a.priority ? ` [${a.priority}]` : ''}</li>`).join('') : '<li class="rpt-body">No immediate actions identified</li>'

        // Tax optimization
        const taxHtml = fd.taxOptimization?.length > 0 ? fd.taxOptimization.map((t: any) => `
<li class="rpt-body"><strong>${t.strategy}</strong>: ${t.detail || ''}${t.potentialSaving ? ` — Potential saving: ${t.potentialSaving}` : ''}</li>`).join('') : '<li class="rpt-body">No tax optimization strategies discussed</li>'

        finalReport = `
<div class="rpt-wrap">

  <div class="rpt-header">
    <h1 class="rpt-title">FINANCIAL CONSULTATION REPORT</h1>
    <p class="rpt-subtitle">Confidential &nbsp;•&nbsp; ${deptName} Department</p>
  </div>

  <div class="rpt-info-box">
    <h2 class="rpt-section-title rpt-section-title--green">Client Information</h2>
    <table class="rpt-table">
      <tr>
        <td class="rpt-td-label">Name</td>
        <td class="rpt-td-value">${personName || 'Valued Client'}</td>
        <td class="rpt-td-label">Date</td>
        <td class="rpt-td-value">${date}</td>
      </tr>
      <tr>
        <td class="rpt-td-label">Department</td>
        <td class="rpt-td-value">${deptName}</td>
        <td class="rpt-td-label">Risk Profile</td>
        <td class="rpt-td-value" style="text-transform:capitalize;">${fd.riskProfile || 'To be assessed'}</td>
      </tr>
      ${fd.currentIncome ? `<tr>
        <td class="rpt-td-label">Income</td>
        <td class="rpt-td-value">${fd.currentIncome}</td>
        <td class="rpt-td-label">Expenses</td>
        <td class="rpt-td-value">${fd.monthlyExpenses || 'Not specified'}</td>
      </tr>` : ''}
      ${fd.savingsRate ? `<tr>
        <td class="rpt-td-label">Savings Rate</td>
        <td class="rpt-td-value">${fd.savingsRate}</td>
        <td class="rpt-td-label">Emergency Fund</td>
        <td class="rpt-td-value">${fd.emergencyFund || 'Not discussed'}</td>
      </tr>` : ''}
      ${fd.taxSituation ? `<tr>
        <td class="rpt-td-label">Tax Situation</td>
        <td class="rpt-td-value" colspan="3">${fd.taxSituation}</td>
      </tr>` : ''}
      ${fd.insuranceReview ? `<tr>
        <td class="rpt-td-label">Insurance</td>
        <td class="rpt-td-value" colspan="3">${fd.insuranceReview}</td>
      </tr>` : ''}
    </table>
  </div>

  ${fd.summary ? `<div class="rpt-section">
    <h2 class="rpt-section-title rpt-section-title--green">Executive Summary</h2>
    <p class="rpt-body">${fd.summary}</p>
  </div>` : ''}

  <div class="rpt-section">
    <h2 class="rpt-fin-heading" data-fin="clientGoals">Financial Goals</h2>
    <ul>${(fd.clientGoals?.length ? fd.clientGoals : ['Not specified']).map((g: string) => `<li class="rpt-body">${g}</li>`).join('')}</ul>
  </div>

  ${liabilitiesHtml}

  <div class="rpt-section">
    <h2 class="rpt-fin-heading" data-fin="recommendations">Recommendations</h2>
    ${recsHtml}
  </div>

  ${fd.riskAssessment ? `<div class="rpt-section">
    <h2 class="rpt-fin-heading" data-fin="riskAssessment">Risk Assessment</h2>
    <p class="rpt-body"><strong>Overall Risk Level:</strong> ${fd.riskAssessment.overallRisk || 'Not assessed'}</p>
    ${fd.riskAssessment.factors?.length ? `<p class="rpt-body" style="margin-top:6px;"><strong>Risk Factors:</strong></p><ul>${fd.riskAssessment.factors.map((f: string) => `<li class="rpt-body">${f}</li>`).join('')}</ul>` : ''}
    ${fd.riskAssessment.mitigations?.length ? `<p class="rpt-body" style="margin-top:6px;"><strong>Mitigations:</strong></p><ul>${fd.riskAssessment.mitigations.map((m: string) => `<li class="rpt-body">${m}</li>`).join('')}</ul>` : ''}
  </div>` : ''}

  <div class="rpt-section">
    <h2 class="rpt-fin-heading" data-fin="taxOptimization">Tax Optimization Strategies</h2>
    <ul>${taxHtml}</ul>
  </div>

  <div class="rpt-section">
    <h2 class="rpt-fin-heading" data-fin="actionItems">Action Items</h2>
    <ol>${actionsHtml}</ol>
  </div>

  <div class="rpt-section rpt-assessment">
    <h2 class="rpt-section-title rpt-section-title--green">Detailed Financial Analysis</h2>
    <div class="rpt-assessment-body">${analysisHtml}</div>
  </div>

  <div class="rpt-footer">
    Generated by Voice Intelligence System &nbsp;|&nbsp; ${date}
  </div>

</div>

<style>
.rpt-wrap { font-family: Georgia, 'Times New Roman', serif; max-width: 780px; }
.rpt-header { text-align: center; border-bottom: 2px solid; padding-bottom: 12px; margin-bottom: 20px; }
.rpt-title { font-size: 1.35rem; font-weight: 700; letter-spacing: 0.05em; margin: 0 0 4px 0; }
.rpt-subtitle { font-size: 0.78rem; margin: 0; opacity: 0.55; }
.rpt-info-box { border-radius: 6px; padding: 12px; margin-bottom: 16px; border: 1px solid; }
.rpt-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.rpt-td-label { font-weight: 700; padding: 5px 8px; width: 18%; opacity: 0.65; }
.rpt-td-value { padding: 5px 8px; }
.rpt-section { margin-bottom: 14px; }
.rpt-section-title { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding-left: 10px; margin: 0 0 7px 0; border-left: 3px solid; }
.rpt-fin-heading { font-size: 0.88rem; font-weight: 700; margin: 14px 0 6px 0; padding: 5px 10px 5px 12px; border-radius: 4px; border-left: 3px solid; }
.rpt-body { font-size: 0.875rem; line-height: 1.75; margin: 0; }
ul { padding-left: 20px; margin: 4px 0 8px; }
li { margin-bottom: 4px; line-height: 1.65; }
.rpt-footer { font-size: 0.72rem; text-align: center; margin-top: 24px; padding-top: 8px; border-top: 1px solid; opacity: 0.45; }

/* Dark */
#report-content .rpt-wrap { color: #CCC; }
#report-content .rpt-header { border-color: #2A2A2A; }
#report-content .rpt-title { color: #E8E8E8; }
#report-content .rpt-info-box { background: #0A1D14; border-color: #065f46; }
#report-content .rpt-table td { border-color: #1A2E22; }
#report-content .rpt-td-label { color: #6BAF8F; }
#report-content .rpt-td-value { color: #CCC; }
#report-content .rpt-section-title--green { color: #34D399; border-color: #10b981; }
#report-content .rpt-body { color: #BBB; }
#report-content li { color: #BBB; }
#report-content .rpt-footer { border-color: #2A2A2A; color: #555; }
#report-content [data-fin="clientGoals"]     { color: #34D399; background: #051A10; border-color: #10b981; }
#report-content [data-fin="recommendations"] { color: #60A5FA; background: #0A1828; border-color: #3b82f6; }
#report-content [data-fin="taxOptimization"] { color: #FBBF24; background: #1A1200; border-color: #f59e0b; }
#report-content [data-fin="actionItems"]     { color: #A78BFA; background: #0F0A1A; border-color: #8b5cf6; }
#report-content [data-fin="liabilities"]     { color: #F472B6; background: #1A0510; border-color: #ec4899; }
#report-content [data-fin="riskAssessment"]  { color: #F87171; background: #1A0505; border-color: #ef4444; }

/* Financial analysis subheadings — DARK */
#report-content .rpt-assessment-body h3[data-finsection="Financial Health Assessment"] { color: #34D399; background: #051A10; border-color: #10b981; }
#report-content .rpt-assessment-body h3[data-finsection="Investment Strategy"]         { color: #60A5FA; background: #0A1828; border-color: #3b82f6; }
#report-content .rpt-assessment-body h3[data-finsection="Risk Analysis"]               { color: #F87171; background: #1A0505; border-color: #ef4444; }
#report-content .rpt-assessment-body h3[data-finsection="Tax Planning Strategy"]       { color: #FBBF24; background: #1A1200; border-color: #f59e0b; }
#report-content .rpt-assessment-body h3[data-finsection="Debt Management Plan"]        { color: #F472B6; background: #1A0510; border-color: #ec4899; }
#report-content .rpt-assessment-body h3[data-finsection="Retirement & Long-term Planning"] { color: #A78BFA; background: #0F0A1A; border-color: #8b5cf6; }

/* Assessment body dark */
#report-content .rpt-assessment-body { color: #BBB; }
#report-content .rpt-assessment-body p { color: #BBB; }
#report-content .rpt-assessment-body li { color: #BBB; }
#report-content .rpt-assessment-body strong { color: #E8E8E8; }
#report-content .rpt-assessment-body h3 { font-size: 0.88rem; font-weight: 700; margin: 16px 0 5px 0; padding: 5px 10px 5px 12px; border-radius: 4px; border-left: 3px solid; display: block; }

ol { padding-left: 20px; margin: 4px 0 8px; }

/* Light (PDF) */
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-header { border-color: #065f46; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-title  { color: #065f46; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-info-box { background: #ecfdf5; border-color: #a7f3d0; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-table td { border-color: #d1d5db; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-td-label { color: #4b5563; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-td-value { color: #111827; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-section-title--green { color: #065f46; border-color: #059669; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-body { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) li { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-footer { border-color: #e5e7eb; color: #9ca3af; }
.rpt-wrap:not(#report-content .rpt-wrap) [data-fin="clientGoals"]     { color: #065f46; background: #ecfdf5; border-color: #059669; }
.rpt-wrap:not(#report-content .rpt-wrap) [data-fin="recommendations"] { color: #1d4ed8; background: #eff6ff; border-color: #2563eb; }
.rpt-wrap:not(#report-content .rpt-wrap) [data-fin="taxOptimization"] { color: #92400e; background: #fffbeb; border-color: #f59e0b; }
.rpt-wrap:not(#report-content .rpt-wrap) [data-fin="actionItems"]     { color: #4c1d95; background: #f5f3ff; border-color: #8b5cf6; }
.rpt-wrap:not(#report-content .rpt-wrap) [data-fin="liabilities"]     { color: #9d174d; background: #fdf2f8; border-color: #ec4899; }
.rpt-wrap:not(#report-content .rpt-wrap) [data-fin="riskAssessment"]  { color: #991b1b; background: #fef2f2; border-color: #ef4444; }

/* Financial analysis subheadings — LIGHT (PDF) */
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-finsection="Financial Health Assessment"] { color: #065f46; background: #ecfdf5; border-color: #059669; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-finsection="Investment Strategy"]         { color: #1d4ed8; background: #eff6ff; border-color: #2563eb; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-finsection="Risk Analysis"]               { color: #991b1b; background: #fef2f2; border-color: #ef4444; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-finsection="Tax Planning Strategy"]       { color: #92400e; background: #fffbeb; border-color: #f59e0b; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-finsection="Debt Management Plan"]        { color: #9d174d; background: #fdf2f8; border-color: #ec4899; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body h3[data-finsection="Retirement & Long-term Planning"] { color: #4c1d95; background: #f5f3ff; border-color: #8b5cf6; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body p { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body li { color: #374151; }
.rpt-wrap:not(#report-content .rpt-wrap) .rpt-assessment-body strong { color: #111827; }
</style>`

      } catch (err) {
        console.error('Finance report error:', err)
        finalReport = `<div class="rpt-wrap"><h1 class="rpt-title">FINANCIAL CONSULTATION REPORT</h1><p class="rpt-body">${transcript}</p></div>`
      }
    }

    return NextResponse.json({ report: finalReport })

  } catch (error: any) {
    console.error('Report generation failed:', error)
    return NextResponse.json({ error: 'Report generation failed', details: error.message }, { status: 500 })
  }
}