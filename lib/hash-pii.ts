// lib/hash-pii.ts — PII anonymization utilities for reports

import crypto from 'crypto'

/**
 * Hash a name: "John Doe" → "J***e (ID: a7c3f2)"
 */
export function hashName(name: string): string {
  if (!name || name.trim().length === 0) return 'Unknown'
  const trimmed = name.trim()
  const first = trimmed[0]
  const last = trimmed[trimmed.length - 1]
  const hash = crypto.createHash('sha256').update(trimmed.toLowerCase()).digest('hex').slice(0, 6)
  return `${first}***${last} (ID: ${hash})`
}

/**
 * Hash a phone number: "9876543210" → "****3210"
 */
export function hashPhone(phone: string): string {
  if (!phone || phone.trim().length === 0) return '****'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '****'
  const last4 = digits.slice(-4)
  return `****${last4}`
}

/**
 * Hash an email: "john.doe@gmail.com" → "j***@***.com"
 */
export function hashEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***'
  const [local, domain] = email.split('@')
  const domainParts = domain.split('.')
  const ext = domainParts.pop() || 'com'
  return `${local[0]}***@***.${ext}`
}

/**
 * Replace all occurrences of PII in a text string with hashed versions.
 * Replaces: full name, first name, last name, phone, email.
 */
export function hashPII(
  text: string,
  personData: { name?: string | null; phone?: string | null; email?: string | null }
): string {
  if (!text) return text
  let result = text

  // Hash full name
  if (personData.name && personData.name.trim()) {
    const fullName = personData.name.trim()
    const hashedName = hashName(fullName)
    // Replace full name (case-insensitive)
    const nameRegex = new RegExp(escapeRegex(fullName), 'gi')
    result = result.replace(nameRegex, hashedName)

    // Also replace individual name parts (first name, last name)
    const nameParts = fullName.split(/\s+/).filter(p => p.length > 1)
    for (const part of nameParts) {
      const partRegex = new RegExp(`\\b${escapeRegex(part)}\\b`, 'gi')
      result = result.replace(partRegex, hashedName)
    }
  }

  // Hash phone
  if (personData.phone && personData.phone.trim()) {
    const phone = personData.phone.trim()
    const hashedPhone = hashPhone(phone)
    // Match the raw phone and common formatted variants
    const phoneEscaped = escapeRegex(phone)
    const phoneRegex = new RegExp(phoneEscaped, 'g')
    result = result.replace(phoneRegex, hashedPhone)

    // Also match with country code prefix
    const digits = phone.replace(/\D/g, '')
    if (digits.length >= 10) {
      const withPlus91 = `+91${digits.slice(-10)}`
      const withPlus91Regex = new RegExp(escapeRegex(withPlus91), 'g')
      result = result.replace(withPlus91Regex, hashedPhone)
      // Without plus
      const with91 = `91${digits.slice(-10)}`
      const with91Regex = new RegExp(escapeRegex(with91), 'g')
      result = result.replace(with91Regex, hashedPhone)
    }
  }

  // Hash email
  if (personData.email && personData.email.trim()) {
    const email = personData.email.trim()
    const hashedEmail = hashEmail(email)
    const emailRegex = new RegExp(escapeRegex(email), 'gi')
    result = result.replace(emailRegex, hashedEmail)
  }

  return result
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
