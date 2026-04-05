'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FileText, Download, Check, Send, Sparkles, Stethoscope, User,
  Loader2, Mic, MicOff, Volume2, ChevronRight,
  Activity, Clock, Zap, Brain, X, ChevronDown, ChevronUp,
  Pencil, CheckCheck, Bold, Italic, List, Underline, Minus, Plus,
  MessageCircle, Calendar, Pill, BookOpen, Globe, Languages
} from 'lucide-react'
import { useSessionPolling } from '@/lib/hooks/useSessionPolling'
import { generatePDFClient } from '@/lib/pdf/client-generator'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Utterance {
  id: string
  text: string
  detectedLanguage: string
  timestamp: Date
}

type SpeakerLabel = 'doctor' | 'patient'

interface LabeledLine {
  text: string
  speaker: SpeakerLabel
}

type LangKey = 'ENGLISH' | 'HINDI' | 'KANNADA'
const LANG_LABELS: Record<LangKey, string> = { ENGLISH: 'EN', HINDI: 'हि', KANNADA: 'ಕ' }
const LANG_CODES: Record<LangKey, string> = { ENGLISH: 'en-IN', HINDI: 'hi-IN', KANNADA: 'kn-IN' }

const ENTITY_COLORS: Record<string, string> = {
  symptoms: '#60A5FA', medications: '#F472B6', diseases: '#34D399',
  procedures: '#FBBF24', bodyParts: '#A78BFA', severity: '#F87171',
  duration: '#6EE7B7', frequency: '#FCD34D',
  income: '#34D399', expenses: '#F87171', investments: '#60A5FA',
  taxes: '#FBBF24', loans: '#F472B6', insurance: '#A78BFA',
  goals: '#6EE7B7', amounts: '#FCD34D', timeframes: '#93C5FD', taxSections: '#86EFAC',
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SingleSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  // ── Core ──
  const [session, setSession] = useState<any>(null)
  const [utterances, setUtterances] = useState<Utterance[]>([])
  const [extractedData, setExtractedData] = useState<any>({})
  const [nerEntities, setNerEntities] = useState<any>({})
  const [report, setReport] = useState('')
  const [exports, setExports] = useState<any[]>([])

  // ── Language ──
  const [selectedLanguage, setSelectedLanguage] = useState<LangKey | 'AUTO'>('AUTO')
  const [detectedLang, setDetectedLang] = useState<string>('')

  // ── Recording ──
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // ── Transcript ──
  const [showTranscript, setShowTranscript] = useState(false)
  const [fullTranscript, setFullTranscript] = useState('')
  const [transcriptLang, setTranscriptLang] = useState<LangKey>('ENGLISH')
  const [translatingTranscript, setTranslatingTranscript] = useState(false)
  const [originalTranscript, setOriginalTranscript] = useState('')
  const [labeledLines, setLabeledLines] = useState<LabeledLine[]>([])
  const [labelingInProgress, setLabelingInProgress] = useState(false)
  const [originalLabeledLines, setOriginalLabeledLines] = useState<LabeledLine[]>([])

  // ── AI ──
  const [aiQuestions, setAiQuestions] = useState<string[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [manualQuestion, setManualQuestion] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // ── Report ──
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<'entities' | 'data'>('entities')
  const [sessionTab, setSessionTab] = useState<'chat' | 'schedule' | 'report'>('chat')
  const [reportExpanded, setReportExpanded] = useState(false)
  const [reportEditMode, setReportEditMode] = useState<'view' | 'edit'>('view')
  const [reportHtmlDraft, setReportHtmlDraft] = useState('')
  const [savingReport, setSavingReport] = useState(false)

  // ── Summary ──
  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState<any>(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)

  // ── PDF lang ── 
  const [showPdfLangPicker, setShowPdfLangPicker] = useState(false)
  const [pdfLangPickerFor, setPdfLangPickerFor] = useState<'download' | 'export' | 'whatsapp'>('download')
  const [translatingReport, setTranslatingReport] = useState(false)

  // ── Appointments & Meds ──
  const [appointments, setAppointments] = useState<any[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [finReminders, setFinReminders] = useState<any[]>([])

  // ── Refs ──
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const utterancesRef = useRef<Utterance[]>([])

  useEffect(() => { utterancesRef.current = utterances }, [utterances])

  const { data: sessionData } = useSessionPolling(sessionId, 5000)

  // ── Effects ──
  useEffect(() => { loadSession() }, [])

  useEffect(() => {
    if (sessionData) {
      if (sessionData.extractedData) setExtractedData(sessionData.extractedData)
      if (sessionData.nerEntities) setNerEntities(sessionData.nerEntities)
      if (sessionData.finalReport) setReport(sessionData.finalReport)
    }
  }, [sessionData])

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [utterances])

  // ── Loaders ──
  const loadSession = async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`)
      const data = await res.json()
      
      // Redirect if this is a MULTI session
      if (data.sessionMode === 'MULTI') {
        router.replace(`/session/${data.id}`)
        return
      }
      
      setSession(data)
      if (data.interactions?.length > 0) {
        setUtterances(data.interactions.map((i: any) => ({
          id: i.id,
          text: i.text,
          detectedLanguage: i.translated || 'ENGLISH',
          timestamp: new Date(i.timestamp),
        })))
      }
      setExtractedData(data.extractedData || {})
      setNerEntities(data.nerEntities || {})
      setReport(data.finalReport || '')
      if (!data.interactions || data.interactions.length === 0) {
        generateAIQuestions('', data.domain, data.department)
      }
    } catch (err) { console.error('Failed to load session:', err) }

    try {
      const r = await fetch(`/api/twilio/appointments?sessionId=${sessionId}`)
      if (r.ok) { const d = await r.json(); setAppointments(d.appointments || []) }
    } catch {}

    try {
      const r = await fetch(`/api/medications/${sessionId}`)
      if (r.ok) { const d = await r.json(); setMedications(d.medications || []) }
    } catch {}
  }

  // ── Recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await processAudio(blob)
      }
      recorder.start()
      setIsRecording(true)
    } catch { alert('Microphone access denied') }
  }

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stop()
      setIsRecording(false)
      recorderRef.current.stream.getTracks().forEach(t => t.stop())
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    try {
      const fd = new FormData()
      fd.append('audio', audioBlob)
      if (selectedLanguage !== 'AUTO') fd.append('language', selectedLanguage)

      const tRes = await fetch('/api/voice/transcribe-detect', { method: 'POST', body: fd })
      if (!tRes.ok) throw new Error('Transcription failed')
      const { transcript, detectedLanguage, languageCode } = await tRes.json()

      if (!transcript?.trim()) { setIsProcessing(false); return }

      setDetectedLang(detectedLanguage)

      const newUtterance: Utterance = {
        id: Date.now().toString(),
        text: transcript,
        detectedLanguage,
        timestamp: new Date(),
      }
      setUtterances(prev => [...prev, newUtterance])

      // Persist
      await fetch(`/api/session/${sessionId}/add-message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker: 'doctor', text: transcript, translated: detectedLanguage })
      })

      // NER extraction
      const allText = [...utterancesRef.current, newUtterance].map(u => u.text).join('\n')
      
      // If not English, translate to English first for NER
      let englishText = allText
      if (detectedLanguage !== 'ENGLISH') {
        try {
          const trRes = await fetch('/api/voice/translate-all', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: allText, sourceLang: languageCode })
          })
          if (trRes.ok) {
            const { translations } = await trRes.json()
            englishText = translations.ENGLISH || allText
          }
        } catch {}
      }

      const nerRes = await fetch('/api/ai/extract-entities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: englishText, useHuggingFace: session?.domain === 'HEALTHCARE', domain: session?.domain })
      })
      if (nerRes.ok) {
        const { entities } = await nerRes.json()
        setNerEntities(entities)
        await fetch(`/api/session/${sessionId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nerEntities: entities })
        })
      }

      // Extract data
      const extRes = await fetch('/api/ai/extract-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: englishText, domain: session?.domain, department: session?.department, schema: session?.config?.schema })
      })
      if (extRes.ok) {
        const { extractedData: newData } = await extRes.json()
        setExtractedData(newData)
        await fetch(`/api/session/${sessionId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extractedData: newData })
        })
      }

      generateAIQuestions(englishText, session?.domain, session?.department)
    } catch (err) { console.error(err); alert('Failed to process audio') }
    finally { setIsProcessing(false) }
  }

  // ── AI Questions ──
  const generateAIQuestions = async (context: string, domain: string, department: string) => {
    setLoadingQuestions(true)
    try {
      const res = await fetch('/api/ai/suggest-questions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, messages: utterancesRef.current.map(u => ({ speaker: 'doctor', text: u.text })), domain, department, extractedData, nerEntities })
      })
      if (res.ok) { const { questions } = await res.json(); setAiQuestions(questions || []) }
    } catch {}
    finally { setLoadingQuestions(false) }
  }

  const sendManualQuestion = async () => {
    if (!manualQuestion.trim()) return
    setSendingMessage(true)
    const newU: Utterance = { id: Date.now().toString(), text: manualQuestion.trim(), detectedLanguage: 'ENGLISH', timestamp: new Date() }
    setUtterances(prev => [...prev, newU])
    await fetch(`/api/session/${sessionId}/add-message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speaker: 'doctor', text: manualQuestion.trim(), translated: 'ENGLISH' })
    })
    setManualQuestion('')
    setSendingMessage(false)
  }

  const selectAIQuestion = async (q: string) => {
    const newU: Utterance = { id: Date.now().toString(), text: q, detectedLanguage: 'ENGLISH', timestamp: new Date() }
    setUtterances(prev => [...prev, newU])
    await fetch(`/api/session/${sessionId}/add-message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speaker: 'doctor', text: q, translated: 'ENGLISH' })
    })
    setAiQuestions([])
  }

  // ── Transcript ──
  const openTranscript = async () => {
    const sentences = utterances.map(u => u.text).filter(t => t.trim())
    const text = sentences.join('\n\n')
    setFullTranscript(text)
    setOriginalTranscript(text)
    setTranscriptLang('ENGLISH')
    setShowTranscript(true)
    setLabelingInProgress(true)

    // Call Groq to label each sentence as doctor or patient
    try {
      const res = await fetch('/api/ai/label-speakers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences, domain: session?.domain, department: session?.department })
      })
      if (res.ok) {
        const { labels } = await res.json()
        const labeled: LabeledLine[] = sentences.map((s: string, i: number) => ({
          text: s,
          speaker: (labels[i] || (i % 2 === 0 ? 'doctor' : 'patient')) as SpeakerLabel,
        }))
        setLabeledLines(labeled)
        setOriginalLabeledLines(labeled)
      } else {
        // Fallback: alternate doctor/patient
        const fallback: LabeledLine[] = sentences.map((s: string, i: number) => ({
          text: s,
          speaker: (i % 2 === 0 ? 'doctor' : 'patient') as SpeakerLabel,
        }))
        setLabeledLines(fallback)
        setOriginalLabeledLines(fallback)
      }
    } catch {
      const fallback: LabeledLine[] = sentences.map((s: string, i: number) => ({
        text: s,
        speaker: (i % 2 === 0 ? 'doctor' : 'patient') as SpeakerLabel,
      }))
      setLabeledLines(fallback)
      setOriginalLabeledLines(fallback)
    } finally {
      setLabelingInProgress(false)
    }
  }

  const translateTranscript = async (lang: LangKey) => {
    if (lang === transcriptLang) return
    setTranslatingTranscript(true)
    try {
      if (lang === 'ENGLISH') {
        setFullTranscript(originalTranscript)
        setLabeledLines(originalLabeledLines)
      } else {
        // Translate each sentence INDIVIDUALLY to preserve 1:1 mapping with speaker labels
        const translatedLines = await Promise.all(
          originalLabeledLines.map(async (line) => {
            try {
              const res = await fetch('/api/voice/translate-all', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: line.text, sourceLang: 'en-IN' })
              })
              if (res.ok) {
                const { translations } = await res.json()
                return translations[lang] || line.text
              }
              return line.text
            } catch { return line.text }
          })
        )
        const newLabeled: LabeledLine[] = originalLabeledLines.map((ol, i) => ({
          text: translatedLines[i],
          speaker: ol.speaker,
        }))
        setLabeledLines(newLabeled)
        setFullTranscript(translatedLines.join('\n\n'))
      }
      setTranscriptLang(lang)
    } catch {}
    finally { setTranslatingTranscript(false) }
  }

  const saveTranscript = async () => {
    // Build labeled transcript text for saving
    const labeledText = labeledLines.map(l => `[${l.speaker === 'doctor' ? 'Doctor' : 'Patient'}]: ${l.text}`).join('\n\n')
    await fetch(`/api/session/${sessionId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: labeledText })
    })
    alert('Transcript saved!')
  }

  // ── Report ──
  const generateReport = async () => {
    setGenerating(true)
    try {
      const text = utterances.map(u => u.text).join('\n')
      // Translate to English for report if needed
      let englishText = text
      if (detectedLang && detectedLang !== 'ENGLISH') {
        const trRes = await fetch('/api/voice/translate-all', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, sourceLang: LANG_CODES[detectedLang as LangKey] || 'en-IN' })
        })
        if (trRes.ok) {
          const { translations } = await trRes.json()
          englishText = translations.ENGLISH || text
        }
      }
      const res = await fetch('/api/ai/generate-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: englishText, extractedData, nerEntities, domain: session.domain, department: session.department, template: session.config?.template, personName: session.person.name })
      })
      const { report: generated } = await res.json()
      await fetch(`/api/session/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ finalReport: generated }) })
      setReport(generated)
      setReportExpanded(true)
    } catch (err) { console.error(err) }
    finally { setGenerating(false) }
  }

  const approveReport = async () => {
    await fetch(`/api/session/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approved: true, approvedAt: new Date(), status: 'COMPLETED' }) })
    loadSession()
  }

  const getTranslatedReportHtml = async (lang: LangKey): Promise<string> => {
    if (lang === 'ENGLISH') return report
    setTranslatingReport(true)
    try {
      const res = await fetch('/api/ai/translate-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html: report, targetLang: lang }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Translation failed')
      return data.translatedHtml || report
    } catch { return report }
    finally { setTranslatingReport(false) }
  }

  const downloadReport = async (lang: LangKey = 'ENGLISH') => {
    if (!report) return
    setDownloading(true)
    try {
      const htmlToUse = await getTranslatedReportHtml(lang)
      const el = document.getElementById('report-content')
      const orig = el?.innerHTML || ''
      if (lang !== 'ENGLISH' && el) { el.innerHTML = htmlToUse; await new Promise(r => setTimeout(r, 100)) }
      const pdfBlob = await generatePDFClient('report-content')
      if (lang !== 'ENGLISH' && el) el.innerHTML = orig
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a'); a.href = url
      a.download = `${(session?.person?.name || 'report').replace(/\s+/g, '_').toLowerCase()}_single_${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (err) { console.error(err) }
    finally { setDownloading(false) }
  }

  const openReportEdit = () => { setReportHtmlDraft(report); setReportEditMode('edit'); setReportExpanded(true) }
  const cancelReportEdit = () => { setReportEditMode('view'); setReportHtmlDraft('') }
  const saveReportEdit = async () => {
    setSavingReport(true)
    try {
      setReport(reportHtmlDraft)
      await fetch(`/api/session/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ finalReport: reportHtmlDraft }) })
      setReportEditMode('view')
    } catch {}
    finally { setSavingReport(false) }
  }

  const generateSummary = async () => {
    setGeneratingSummary(true); setShowSummary(true)
    try {
      const text = utterances.map(u => u.text).join('\n')
      const res = await fetch('/api/ai/generate-summary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, extractedData, nerEntities, domain: session.domain, department: session.department, personName: session.person.name, transcript: text })
      })
      if (res.ok) { const { summary: s } = await res.json(); setSummary(s) }
    } catch {}
    finally { setGeneratingSummary(false) }
  }

  // ── Loading ──
  if (!session) return (
    <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#666] font-mono text-sm">Loading session...</p>
      </div>
    </div>
  )

  const entityCount = Object.values(nerEntities).flat().length

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .session-root { background:#0A0A0A; min-height:100vh; font-family:'DM Sans',sans-serif; }
        .mono { font-family:'IBM Plex Mono',monospace; }
        .dark-card { background:#111111; border:1px solid #1E1E1E; border-radius:12px; }
        .dark-card-elevated { background:#141414; border:1px solid #242424; border-radius:12px; }
        .single-pulse { animation:single-ring 1.5s ease-out infinite; }
        @keyframes single-ring { 0%{box-shadow:0 0 0 0 rgba(0,212,255,.4);} 70%{box-shadow:0 0 0 24px rgba(0,212,255,0);} 100%{box-shadow:0 0 0 0 rgba(0,212,255,0);} }
        ::-webkit-scrollbar{width:4px;height:4px;} ::-webkit-scrollbar-track{background:#111;} ::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
        .entity-badge { font-size:11px;padding:2px 8px;border-radius:4px;font-family:'IBM Plex Mono',monospace;border:1px solid #2A2A2A;background:transparent; }
        .ai-q-card { background:#0F0F1A;border:1px solid #2A2A40;border-radius:8px;cursor:pointer;transition:all .15s ease;padding:10px 14px;text-align:left;width:100%; }
        .ai-q-card:hover { background:#151525;border-color:#6366f1;transform:translateY(-1px); }
        .lang-btn { font-family:'IBM Plex Mono',monospace;font-size:10px;padding:2px 6px;border-radius:4px;border:1px solid #2A2A2A;background:transparent;color:#666;cursor:pointer;transition:all .1s; }
        .lang-btn:hover { background:#1A1A1A;color:#CCC; }
        .lang-btn.active { background:#001A24;border-color:#00D4FF;color:#00D4FF; }
        .lang-btn.active-auto { background:#1A0F00;border-color:#F59E0B;color:#F59E0B; }
        .dark-input { background:#0D0D0D;border:1px solid #2A2A2A;border-radius:8px;color:#E8E8E8;padding:8px 12px;font-size:13px;width:100%;outline:none;transition:border-color .15s; }
        .dark-input:focus { border-color:#00D4FF44; } .dark-input::placeholder { color:#444; }
        .btn-icon { display:flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;transition:all .15s;border:1px solid #2A2A2A;background:#141414;color:#888; }
        .btn-icon:hover { background:#1A1A1A;color:#CCC; }
        .mic-single { background:linear-gradient(135deg,#001824,#002535);border:2px solid #00D4FF44;color:#00D4FF; }
        .mic-single:hover { border-color:#00D4FF88;box-shadow:0 0 20px #00D4FF22; }
        .recording-active { border-color:#ef4444 !important;background:linear-gradient(135deg,#1A0505,#200A0A) !important; }
        .status-active { color:#00F5A0;background:#001A0F;border:1px solid #00F5A022; }
        .status-completed { color:#00D4FF;background:#001824;border:1px solid #00D4FF22; }
        .section-label { font-size:10px;font-family:'IBM Plex Mono',monospace;letter-spacing:.15em;text-transform:uppercase;margin-bottom:6px; }
        .fade-in { animation:fadeIn .2s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;} }
        main { background:#0A0A0A !important; }
        .tab-bar { display:flex;gap:2px;padding:3px;background:#0D0D0D;border:1px solid #1E1E1E;border-radius:12px;margin:0 16px 12px; }
        .tab-btn { display:flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;border:none;background:transparent;color:#555;font-size:13px;font-family:'DM Sans',sans-serif;font-weight:500;cursor:pointer;transition:all .2s;flex:1;justify-content:center; }
        .tab-btn:hover { color:#AAA;background:#111; }
        .tab-btn.tab-active { background:#141414;color:#E8E8E8;border:1px solid #242424;box-shadow:0 2px 8px rgba(0,0,0,.3); }
        .tab-icon { opacity:.4;transition:opacity .2s; }
        .tab-btn.tab-active .tab-icon { opacity:1; }
        .tab-badge { font-size:10px;padding:1px 6px;border-radius:10px;font-family:'IBM Plex Mono',monospace;margin-left:2px; }
        .utterance-bubble { background:linear-gradient(135deg,#0D1520 0%,#0A1218 100%); border:1px solid #00D4FF18; border-left:2px solid #00D4FF; border-radius:8px; padding:10px 14px; }
        @keyframes spin { to { transform:rotate(360deg) } }
        [contenteditable] h2 { font-size:14px;font-weight:700;color:#E8E8E8;margin:12px 0 6px;border-left:3px solid #00D4FF;padding-left:10px; }
        [contenteditable] h3 { font-size:13px;font-weight:700;color:#CCC;margin:10px 0 5px; }
        [contenteditable] p { margin:0 0 6px;color:#BBB; }
        [contenteditable] ul { padding-left:20px;margin:4px 0 8px;color:#BBB; }
        [contenteditable] li { margin-bottom:3px; }
        [contenteditable] strong { color:#E8E8E8;font-weight:700; }
        [contenteditable]:focus { outline:none; }
      `}</style>

      <div className="session-root pb-8">
        <audio ref={audioRef} className="hidden" />

        {/* ── HEADER ── */}
        <div className="dark-card mx-4 mt-4 mb-4 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00D4FF]" />
              <span className="font-semibold text-[#E8E8E8] text-sm">{session.person.name || 'Unknown'}</span>
            </div>
            <span className="text-[#333]">|</span>
            <span className="mono text-xs text-[#555]">{session.department.replace(/_/g, ' ')}</span>
            <span className="text-[#333]">|</span>
            <span className={`mono text-xs px-2 py-0.5 rounded-full ${session.status === 'COMPLETED' ? 'status-completed' : 'status-active'}`}>
              ● {session.status}
            </span>
            <span className="text-[#333]">|</span>
            <span className="mono text-xs px-2 py-0.5 rounded-full bg-[#1A1200] border border-[#F59E0B22] text-[#F59E0B]">
              SINGLE LANG
            </span>
            {detectedLang && (
              <>
                <span className="text-[#333]">|</span>
                <span className="mono text-xs px-2 py-0.5 rounded-full bg-[#0A1A14] border border-[#34D39922] text-[#34D399]">
                  🌐 {detectedLang}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={generateSummary} disabled={generatingSummary || utterances.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#0A1A14,#051A10)', border: '1px solid #34D39944', color: '#34D399', fontFamily: 'IBM Plex Mono,monospace' }}>
              {generatingSummary ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
              {generatingSummary ? 'generating...' : 'Smart Summary'}
            </button>
            <span className="mono text-[#333] text-xs">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* ── TAB BAR ── */}
        <div className="tab-bar">
          {[
            { id: 'chat' as const, icon: MessageCircle, label: 'Chat', badge: utterances.length > 0 ? utterances.length : null, color: '#00D4FF' },
            { id: 'schedule' as const, icon: Calendar, label: session.domain === 'HEALTHCARE' ? 'Schedule & Meds' : 'Schedule & Invest', badge: null, color: '#A78BFA' },
            { id: 'report' as const, icon: FileText, label: 'Report', badge: report ? '✓' : null, color: '#F59E0B' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setSessionTab(tab.id)}
              className={`tab-btn ${sessionTab === tab.id ? 'tab-active' : ''}`}>
              <tab.icon className="tab-icon" style={{ width: 16, height: 16, color: sessionTab === tab.id ? tab.color : undefined }} />
              {tab.label}
              {tab.badge && (
                <span className="tab-badge" style={{ background: sessionTab === tab.id ? `${tab.color}22` : '#1A1A1A', color: sessionTab === tab.id ? tab.color : '#555', border: `1px solid ${sessionTab === tab.id ? `${tab.color}44` : '#2A2A2A'}` }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── CHAT TAB ── */}
        {sessionTab === 'chat' && (
          <div className="px-4 grid grid-cols-12 gap-3">

            {/* LEFT: RECORDING + AI */}
            <div className="col-span-3 space-y-3">
              <div className="dark-card-elevated p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#00D4FF]" />
                    <span className="text-[#E8E8E8] text-sm font-medium">Recording</span>
                  </div>
                </div>

                {/* Language selector */}
                <div className="mb-4">
                  <p className="section-label text-[#555]">Language</p>
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => setSelectedLanguage('AUTO')}
                      className={`lang-btn ${selectedLanguage === 'AUTO' ? 'active-auto' : ''}`}>
                      🔍 Auto
                    </button>
                    {(['ENGLISH', 'HINDI', 'KANNADA'] as LangKey[]).map(l => (
                      <button key={l} onClick={() => setSelectedLanguage(l)}
                        className={`lang-btn ${selectedLanguage === l ? 'active' : ''}`}>
                        {LANG_LABELS[l]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mic button */}
                <div className="flex justify-center mb-4">
                  <button
                    onClick={() => isRecording ? stopRecording() : startRecording()}
                    disabled={isProcessing}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${isRecording ? 'recording-active single-pulse' : isProcessing ? 'opacity-50 cursor-not-allowed mic-single' : 'mic-single'}`}>
                    {isProcessing ? <Loader2 className="w-7 h-7 text-[#00D4FF] animate-spin" /> : isRecording ? <MicOff className="w-7 h-7 text-[#ef4444]" /> : <Mic className="w-7 h-7" />}
                  </button>
                </div>
                <p className="text-center text-xs mono text-[#444] mb-4">
                  {isRecording ? '● REC – click to stop' : isProcessing ? 'processing...' : 'click to speak'}
                </p>

                {/* Manual input */}
                <div className="flex gap-2">
                  <input className="dark-input text-xs" placeholder="Type a note…" value={manualQuestion}
                    onChange={e => setManualQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendManualQuestion()} />
                  <button onClick={sendManualQuestion} disabled={!manualQuestion.trim() || sendingMessage}
                    className="btn-icon w-9 h-9 flex-shrink-0 disabled:opacity-40">
                    {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* AI Suggestions */}
              <div className="dark-card-elevated p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
                    <span className="text-xs font-medium text-[#A78BFA]">AI Suggestions</span>
                    {aiQuestions.length > 0 && <span className="mono text-xs text-[#555]">({aiQuestions.length})</span>}
                  </div>
                  {loadingQuestions && <Loader2 className="w-3 h-3 animate-spin text-[#555]" />}
                </div>
                <div className="space-y-2">
                  {aiQuestions.length === 0 && !loadingQuestions && (
                    <p className="text-xs text-[#333] mono text-center py-3">Suggestions appear after speech</p>
                  )}
                  {aiQuestions.map((q, i) => (
                    <button key={i} onClick={() => selectAIQuestion(q)} className="ai-q-card fade-in group">
                      <div className="flex items-start gap-2">
                        <span className="mono text-xs text-[#A78BFA] opacity-60 flex-shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                        <span className="text-xs text-[#AAA] group-hover:text-[#E8E8E8] transition-colors leading-relaxed whitespace-normal break-words text-left">{q}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER: CONVERSATION */}
            <div className="col-span-6">
              <div className="dark-card-elevated h-full flex flex-col" style={{ minHeight: 520 }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1A1A]">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[#555]" />
                    <span className="text-sm text-[#888]">Conversation</span>
                    <span className="mono text-xs text-[#333]">({utterances.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {utterances.length > 0 && (
                      <button onClick={openTranscript}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs mono font-medium transition-all"
                        style={{ background: '#0F0A1A', border: '1px solid #A78BFA44', color: '#A78BFA' }}>
                        <Languages className="w-3 h-3" /> View Full Transcript
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#333]" />
                      <span className="mono text-xs text-[#333]">live</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-pulse ml-1" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: 'calc(100vh - 260px)', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
                  {utterances.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-3">
                      <Mic className="w-8 h-8 text-[#222]" />
                      <p className="text-xs mono text-[#333] text-center">No recordings yet<br />Click the mic to begin</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ flex: 1 }} />
                      {utterances.map((u, i) => (
                        <div key={u.id} className="fade-in">
                          <div className="utterance-bubble">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="mono text-[10px] font-semibold text-[#00D4FF]">#{i + 1}</span>
                                <span className="mono text-[10px] px-1.5 py-0.5 rounded bg-[#0A1A14] border border-[#34D39922] text-[#34D399]">
                                  {u.detectedLanguage}
                                </span>
                              </div>
                              <span className="mono text-[10px] text-[#333]">
                                {u.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-[#CCC] leading-relaxed">{u.text}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={scrollRef} />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: LIVE EXTRACTION */}
            <div className="col-span-3 space-y-3">
              <div className="dark-card-elevated p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span className="text-xs font-medium text-[#F59E0B]">Live Extraction</span>
                  </div>
                  {entityCount > 0 && <span className="mono text-xs text-[#555]">{entityCount} entities</span>}
                </div>
                <div className="flex gap-1 mb-3 bg-[#0D0D0D] p-1 rounded-lg">
                  {(['entities', 'data'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`flex-1 text-xs mono py-1 rounded transition-all ${activeTab === tab ? 'bg-[#1A1A1A] text-[#E8E8E8]' : 'text-[#444] hover:text-[#666]'}`}>
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="h-72 overflow-y-auto">
                  {activeTab === 'entities' ? (
                    <div className="space-y-2">
                      {Object.entries(nerEntities).map(([key, vals]: [string, any]) =>
                        vals?.length > 0 ? (
                          <div key={key}>
                            <p className="section-label" style={{ color: ENTITY_COLORS[key] || '#555' }}>{key}</p>
                            <div className="flex flex-wrap gap-1">
                              {vals.map((v: string, i: number) => (
                                <span key={i} className="entity-badge"
                                  style={{ color: ENTITY_COLORS[key] || '#A0A0A0', borderColor: ENTITY_COLORS[key] ? `${ENTITY_COLORS[key]}44` : '#2A2A2A', backgroundColor: ENTITY_COLORS[key] ? `${ENTITY_COLORS[key]}11` : 'transparent' }}>
                                  {v}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null
                      )}
                      {Object.values(nerEntities).every((v: any) => !v?.length) && (
                        <p className="text-xs mono text-[#333] text-center pt-4">awaiting input</p>
                      )}
                    </div>
                  ) : (
                    <pre className="mono text-[11px] text-[#555] whitespace-pre-wrap">{JSON.stringify(extractedData, null, 2) || 'No data yet'}</pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── REPORT TAB ── */}
        {sessionTab === 'report' && (
          <div className="px-4 mt-3">
            <div className="dark-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-[#555]" />
                  <span className="text-sm text-[#888]">Generated Report</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={generateReport} disabled={generating || utterances.length === 0}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium transition-all ${utterances.length === 0 ? 'bg-[#111] text-[#333] cursor-not-allowed' : 'bg-[#001824] border border-[#00D4FF44] text-[#00D4FF] hover:border-[#00D4FF88]'}`}>
                    {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {generating ? 'generating...' : 'Generate'}
                  </button>
                  {report && reportEditMode === 'view' && (
                    <button onClick={openReportEdit}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium bg-[#0F0A1A] border border-[#A78BFA44] text-[#A78BFA] hover:border-[#A78BFA88] transition-all">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {report && !session.approved && reportEditMode === 'view' && (
                    <button onClick={approveReport}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium bg-[#0A1D0F] border border-[#00F5A044] text-[#00F5A0] hover:border-[#00F5A088] transition-all">
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                  {report && reportEditMode === 'view' && (
                    <button onClick={() => downloadReport('ENGLISH')} disabled={downloading}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium bg-[#0F0A1A] border border-[#A78BFA44] text-[#A78BFA] hover:border-[#A78BFA88] transition-all disabled:opacity-50">
                      {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      {downloading ? 'saving...' : 'Download'}
                    </button>
                  )}
                </div>
              </div>

              {report ? (
                reportEditMode === 'edit' ? (
                  <div style={{ border: '1px solid #242424', borderRadius: 10, overflow: 'hidden', background: '#0A0A0A' }}>
                    <div contentEditable suppressContentEditableWarning
                      dangerouslySetInnerHTML={{ __html: reportHtmlDraft }}
                      onInput={e => setReportHtmlDraft((e.currentTarget as HTMLDivElement).innerHTML)}
                      style={{ minHeight: 320, maxHeight: 520, overflowY: 'auto', padding: '20px 24px', color: '#CCC', fontSize: 13, lineHeight: 1.75, fontFamily: 'Georgia, serif', outline: 'none', background: '#0A0A0A' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '10px 14px', background: '#0D0D0D', borderTop: '1px solid #1A1A1A', gap: 8 }}>
                      <button onClick={cancelReportEdit} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #2A2A2A', background: 'transparent', color: '#666', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                      <button onClick={saveReportEdit} disabled={savingReport}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 7, border: '1px solid #00F5A044', background: '#0A1D0F', color: '#00F5A0', fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: savingReport ? 0.5 : 1 }}>
                        {savingReport ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <CheckCheck style={{ width: 12, height: 12 }} />}
                        {savingReport ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div id="report-content" className="prose prose-invert p-5" style={{ background: '#0A0A0A', borderRadius: 10, border: '1px solid #1A1A1A', fontSize: 13, lineHeight: 1.75, color: '#CCC', fontFamily: 'Georgia, serif' }}
                    dangerouslySetInnerHTML={{ __html: report }} />
                )
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-8 h-8 text-[#222] mx-auto mb-3" />
                  <p className="text-xs mono text-[#333]">No report generated yet<br />Record conversation and click Generate</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SCHEDULE TAB placeholder ── */}
        {sessionTab === 'schedule' && (
          <div className="px-4 mt-3">
            <div className="dark-card p-8 text-center">
              <Calendar className="w-8 h-8 text-[#222] mx-auto mb-3" />
              <p className="text-sm text-[#555]">Schedule & Medications</p>
              <p className="text-xs mono text-[#333] mt-2">Same functionality as multi-language session.<br/>Use multi-language session for full scheduling features.</p>
            </div>
          </div>
        )}

        {/* ── TRANSCRIPT MODAL ── */}
        {showTranscript && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(12px)' }}
            onClick={() => setShowTranscript(false)}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 750, maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: '#0D0D0D', border: '1px solid #242424', borderRadius: 16, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="flex items-center gap-3">
                  <Languages className="w-5 h-5 text-[#A78BFA]" />
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#E8E8E8' }}>Full Transcript</span>
                  <span className="mono text-xs text-[#555]">{utterances.length} segments</span>
                  {labelingInProgress && (
                    <span className="flex items-center gap-1.5 mono text-xs px-2 py-0.5 rounded-full" style={{ background: '#1A0F00', border: '1px solid #F59E0B33', color: '#F59E0B' }}>
                      <Loader2 style={{ width: 10, height: 10, animation: 'spin 1s linear infinite' }} />
                      labeling speakers…
                    </span>
                  )}
                  {!labelingInProgress && labeledLines.length > 0 && (
                    <span className="flex items-center gap-1.5 mono text-xs px-2 py-0.5 rounded-full" style={{ background: '#0A1D0F', border: '1px solid #00F5A033', color: '#00F5A0' }}>
                      ✓ speakers labeled
                    </span>
                  )}
                </div>
                <button onClick={() => setShowTranscript(false)} className="btn-icon w-7 h-7"><X className="w-4 h-4" /></button>
              </div>

              {/* Language selector */}
              <div style={{ padding: '12px 24px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono text-xs text-[#555]">Translate to:</span>
                {(['ENGLISH', 'HINDI', 'KANNADA'] as LangKey[]).map(l => (
                  <button key={l} onClick={() => translateTranscript(l)} disabled={translatingTranscript}
                    className={`lang-btn ${transcriptLang === l ? 'active' : ''}`}
                    style={{ padding: '4px 12px', fontSize: 11 }}>
                    {LANG_LABELS[l]} {l.charAt(0) + l.slice(1).toLowerCase()}
                  </button>
                ))}
                {translatingTranscript && <Loader2 className="w-3 h-3 animate-spin text-[#00D4FF]" />}
              </div>

              {/* Content — labeled transcript */}
              <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
                {labeledLines.length > 0 ? (
                  <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 10, padding: '16px 20px', minHeight: 300 }}>
                    {labeledLines.map((line, i) => {
                      const isDoctor = line.speaker === 'doctor'
                      return (
                        <div key={i} style={{
                          marginBottom: 16,
                          paddingLeft: 14,
                          borderLeft: `2px solid ${isDoctor ? '#00D4FF' : '#F59E0B'}`,
                          animation: 'fadeIn .2s ease',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                              fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
                              padding: '2px 8px', borderRadius: 4,
                              background: isDoctor ? '#001824' : '#1A1200',
                              border: `1px solid ${isDoctor ? '#00D4FF33' : '#F59E0B33'}`,
                              color: isDoctor ? '#00D4FF' : '#F59E0B',
                            }}>
                              {isDoctor ? <Stethoscope style={{ width: 10, height: 10 }} /> : <User style={{ width: 10, height: 10 }} />}
                              {isDoctor ? 'Doctor' : 'Patient'}
                            </span>
                          </div>
                          <p
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={e => {
                              const newText = (e.currentTarget as HTMLParagraphElement).textContent || ''
                              setLabeledLines(prev => prev.map((l, idx) => idx === i ? { ...l, text: newText } : l))
                            }}
                            style={{
                              color: '#CCC', fontSize: 13, lineHeight: 1.8,
                              fontFamily: "'DM Sans', sans-serif",
                              outline: 'none', margin: 0,
                              cursor: 'text',
                            }}
                          >
                            {line.text}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <textarea
                    value={fullTranscript}
                    onChange={e => setFullTranscript(e.target.value)}
                    style={{
                      width: '100%', minHeight: 300, background: '#0A0A0A', border: '1px solid #1E1E1E',
                      borderRadius: 10, color: '#CCC', fontSize: 13, lineHeight: 1.8,
                      fontFamily: "'DM Sans', sans-serif", padding: '16px 20px', outline: 'none', resize: 'vertical',
                    }}
                    placeholder="Transcript will appear here..."
                  />
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="mono text-xs text-[#333]">✎ Edit freely — changes are preserved</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowTranscript(false)}
                    style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #2A2A2A', background: 'transparent', color: '#666', fontSize: 12, cursor: 'pointer' }}>
                    Close
                  </button>
                  <button onClick={saveTranscript}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 8, border: '1px solid #00D4FF44', background: '#001824', color: '#00D4FF', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                    <CheckCheck style={{ width: 12, height: 12 }} />
                    Save Transcript
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SUMMARY MODAL ── */}
        {showSummary && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowSummary(false)}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, maxHeight: '80vh', background: '#0D0D0D', border: '1px solid #242424', borderRadius: 16, overflow: 'auto', padding: 24 }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#34D399]" />
                  <span style={{ fontWeight: 700, color: '#E8E8E8' }}>Smart Summary</span>
                </div>
                <button onClick={() => setShowSummary(false)} className="btn-icon w-7 h-7"><X className="w-4 h-4" /></button>
              </div>
              {generatingSummary ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#34D399]" />
                  <p className="mono text-xs text-[#555]">Analyzing conversation...</p>
                </div>
              ) : summary ? (
                <div className="prose prose-invert text-sm" style={{ color: '#BBB', lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: typeof summary === 'string' ? summary : JSON.stringify(summary, null, 2) }} />
              ) : (
                <p className="text-center text-sm text-[#555] py-8">No summary generated</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
