

# Voice-Enabled Report Summary with Interactive Chat

## Overview

This plan adds voice capabilities to the Report Summary dialog using ElevenLabs. When opened, the dialog will:
1. Automatically read the report summary aloud using Text-to-Speech
2. Allow users to ask follow-up questions via voice or text about the report data
3. Provide spoken responses to questions using AI-powered context-aware answers

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ReportSummaryDialog                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────────────────────────┐ │
│  │  Report Summary │  │       Interactive Chat Section        │ │
│  │  (Text Display) │  │  ┌──────────────────────────────────┐│ │
│  │                 │  │  │  Voice/Text Input                ││ │
│  │  [Play/Stop]    │  │  │  [Mic Button] [Text Input] [Send]││ │
│  │                 │  │  └──────────────────────────────────┘│ │
│  │                 │  │  ┌──────────────────────────────────┐│ │
│  │                 │  │  │  Chat Messages                   ││ │
│  │                 │  │  │  (with spoken responses)         ││ │
│  │                 │  │  └──────────────────────────────────┘│ │
│  └─────────────────┘  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Components to Create/Modify

### 1. New Edge Function: `elevenlabs-tts`
**Purpose**: Convert text to speech using ElevenLabs API

- Accepts text and optional voice ID
- Returns audio as binary MP3 data
- Uses the `ELEVENLABS_API_KEY` secret (to be added)

### 2. New Edge Function: `report-voice-assistant`
**Purpose**: Handle Q&A about report data

- Receives user question + report context data
- Uses OpenAI to generate contextual answers about the report
- Returns text response that can then be spoken

### 3. New Hook: `useReportVoiceChat`
**Purpose**: Manage voice interactions for the report dialog

- Speech-to-text using browser's Web Speech API
- Audio playback queue management
- Chat message state management
- Integration with edge functions for TTS and Q&A

### 4. Enhanced Component: `ReportSummaryDialog.tsx`
**Purpose**: Add voice playback and interactive chat UI

Changes:
- Add Play/Stop button to read summary aloud on open
- Add chat section with message history
- Add microphone button for voice input
- Add text input for typed questions
- Display responses and play them via TTS

## Implementation Details

### Phase 1: Add ElevenLabs API Key
Store the provided API key as a Supabase secret:
- Secret name: `ELEVENLABS_API_KEY`
- Value: `sk_368950cab321551369bc5f4ea0becebcbf5cbf034c7f3724`

### Phase 2: Create TTS Edge Function
```typescript
// supabase/functions/elevenlabs-tts/index.ts
// - Accept POST with { text, voiceId? }
// - Call ElevenLabs TTS API
// - Return binary audio/mpeg response
// - Use voice "George" (JBFqnCBsd6RMkjVDRZzb) for professional narration
```

### Phase 3: Create Report Voice Assistant Edge Function
```typescript
// supabase/functions/report-voice-assistant/index.ts
// - Accept POST with { question, reportContext }
// - reportContext contains: allUsersSummary, orderSummaryData, skuData, productivityData
// - Use OpenAI to answer questions about the report data
// - Return { answer: string }
```

### Phase 4: Create Voice Chat Hook
```typescript
// src/hooks/useReportVoiceChat.ts
// - State: messages[], isRecording, isPlaying, isSpeaking
// - Methods: startRecording(), stopRecording(), sendMessage(), playAudio()
// - Audio queue for sequential TTS playback
// - Web Speech API for voice input
```

### Phase 5: Update ReportSummaryDialog
Enhanced UI with two sections:
1. **Summary Section** (left/top):
   - Existing summary text display
   - Auto-play toggle for reading summary on open
   - Play/Pause button with volume indicator

2. **Chat Section** (right/bottom):
   - Message bubbles showing Q&A history
   - Input area with microphone button and text field
   - Loading states for processing voice/generating response

## User Flow

1. **Open Dialog** → Summary displayed, optional auto-read starts
2. **Ask Question** (voice or text):
   - Voice: Tap mic → Speak → Processing → Answer displayed & spoken
   - Text: Type → Send → Answer displayed & spoken
3. **Example Questions**:
   - "Who is the top performer?"
   - "What is the total revenue?"
   - "How many productive visits were there?"
   - "Compare the top 3 users"

## Technical Specifications

### Audio Playback
- Format: MP3 (44.1kHz, 128kbps)
- Queue-based playback to handle multiple TTS responses
- Use `fetch()` with `.blob()` for binary audio data (not `supabase.functions.invoke`)

### Voice Input
- Browser Web Speech API (existing pattern from `useVoiceOrder.ts`)
- Language: `en-IN` for Indian English support
- Real-time transcript display while speaking

### Report Context for AI
Pass complete report data to enable accurate answers:
```typescript
interface ReportContext {
  dateRange: { from: string; to: string };
  allUsersSummary: { retailers, beats, products, totalKg };
  orderSummaryData: { full_name, total_order_value }[];
  skuData: { product_name, quantity_sold, revenue, unit }[];
  productivityData: { full_name, productivity_percentage, productive_visits, total_visits }[];
}
```

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/elevenlabs-tts/index.ts` | Text-to-Speech edge function |
| `supabase/functions/report-voice-assistant/index.ts` | Q&A edge function for report data |
| `src/hooks/useReportVoiceChat.ts` | Voice chat state management hook |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/analytics/ReportSummaryDialog.tsx` | Add voice playback, chat UI, integrate new hook |

## Security Considerations

- ElevenLabs API key stored as Supabase secret (server-side only)
- Report data passed to AI is session-scoped (no persistence)
- Voice recordings processed client-side, only transcribed text sent to server

