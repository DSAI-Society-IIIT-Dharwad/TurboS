<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-NeonDB-336791?style=for-the-badge&logo=postgresql" />
  <img src="https://img.shields.io/badge/AI-Groq%20%7C%20HuggingFace%20%7C%20Sarvam-FF6F00?style=for-the-badge&logo=openai" />
  <img src="https://img.shields.io/badge/Twilio-Voice%20%26%20WhatsApp-F22F46?style=for-the-badge&logo=twilio" />
</p>

<h1 align="center">MediFi — AI-Powered Multilingual Voice Intelligence Platform</h1>

<p align="center">
  <strong>A unified conversational intelligence system for Healthcare & Finance consultations</strong><br/>
  <em>Voice-first • Multilingual • AI-driven clinical/financial reports • Automated patient engagement</em>
</p>

<p align="center">
  <a href="#key-features">Features</a> •
  <a href="#novelty--what-makes-this-unique">Novelty</a> •
  <a href="#core-architecture">Architecture</a> •
  <a href="#ai-pipeline">AI Pipeline</a> •
  <a href="#database-schema">Schema</a> •
  <a href="#getting-started">Setup</a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Novelty & What Makes This Unique](#novelty--what-makes-this-unique)
- [Core Architecture](#core-architecture)
- [Component Diagram](#component-diagram)
- [AI Pipeline — Activity Diagram](#ai-pipeline--activity-diagram)
- [Session Lifecycle — Activity Diagram](#session-lifecycle--activity-diagram)
- [Voice Processing Flow](#voice-processing-flow)
- [Report Generation Pipeline](#report-generation-pipeline)
- [Automated Call Scheduling Flow](#automated-call-scheduling-flow)
- [Multi-Portal User Journey](#multi-portal-user-journey)
- [Database Schema](#database-schema)
- [Tech Stack](#tech-stack)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## Overview

**MediFi** is a production-grade, AI-powered conversational intelligence platform that serves **two distinct domains** — **Healthcare** and **Finance** — through a single unified interface. It transforms voice conversations between professionals (doctors/financial advisors) and clients (patients/customers) into structured, multilingual, AI-analyzed reports with automated follow-up systems.

The platform operates across **three portals** — Doctor/Advisor Dashboard, Patient/Client Portal, and Admin Panel — each tailored to its user role with domain-specific AI features.

---

## Key Features

### Voice-First Conversational Interface
- **Dual-mic recording** — Separate voice capture for Doctor and Patient channels
- **Real-time Speech-to-Text** using Sarvam AI's `saarika:v2.5` model
- **Live multilingual transcription** across 7 Indian languages
- **Text-to-Speech playback** via Sarvam AI's `bulbul:v2` — listen to any message in any language

### True Multilingual Architecture (7 Languages)
- **Comprehensive language support**: English, Hindi, Kannada, Marathi, Tamil, Telugu, and Malayalam
- **Simultaneous translation** — Every message is instantly translated into all 7 supported languages
- **Per-message language switching** — View/listen to each individual message in any language
- **Multilingual report translation** — Full clinical/financial reports translated to all languages with HTML structure preserved
- **Multilingual PDF export** — Download reports in any supported language
- **Smart Summary in 7 languages** — Patient-friendly summaries generated in all languages simultaneously

### Multi-Layer AI Intelligence

| Layer | Technology | What It Does |
|-------|-----------|--------------|
| **Speech-to-Text** | Sarvam AI `saarika:v2.5` | Transcribes voice in EN/HI/KN/MR/TA/TE/ML |
| **Translation** | Sarvam AI `mayura:v1` + Groq fallback | Cross-language translation with rate-limit resilience |
| **NER (Healthcare)** | HuggingFace `d4data/biomedical-ner-all` | Extracts symptoms, medications, diseases, procedures, body parts, severity, duration, frequency |
| **NER (Finance)** | Groq `llama-3.3-70b-versatile` | Extracts income, expenses, investments, taxes, loans, insurance, goals, amounts, timeframes, tax sections |
| **Structured Extraction** | Groq `llama-3.3-70b-versatile` | Chief complaint, vitals, HPI, medications, allergies (medical) / Financial goals, risk profile, liabilities (finance) |
| **Report Generation** | Groq `llama-3.3-70b-versatile` | Domain-specific clinical assessment or financial analysis with color-coded sections |
| **Smart Summary** | Groq `llama-3.3-70b-versatile` | Layperson-friendly multilingual summary with encouragement |
| **AI Question Suggestions** | Groq `llama-3.1-8b-instant` | Context-aware follow-up questions for doctors |
| **Negation Detection** | Custom NLP | Filters out negated entities ("no vomiting" → exclude vomiting) |

### Domain-Specific Report Generation

**Healthcare Reports include:**
- Patient Information table with vitals
- Chief Complaint & History of Present Illness
- Clinical Assessment with color-coded sections:
  - Differential Diagnosis (Blue)
  - Most Likely Diagnosis (Green)
  - Recommended Investigations (Yellow)
  - Treatment Plan (Pink)
  - Follow-up Recommendations (Purple)
  - Red Flags (Red)

**Finance Reports include:**
- Client Information with risk profile
- Executive Summary
- Financial Goals
- Outstanding Liabilities table
- Priority-badged Recommendations
- Risk Assessment with factors & mitigations
- Tax Optimization Strategies
- Action Items with deadlines
- Detailed Financial Analysis:
  - Financial Health Assessment
  - Investment Strategy
  - Risk Analysis
  - Tax Planning Strategy
  - Debt Management Plan
  - Retirement & Long-term Planning

### Visual Report Editor
- **WYSIWYG editor** — Edit generated reports visually (bold, italic, underline, headings, lists, font size)
- **HTML source editing** — Switch to raw HTML mode for fine-grained control
- **Dark/light theme support** — Reports render beautifully in both themes
- **Report-level approval workflow** — Doctor approves final report before export

### E-Commerce Integration (Cart Functionality)
- **Medication Cart System** — Add prescribed medications to cart for easy purchasing
- **Finance Product Cart** — Add recommended investment products, insurance policies, and financial instruments
- **Cart Management** — Add, remove, update quantities for cart items
- **Price Calculation** — Automatic total price calculation with tax considerations
- **Multi-session Cart** — Cart persists across sessions for each patient
- **Checkout Integration** — Seamless checkout process with payment gateway integration
- **Order History** — Track past purchases and financial product subscriptions
- **Prescription-based Cart** — Auto-populate cart from doctor's prescriptions
- **Product Recommendations** — AI-suggested products based on consultation context

### Automated Follow-Up System

**Medication Reminders (Healthcare):**
- Add medicines with dosage, frequency, timing (Morning/Afternoon/Night)
- Custom time scheduling per slot
- Automated Twilio voice calls at scheduled times
- Per-medication call tracking

**Finance Investment Reminders:**
- Schedule reminders for stock buys, SIP dates, mutual fund investments
- Custom call messages
- Twilio-powered automated calls

**Appointment Scheduling:**
- Schedule follow-up appointment calls
- Immediate "Call Now" option
- Custom call scripts
- Call status tracking (initiated, in-progress, completed)

### Multi-Channel Report Delivery
- **PDF Export** — High-fidelity A4 multi-page PDF with light theme rendering
- **PDF Download** — Direct download with auto-generated filenames
- **WhatsApp Delivery** — Send PDF reports directly to patient's WhatsApp via Twilio
- **Vercel Blob Storage** — Persistent cloud storage for all exported PDFs
- **Language-aware export** — Translate report before export/download/WhatsApp

### Patient/Client Portal
- **Phone-based authentication** — Simple login/register with mobile number
- **Session history** — View all past consultation sessions
- **Report access** — View approved reports with full formatting
- **Smart Summary** — AI-generated plain-language summary in patient's preferred language
- **Medication tracking** — See all prescribed medications with schedules
- **Appointment history** — Track upcoming and past appointments
- **Shopping Cart** — Access and manage medication/product cart
- **Order Management** — View order history and track deliveries

### Admin Panel
- **Dashboard** — System-wide metrics and overview
- **Analytics** — Session statistics by domain, department, and date
- **User Management** — CRUD operations for doctors, finance agents, and admins
- **Configuration Management** — Domain/department-specific schemas, prompts, and report templates
- **Audit Logs** — Complete trail of all system actions (login, logout, session creation, report approval, PDF export, etc.)
- **Role-based access control** — JWT-based authentication with middleware protection
- **E-Commerce Analytics** — Track cart conversions, product performance, revenue metrics

### Security & Authentication
- **JWT-based auth** — Separate tokens for Doctor/Admin (`auth_token`) and Patient (`patient_token`)
- **Edge-compatible middleware** — Uses `jose` for JWT verification in Next.js Edge Runtime
- **Password hashing** — bcrypt for secure credential storage
- **Route-level protection** — Middleware guards all protected routes
- **Audit logging** — Every significant action is logged with user ID, IP address, and user agent

---

## Novelty & What Makes This Unique

### 1. Dual-Domain Architecture
Unlike single-purpose medical or financial tools, MediFi serves both Healthcare and Finance through a **shared conversation engine** with **domain-specific AI prompts, NER models, and report templates**. The same voice recording, transcription, NER, and report pipeline adapts dynamically based on the selected domain.

### 2. Hybrid NER Strategy
- **Healthcare**: Uses HuggingFace's `d4data/biomedical-ner-all` transformer model for high-accuracy biomedical entity extraction, augmented with **custom negation detection** that identifies patterns like "no vomiting", "denies fever", "no history of" and excludes those entities — a critical clinical accuracy feature.
- **Finance**: Uses Groq's `llama-3.3-70b-versatile` LLM with structured prompts for financial entity extraction (India-specific: tax sections like 80C/80D, lakhs, crores).
- Both NER paths feed into the **same downstream report generation pipeline**, showcasing architectural elegance.

### 3. Live Conversational Entity Extraction
Entities are extracted **after every patient message**, not just at the end. The NER sidebar updates in real-time during the consultation, giving doctors immediate visual feedback on detected symptoms, medications, and conditions.

### 4. Browser-Based Call Scheduler (Zero Infrastructure)
The `useCallScheduler` hook runs entirely in the browser, polling every 30 seconds. It eliminates the need for Vercel Cron jobs or external schedulers — as long as any doctor has the dashboard open, medication reminders and appointment calls fire on time via Twilio.

### 5. Comprehensive Indic Language Support (7 Languages)
Built specifically for Indian languages (Hindi, Kannada, Marathi, Tamil, Telugu, Malayalam) alongside English, using **Sarvam AI** — an Indian AI company specializing in Indic language processing. The system handles:
- Voice in any Indic language → Transcription in that language → Translation to all 6 other languages
- Reports generated in English → Translated to all Indic languages preserving HTML structure
- TTS playback in any language with natural Indian voices

### 6. AI-Suggested Questions
The platform generates **context-aware follow-up questions** based on the conversation so far, the patient's symptoms, and the department specialty. This guides less experienced doctors through systematic history-taking and reduces missed diagnoses.

### 7. Smart Summary with SHA-256 Caching
Patient summaries are hashed (transcript + extracted data + NER entities) and cached in the database. If the same data is requested again, the cached summary is returned instantly — preventing redundant AI API calls and reducing costs.

### 8. Clinical-Grade PDF Rendering
The PDF pipeline uses `html2canvas` + `jsPDF` with:
- Automatic light-theme enforcement (even when the app is in dark mode)
- Multi-page A4 splitting with proper content flow
- Brightness-based dark background detection and removal
- Style inheritance cleanup for pixel-perfect reports

### 9. Integrated E-Commerce System
Seamlessly combines medical consultations with prescription fulfillment and financial consultations with product recommendations through an integrated cart and checkout system. This creates a complete patient/client journey from consultation to action.

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Next.js 16 Frontend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐     │
│  │ Doctor/Advisor│  │ Patient/Client│  │   Admin Panel     │     │
│  │  Dashboard   │  │   Portal     │  │ (Sidebar Layout)  │     │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘     │
│         │                 │                    │                │
│  ┌──────▼─────────────────▼────────────────────▼──────────┐    │
│  │              Next.js Middleware (Edge)                  │    │
│  │         JWT verification via jose library              │    │
│  └──────────────────────┬─────────────────────────────────┘    │
└─────────────────────────┼──────────────────────────────────────┘
                          │ HTTP REST API
┌─────────────────────────▼──────────────────────────────────────┐
│                  Next.js API Routes (App Router)                │
│  ┌───────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────────┐  │
│  │ /api/ai/* │ │/api/voice│ │/api/twilio│ │ /api/session/*  │  │
│  │ • extract │ │• transcr.│ │• calls   │ │ • CRUD          │  │
│  │ • report  │ │• transl. │ │• appts   │ │ • messages      │  │
│  │ • summary │ │• tts     │ │• med-call│ │ • exports       │  │
│  │ • suggest │ │          │ │          │ │                  │  │
│  └─────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬────────┘  │
│        │            │            │                 │           │
│  ┌─────▼────────────▼────────────▼─────────────────▼────────┐  │
│  │         /api/cart/*          /api/orders/*               │  │
│  │         • add-item           • create                    │  │
│  │         • remove-item        • list                      │  │
│  │         • update-quantity    • details                   │  │
│  │         • get-cart           • status                    │  │
│  └─────┬────────────────────────────────────────────────────┘  │
│        │                                                        │
│  ┌─────▼────────────────────────────────────────────────────┐  │
│  │                     Prisma ORM Client                    │  │
│  └───────────────────────────┬──────────────────────────────┘  │
└──────────────────────────────┼─────────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────────┐
│                  NeonDB (PostgreSQL)                            │
│  Users │ Persons │ Sessions │ Interactions │ Configs            │
│  AuditLogs │ Exports │ Analytics │ Appointments                │
│  CartItems │ Orders │ Products │ Prescriptions                 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    External AI Services                        │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────────────┐   │
│  │  Sarvam AI │  │  Groq Cloud │  │   HuggingFace         │   │
│  │  • STT     │  │  • LLaMA 3  │  │   Inference Router    │   │
│  │  • TTS     │  │  • Mixtral  │  │   • Biomedical NER    │   │
│  │  • Transl. │  │  • Gemma    │  │                       │   │
│  └────────────┘  └─────────────┘  └───────────────────────┘   │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    External Services                           │
│  ┌────────────────┐    ┌──────────────────────────────────┐    │
│  │  Twilio        │    │  Vercel Blob Storage              │    │
│  │  • Voice calls │    │  • PDF report hosting             │    │
│  │  • WhatsApp    │    │  • Audio recordings               │    │
│  └────────────────┘    └──────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

---

## Component Diagram

```mermaid
graph TB
    subgraph Frontend ["Frontend (React/Next.js)"]
        LP[Landing Page]
        Login[Doctor Login]
        PatLogin[Patient Login]

        subgraph DoctorPortal ["Doctor/Advisor Portal"]
            DS[Domain Select<br/>Healthcare or Finance]
            PL[Person Lookup<br/>Phone-based search]
            SP[Session Page<br/>Main consultation view]
            VR[Voice Recorder<br/>Dual-mic system]
            ML[Message List<br/>7-language display]
            NE[NER Entity Sidebar<br/>Real-time extraction]
            RG[Report Viewer<br/>Color-coded sections]
            RE[Visual Report Editor<br/>WYSIWYG + HTML]
            SS[Smart Summary Panel<br/>7-language patient summary]
            MedMgr[Medication Manager<br/>Timing & reminders]
            ApptSch[Appointment Scheduler<br/>Twilio voice calls]
            FinRem[Finance Reminder<br/>Investment alerts]
            CartMgr[Cart Manager<br/>Add prescriptions to cart]
        end

        subgraph PatientPortal ["Patient/Client Portal"]
            PD[Patient Dashboard<br/>Session history]
            PR[Report Viewer<br/>Approved reports]
            PM[Medication View<br/>Schedule & reminders]
            PC[Shopping Cart<br/>Medication/Product cart]
            PO[Order History<br/>Track purchases]
        end

        subgraph AdminPanel ["Admin Panel"]
            AD[Admin Dashboard<br/>System metrics]
            AN[Analytics<br/>Charts & statistics]
            UM[User Management<br/>CRUD operations]
            CM[Config Manager<br/>Schemas & prompts]
            AL[Audit Logs<br/>Action history]
            PM_Admin[Product Management<br/>Catalog administration]
            OM[Order Management<br/>Fulfillment tracking]
        end
    end

    subgraph APILayer ["API Layer (Next.js Routes)"]
        AuthAPI["/api/auth/*<br/>Login, Register, Verify"]
        SessionAPI["/api/session/*<br/>CRUD, Messages, Export"]
        AIAPI["/api/ai/*<br/>NER, Reports, Summary"]
        VoiceAPI["/api/voice/*<br/>STT, TTS, Translate"]
        TwilioAPI["/api/twilio/*<br/>Calls, Appointments"]
        MedAPI["/api/medications/*<br/>CRUD & Call triggers"]
        AdminAPI["/api/admin/*<br/>Users, Configs, Logs"]
        AnalyticsAPI["/api/analytics/*<br/>Dashboard data"]
        CronAPI["/api/cron/*<br/>Scheduled call runner"]
        CartAPI["/api/cart/*<br/>Cart management"]
        OrderAPI["/api/orders/*<br/>Order processing"]
        ProductAPI["/api/products/*<br/>Product catalog"]
    end

    subgraph AIServices ["AI Services"]
        Sarvam["Sarvam AI<br/>STT · TTS · Translation"]
        Groq["Groq Cloud<br/>LLaMA 3 · Mixtral · Gemma"]
        HF["HuggingFace<br/>Biomedical NER"]
    end

    subgraph DataLayer ["Data Layer"]
        Prisma["Prisma ORM"]
        NeonDB["NeonDB PostgreSQL"]
        Blob["Vercel Blob<br/>PDF & Audio storage"]
    end

    subgraph ExtServices ["External Services"]
        Twilio["Twilio<br/>Voice & WhatsApp"]
        PaymentGW["Payment Gateway<br/>Razorpay/Stripe"]
    end

    SP --> VR & ML & NE & RG & RE & SS & MedMgr & ApptSch & FinRem & CartMgr

    VR --> VoiceAPI
    ML --> VoiceAPI
    NE --> AIAPI
    RG --> AIAPI
    SS --> AIAPI
    MedMgr --> MedAPI
    ApptSch --> TwilioAPI
    FinRem --> TwilioAPI
    CartMgr --> CartAPI

    PC --> CartAPI
    PO --> OrderAPI
    PM_Admin --> ProductAPI
    OM --> OrderAPI

    VoiceAPI --> Sarvam
    AIAPI --> Groq & HF
    TwilioAPI --> Twilio
    SessionAPI --> Prisma & Blob
    MedAPI --> Prisma & Twilio
    CronAPI --> TwilioAPI
    CartAPI --> Prisma
    OrderAPI --> Prisma & PaymentGW

    Prisma --> NeonDB

    Login --> AuthAPI
    PatLogin --> AuthAPI
    PD --> SessionAPI
    AD --> AnalyticsAPI & AdminAPI
    UM --> AdminAPI
    CM --> AdminAPI
    AL --> AdminAPI
```

---

## AI Pipeline — Activity Diagram

```mermaid
flowchart TD
    A([Doctor/Patient speaks]) --> B[Record audio via MediaRecorder API]
    B --> C[Send audio blob to /api/voice/transcribe]
    C --> D["Sarvam AI STT (saarika:v2.5)<br/>Transcribe in source language"]
    D --> E[Send transcript to /api/voice/translate-all]
    E --> F["Sarvam AI Translation (mayura:v1)<br/>Translate to all 7 languages"]
    F --> G[Store message with all translations]

    G --> H{Is speaker = Patient?}
    H -- No --> I[Generate AI question suggestions<br/>Groq llama-3.1-8b-instant]
    H -- Yes --> J[Build conversation context]

    J --> K{Domain?}
    K -- Healthcare --> L["HuggingFace NER<br/>d4data/biomedical-ner-all"]
    L --> L2[Custom Negation Filter<br/>Exclude denied symptoms]
    K -- Finance --> M["Groq NER<br/>llama-3.3-70b-versatile"]

    L2 --> N[Update NER sidebar in real-time]
    M --> N

    J --> O["Structured Data Extraction<br/>Groq llama-3.3-70b-versatile"]
    O --> P[Update extracted data panel]

    N --> Q{Doctor clicks Generate Report}
    P --> Q

    Q --> R{Domain?}
    R -- Healthcare --> S["Clinical Assessment Generation<br/>Differential Diagnosis<br/>Most Likely Diagnosis<br/>Investigations<br/>Treatment Plan<br/>Red Flags"]
    R -- Finance --> T["Financial Analysis Generation<br/>Health Assessment<br/>Investment Strategy<br/>Risk Analysis<br/>Tax Planning<br/>Debt Management"]

    S --> U[Render color-coded HTML report]
    T --> U

    U --> V{Export options}
    V --> V1["Download PDF"]
    V --> V2["Export to Blob"]
    V --> V3["Send via WhatsApp"]
    V --> V4["Edit with Visual Editor"]
    V --> V5["Approve Report"]
    V --> V6["Add to Cart<br/>Medications/Products"]

    V1 & V2 & V3 --> W{Language?}
    W -- English --> X[Generate PDF directly]
    W -- Other Languages --> Y["Translate report HTML<br/>Sarvam → Groq fallback"]
    Y --> X
    X --> Z["html2canvas + jsPDF<br/>Multi-page A4 PDF"]

    V5 --> AA[Mark session COMPLETED]
    AA --> AB["Generate Smart Summary<br/>7-language patient summary"]
    AB --> AC[Cache with SHA-256 hash]

    V6 --> AD[Add items to patient cart]
    AD --> AE[Calculate total with tax]
```

---

## Session Lifecycle — Activity Diagram

```mermaid
stateDiagram-v2
    [*] --> DoctorLogin: Doctor authenticates via JWT

    DoctorLogin --> DomainSelect: Select Healthcare or Finance
    DomainSelect --> DepartmentSelect: Choose specialty department

    DepartmentSelect --> PersonLookup: Search/register patient by phone

    PersonLookup --> SessionCreated: Create new session
    note right of SessionCreated: Status = ACTIVE

    SessionCreated --> Conversation: Start voice consultation
    
    state Conversation {
        [*] --> Recording
        Recording --> Transcribing: Stop recording
        Transcribing --> Translating: STT complete
        Translating --> EntityExtraction: All 7 translations saved
        EntityExtraction --> AISuggestions: NER entities updated
        AISuggestions --> Recording: Doctor asks next question
    }

    Conversation --> ReportGeneration: Doctor clicks "Generate Report"
    ReportGeneration --> ReportReview: AI report rendered

    state ReportReview {
        [*] --> Viewing
        Viewing --> Editing: Click Edit
        Editing --> Viewing: Save changes
        Viewing --> Translating_Report: Select language
        Translating_Report --> Viewing: Translation complete
    }

    ReportReview --> Approved: Doctor approves report
    note right of Approved: Status = COMPLETED

    Approved --> PostConsultation

    state PostConsultation {
        [*] --> PDFExport: Export/Download PDF
        [*] --> WhatsAppDelivery: Send to patient
        [*] --> MedicationSetup: Add medication reminders
        [*] --> AppointmentSetup: Schedule follow-up call
        [*] --> SmartSummary: Generate patient summary
        [*] --> CartPopulation: Add prescriptions to cart
    }

    PostConsultation --> [*]
```

---

## Voice Processing Flow

```mermaid
sequenceDiagram
    participant D as Doctor/Patient
    participant UI as Browser UI
    participant STT as /api/voice/transcribe
    participant TRL as /api/voice/translate-all
    participant SAR as Sarvam AI
    participant DB as NeonDB

    D->>UI: Press record button
    UI->>UI: Start MediaRecorder (audio/webm)
    D->>UI: Press stop
    UI->>STT: POST audio blob + language
    STT->>SAR: Speech-to-Text (saarika:v2.5)
    SAR-->>STT: Transcript in source language
    STT-->>UI: { transcript }

    UI->>TRL: POST { text, sourceLang }
    TRL->>SAR: Translate to English
    TRL->>SAR: Translate to Hindi
    TRL->>SAR: Translate to Kannada
    TRL->>SAR: Translate to Marathi
    TRL->>SAR: Translate to Tamil
    TRL->>SAR: Translate to Telugu
    TRL->>SAR: Translate to Malayalam
    SAR-->>TRL: All 7 translations
    TRL-->>UI: { translations: { EN, HI, KN, MR, TA, TE, ML } }

    UI->>DB: Save interaction with all translations
    UI->>UI: Display message with language tabs

    Note over D,UI: User can switch language per message
    Note over D,UI: User can click speaker icon to hear TTS in any language
```

---

## Report Generation Pipeline

```mermaid
flowchart LR
    subgraph Input
        T[Transcript]
        NER[NER Entities]
        ED[Extracted Data]
        CFG[Config Template]
    end

    subgraph HealthcareReport ["Healthcare Pipeline"]
        H1["Structured Clinical<br/>Data Extraction"]
        H2["Clinical Assessment<br/>Generation"]
        H3["HTML Report with<br/>Color-coded Sections"]
        H4["Prescription to Cart<br/>Conversion"]
    end

    subgraph FinanceReport ["Finance Pipeline"]
        F1["Structured Financial<br/>Data Extraction"]
        F2["Financial Analysis<br/>Generation"]
        F3["HTML Report with<br/>Priority Badges"]
        F4["Product Recommendations<br/>to Cart"]
    end

    subgraph Output
        PDF["PDF Export"]
        WA["WhatsApp"]
        EDIT["Visual Editor"]
        TR["Translation"]
        CART["Shopping Cart"]
    end

    T & NER & ED & CFG --> H1 & F1
    H1 --> H2 --> H3 --> H4
    F1 --> F2 --> F3 --> F4
    H3 & F3 --> PDF & WA & EDIT & TR
    H4 & F4 --> CART
```

---

## Automated Call Scheduling Flow

```mermaid
flowchart TD
    subgraph Setup ["Setup Phase"]
        A1[Doctor adds medication<br/>with timing slots]
        A2[Doctor schedules<br/>appointment call]
        A3[Advisor creates<br/>finance reminder]
    end

    subgraph Scheduler ["Browser-Based Scheduler"]
        B1["useCallScheduler hook<br/>polls every 30 seconds"]
        B2["Compare current IST time<br/>with scheduled times"]
        B3{Any calls due?}
    end

    subgraph Execution ["Call Execution"]
        C1["GET /api/cron/scheduled-calls"]
        C2["Match medication times"]
        C3["Match appointment times"]
        C4["Match finance reminder times"]
        C5["Twilio Voice API<br/>Outbound call"]
        C6["TwiML script<br/>Custom voice message"]
    end

    A1 & A2 & A3 --> B1
    B1 --> B2 --> B3
    B3 -- Yes --> C1
    B3 -- No --> B1
    C1 --> C2 & C3 & C4
    C2 & C3 & C4 --> C5 --> C6

    C6 --> D["Patient receives<br/>automated voice call"]
```

---

## Multi-Portal User Journey

```mermaid
flowchart LR
    subgraph DoctorFlow ["Doctor Journey"]
        D1[Login] --> D2[Select Domain]
        D2 --> D3[Lookup Patient]
        D3 --> D4[Create Session]
        D4 --> D5[Voice Consultation]
        D5 --> D6[Review Entities]
        D6 --> D7[Generate Report]
        D7 --> D8[Edit & Approve]
        D8 --> D9[Export / Send]
        D9 --> D10[Set Medication<br/>Reminders]
        D10 --> D11[Schedule<br/>Follow-up Call]
        D11 --> D12[Add Items to<br/>Patient Cart]
    end

    subgraph PatientFlow ["Patient Journey"]
        P1[Login with Phone] --> P2[View Dashboard]
        P2 --> P3[See Past Sessions]
        P3 --> P4[Read AI Report]
        P4 --> P5[View Smart Summary<br/>in preferred language]
        P5 --> P6[Check Medications]
        P6 --> P7[Receive Reminder Calls]
        P7 --> P8[Access Shopping Cart]
        P8 --> P9[Checkout & Payment]
        P9 --> P10[Track Order]
    end

    subgraph AdminFlow ["Admin Journey"]
        A1[Login] --> A2[View Dashboard<br/>System Metrics]
        A2 --> A3[Manage Users<br/>CRUD]
        A3 --> A4[Configure Departments<br/>Schemas & Templates]
        A4 --> A5[Review Audit Logs]
        A5 --> A6[View Analytics]
        A6 --> A7[Manage Product<br/>Catalog]
        A7 --> A8[Monitor Orders &<br/>Fulfillment]
    end

    D9 -.->|Report delivered| P4
    D10 -.->|Twilio call| P7
    D12 -.->|Cart populated| P8
    A3 -.->|Creates doctor| D1
```

---

## Database Schema

```mermaid
erDiagram
    User ||--o{ Session : "conducts"
    User ||--o{ AuditLog : "generates"
    User ||--o{ Appointment : "schedules"
    Person ||--o{ Session : "participates in"
    Person ||--o{ Appointment : "has"
    Person ||--o{ Cart : "owns"
    Person ||--o{ Order : "places"
    Session ||--o{ Interaction : "contains"
    Session ||--o{ Export : "produces"
    Session ||--o{ Appointment : "leads to"
    Session ||--o{ Prescription : "generates"
    Cart ||--o{ CartItem : "contains"
    Order ||--o{ OrderItem : "contains"
    Product ||--o{ CartItem : "added to"
    Product ||--o{ OrderItem : "included in"
    Prescription ||--o{ CartItem : "auto-populates"
    Config }|--|| Config : "unique per domain+dept"

    User {
        string id PK
        string email UK
        string name
        Role role "DOCTOR | FINANCE_AGENT | ADMIN"
        string password "bcrypt hashed"
        Department department "nullable"
        boolean isActive
        datetime lastLogin
    }

    Person {
        string id PK
        string phone UK
        string name
        string email
        int age
        string gender
        string preferredLanguage "EN|HI|KN|MR|TA|TE|ML"
    }

    Session {
        string id PK
        string personId FK
        string userId FK
        Domain domain "HEALTHCARE | FINANCE"
        Department department
        Language language "EN | HI | KN | MR | TA | TE | ML"
        SessionStatus status "ACTIVE | COMPLETED | ARCHIVED"
        text transcript
        text translatedText
        json extractedData
        json nerEntities
        text finalReport "HTML report"
        json smartSummary "Cached multilingual summary"
        string smartSummaryHash "SHA-256 for cache validation"
        boolean approved
        datetime approvedAt
        int duration
    }

    Interaction {
        string id PK
        string sessionId FK
        string speaker "doctor | patient"
        string audioUrl
        text text "Original transcription"
        text englishText
        text hindiText
        text kannadaText
        text marathiText
        text tamilText
        text teluguText
        text malayalamText
        datetime timestamp
    }

    Config {
        string id PK
        Domain domain
        Department department
        json schema "Extraction schema"
        json prompts "AI prompts"
        text template "Report template"
        boolean isActive
    }

    AuditLog {
        string id PK
        string userId FK
        AuditAction action
        string resource
        json details
        string ipAddress
        string userAgent
        datetime timestamp
    }

    Export {
        string id PK
        string sessionId FK
        string format "PDF"
        string fileUrl "Vercel Blob URL"
        string language "EN|HI|KN|MR|TA|TE|ML"
        datetime createdAt
    }

    Analytics {
        string id PK
        date date
        Domain domain
        Department department
        int totalSessions
        int completedSessions
        float avgDuration
        int totalPatients
        int reportsGenerated
        int cartConversions
        decimal revenue
    }

    Appointment {
        string id PK
        string sessionId FK
        string personId FK
        string userId FK
        datetime appointmentDate
        string notes
        string twilioCallSid
        string callStatus "initiated | in-progress | completed"
        boolean callFired
        string customScript
    }

    Product {
        string id PK
        string name
        string description
        string category "MEDICATION | INVESTMENT | INSURANCE | OTHER"
        decimal price
        string currency "INR"
        boolean requiresPrescription
        json metadata
        boolean isActive
    }

    Cart {
        string id PK
        string personId FK
        datetime createdAt
        datetime updatedAt
    }

    CartItem {
        string id PK
        string cartId FK
        string productId FK
        string prescriptionId FK "nullable"
        int quantity
        decimal priceAtAdd
        json metadata
        datetime addedAt
    }

    Order {
        string id PK
        string personId FK
        string sessionId FK "nullable"
        OrderStatus status "PENDING|CONFIRMED|SHIPPED|DELIVERED|CANCELLED"
        decimal totalAmount
        decimal taxAmount
        string currency "INR"
        string paymentMethod
        string paymentId
        text shippingAddress
        text billingAddress
        datetime createdAt
        datetime updatedAt
    }

    OrderItem {
        string id PK
        string orderId FK
        string productId FK
        int quantity
        decimal unitPrice
        decimal totalPrice
        json metadata
    }

    Prescription {
        string id PK
        string sessionId FK
        string medicationName
        string dosage
        string frequency
        int duration
        string timing "MORNING|AFTERNOON|NIGHT"
        datetime scheduledTime
        boolean addedToCart
    }
```

---

## Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Full-stack React framework |
| **Language** | TypeScript 5 | Type-safe codebase |
| **Database** | NeonDB (PostgreSQL) | Serverless PostgreSQL |
| **ORM** | Prisma 5 | Database access & migrations |
| **Auth** | JWT (jose + jsonwebtoken) | Edge-compatible authentication |
| **AI - LLM** | Groq (LLaMA 3.3 70B, LLaMA 3.1 8B, Mixtral, Gemma) | Report generation, NER, summaries |
| **AI - NER** | HuggingFace (d4data/biomedical-ner-all) | Medical entity extraction |
| **AI - Voice** | Sarvam AI (saarika, mayura, bulbul) | STT, Translation, TTS (7 languages) |
| **Telephony** | Twilio (Voice + WhatsApp) | Automated calls & messaging |
| **Storage** | Vercel Blob | PDF & audio file storage |
| **PDF** | jsPDF + html2canvas | Client-side PDF generation |
| **Charts** | Recharts | Analytics visualizations |
| **UI** | Radix UI + Lucide React | Accessible component primitives |
| **Styling** | Tailwind CSS 3 | Utility-first styling |
| **Fonts** | DM Sans, IBM Plex Mono, Sora, JetBrains Mono | Typography system |
| **Payments** | Razorpay / Stripe | Payment gateway integration |

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Doctor/Admin login |
| `POST` | `/api/auth/logout` | Clear auth cookies |
| `GET` | `/api/auth/verify` | Verify JWT token |
| `POST` | `/api/patient/login` | Patient phone-based login |
| `POST` | `/api/patient/register` | Patient registration |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/session/create` | Create new session |
| `GET` | `/api/session/[id]` | Get session details |
| `PATCH` | `/api/session/[id]` | Update session fields |
| `POST` | `/api/session/[id]/add-message` | Add interaction message |
| `PATCH` | `/api/session/[id]/edit-message` | Edit message with re-translation |
| `POST` | `/api/session/[id]/export-pdf` | Upload PDF to Vercel Blob |
| `GET` | `/api/session/[id]/exports` | List session exports |

### AI & Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/extract-data` | Structured data extraction |
| `POST` | `/api/ai/extract-entities` | NER entity extraction |
| `POST` | `/api/ai/generate-report` | Full report generation |
| `POST` | `/api/ai/generate-summary` | Multilingual smart summary (7 languages) |
| `POST` | `/api/ai/suggest-questions` | AI follow-up suggestions |
| `POST` | `/api/ai/translate-report` | Report HTML translation |

### Voice
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/voice/transcribe` | Speech-to-text via Sarvam |
| `POST` | `/api/voice/translate` | Single-target translation |
| `POST` | `/api/voice/translate-all` | Translate to all 7 languages |
| `POST` | `/api/voice/tts` | Text-to-speech via Sarvam |

### Telephony
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/twilio/schedule-call` | Schedule Twilio voice call |
| `POST` | `/api/twilio/medication-call` | Trigger medication reminder |
| `POST` | `/api/twilio/finance-reminder-call` | Trigger finance reminder |
| `GET` | `/api/twilio/appointments` | List appointments |
| `GET` | `/api/cron/scheduled-calls` | Fire due scheduled calls |

### E-Commerce
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/cart/add-item` | Add item to cart |
| `DELETE` | `/api/cart/remove-item` | Remove item from cart |
| `PATCH` | `/api/cart/update-quantity` | Update item quantity |
| `GET` | `/api/cart/get-cart` | Get user's cart |
| `DELETE` | `/api/cart/clear` | Clear entire cart |
| `POST` | `/api/orders/create` | Create new order |
| `GET` | `/api/orders/list` | List user orders |
| `GET` | `/api/orders/[id]` | Get order details |
| `PATCH` | `/api/orders/[id]/status` | Update order status |
| `GET` | `/api/products/list` | List available products |
| `GET` | `/api/products/[id]` | Get product details |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/admin/users` | User management |
| `GET/POST` | `/api/admin/configs` | Config management |
| `GET` | `/api/admin/audit-logs` | Audit log retrieval |
| `GET` | `/api/analytics/dashboard` | Analytics data |
| `GET/POST/PATCH` | `/api/admin/products` | Product catalog management |
| `GET` | `/api/admin/orders` | Order fulfillment management |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or NeonDB account)
- API keys for: Sarvam AI, Groq, HuggingFace, Twilio
- Payment gateway credentials (Razorpay/Stripe)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/turbos-medifi.git
cd turbos-medifi

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your API keys (see Environment Variables section)

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed the database (optional)
npm run seed

# Start the development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Authentication
NEXTAUTH_SECRET="your-jwt-secret-key"

# AI Services
GROQ_API_KEY="gsk_..."
HUGGINGFACE_API_KEY="hf_..."
SARVAM_API_KEY="your-sarvam-key"

# Twilio
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+1..."

# Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# Payment Gateway
RAZORPAY_KEY_ID="rzp_..."
RAZORPAY_KEY_SECRET="your-razorpay-secret"
# OR
STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_SECRET_KEY="sk_..."

# Cron
NEXT_PUBLIC_CRON_SECRET="your-cron-secret"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Project Structure

```
turbos-medifi/
├── app/
│   ├── (auth)/                    # Auth pages (login)
│   ├── (dashboard)/               # Doctor/Advisor portal
│   │   ├── layout.tsx             # Dashboard shell + call scheduler
│   │   ├── domain-select/         # Healthcare/Finance selection
│   │   ├── person-lookup/         # Patient search & registration
│   │   └── session/[id]/          # Main consultation page (2300+ lines)
│   ├── (patient)/                 # Patient/Client portal
│   │   └── patient/
│   │       ├── page.tsx           # Phone-based login
│   │       ├── dashboard/         # Patient dashboard
│   │       ├── cart/              # Shopping cart
│   │       └── orders/            # Order history
│   ├── admin/                     # Admin panel
│   │   ├── layout.tsx             # Sidebar layout
│   │   ├── dashboard/             # System metrics
│   │   ├── analytics/             # Usage statistics
│   │   ├── users/                 # User management
│   │   ├── configs/               # Department configurations
│   │   ├── audit-logs/            # Action history
│   │   ├── products/              # Product catalog
│   │   └── orders/                # Order management
│   ├── api/                       # REST API routes
│   │   ├── ai/                    # AI endpoints
│   │   │   ├── extract-data/      # Structured data extraction
│   │   │   ├── extract-entities/  # NER processing
│   │   │   ├── generate-report/   # Report generation (623 lines)
│   │   │   ├── generate-summary/  # Smart summary with caching
│   │   │   ├── suggest-questions/ # AI question suggestions
│   │   │   └── translate-report/  # HTML report translation
│   │   ├── voice/                 # Voice processing
│   │   │   ├── transcribe/        # Sarvam STT (7 languages)
│   │   │   ├── translate/         # Single translation
│   │   │   ├── translate-all/     # 7-language translation
│   │   │   └── tts/               # Text-to-speech
│   │   ├── twilio/                # Telephony
│   │   │   ├── schedule-call/     # Call scheduling
│   │   │   ├── medication-call/   # Med reminder calls
│   │   │   ├── finance-reminder-call/
│   │   │   └── appointments/      # Appointment management
│   │   ├── session/               # Session CRUD
│   │   ├── medications/           # Medication management
│   │   ├── finance-reminders/     # Finance reminder management
│   │   ├── cart/                  # Cart operations
│   │   │   ├── add-item/          # Add to cart
│   │   │   ├── remove-item/       # Remove from cart
│   │   │   ├── update-quantity/   # Update quantity
│   │   │   ├── get-cart/          # Retrieve cart
│   │   │   └── clear/             # Clear cart
│   │   ├── orders/                # Order processing
│   │   │   ├── create/            # Create order
│   │   │   ├── list/              # List orders
│   │   │   ├── [id]/              # Order details
│   │   │   └── [id]/status/       # Update status
│   │   ├── products/              # Product catalog
│   │   ├── auth/                  # Authentication
│   │   ├── admin/                 # Admin operations
│   │   ├── analytics/             # Analytics data
│   │   ├── patient/               # Patient auth
│   │   ├── person/                # Person lookup
│   │   └── cron/                  # Scheduled job runner
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Landing page
├── components/
│   ├── session/
│   │   └── VoiceRecorder.tsx      # Audio recording component
│   ├── cart/
│   │   ├── CartDrawer.tsx         # Cart sidebar
│   │   ├── CartItem.tsx           # Individual cart item
│   │   └── CheckoutButton.tsx     # Checkout initiation
│   └── ui/                        # Radix-based UI primitives
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       └── ...
├── lib/
│   ├── auth/                      # Auth utilities
│   ├── hooks/
│   │   ├── useCallScheduler.ts    # Browser-based call scheduler
│   │   ├── useSessionPolling.ts   # Real-time session updates
│   │   ├── useSessionStream.ts    # SSE streaming
│   │   └── useCart.ts             # Cart management hook
│   ├── huggingface/
│   │   └── ner.ts                 # Biomedical NER with negation detection
│   ├── ner/
│   │   ├── medical-ner.ts         # Groq-based medical NER
│   │   └── finance-ner.ts         # Financial entity extraction
│   ├── pdf/
│   │   └── client-generator.ts    # HTML→PDF with theme enforcement
│   ├── payments/
│   │   ├── razorpay.ts            # Razorpay integration
│   │   └── stripe.ts              # Stripe integration
│   ├── middleware/                # API middleware helpers
│   ├── groq.ts                    # Groq client configuration
│   ├── sarvam.ts                  # Sarvam AI client (STT/TTS/Translation)
│   ├── prisma.ts                  # Prisma client singleton
│   └── utils.ts                   # Utility functions
├── prisma/
│   ├── schema.prisma              # Database schema (expanded with cart/orders)
│   └── seed.ts                    # Database seeder
├── types/                         # TypeScript type definitions
│   ├── session.ts
│   ├── cart.ts
│   ├── order.ts
│   └── product.ts
├── middleware.ts                   # Next.js Edge middleware (auth)
├── tailwind.config.ts             # Tailwind configuration
├── next.config.ts                 # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies & scripts
```

---

## License

This project is proprietary. All rights reserved.

---

<p align="center">
  <strong>Built by TurboS</strong><br/>
  <em>Powering the future of multilingual conversational intelligence</em>
</p>