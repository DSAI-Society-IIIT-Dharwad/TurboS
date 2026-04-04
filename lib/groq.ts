// lib/groq.ts

import Groq from 'groq-sdk'

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export const MODELS = {
  // Fast inference
  FAST: 'llama-3.1-8b-instant',
  
  // Smart/accurate (choose one that works)
  SMART: 'llama-3.3-70b-versatile', // Try this first
  // SMART: 'mixtral-8x7b-32768',    // Fallback
  
  // Specialized
  MIXTRAL: 'mixtral-8x7b-32768',
  SMALL: 'gemma2-9b-it'
}