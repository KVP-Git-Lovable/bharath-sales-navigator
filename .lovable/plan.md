
# Plan: Enhanced AI Assistant with Voice Conversation using ElevenLabs

## Overview
Transform the existing text-based AI Assistant into a dual-mode assistant that offers both **Text Chat** and **Voice Conversation** options. The Voice Conversation mode will use ElevenLabs Conversational AI with the specified Voice ID `1Z7Y8o9cvUeWq8oLKgMY`, supporting both English and Hindi speech recognition and responses.

## Current State Analysis
- **ChatWidget.tsx** displays a floating button that opens text chat (Sheet on desktop, Drawer on mobile)
- **ChatDialog.tsx** handles text-based conversation with the `chat-assistant` edge function
- **ElevenLabs TTS** already configured with `ELEVENLABS_API_KEY` secret
- **Existing voice patterns** in `useReportVoiceChat.ts` and `VoiceOrderAssistant.tsx`

## Implementation Architecture

### User Flow
```text
┌────────────────────────────────────────────────────────────┐
│                  Click AI Assistant Button                  │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│              "Choose how to interact" Dialog               │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │   💬 Text Chat       │  │   🎤 Voice Conversation  │   │
│  │                      │  │                          │   │
│  │   Type your question │  │   Speak in English or    │   │
│  │                      │  │   Hindi                  │   │
│  └──────────────────────┘  └──────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           ▼                                     ▼
┌──────────────────────┐           ┌──────────────────────────┐
│   Existing Text      │           │   Voice Conversation     │
│   Chat Dialog        │           │   with ElevenLabs Agent  │
└──────────────────────┘           └──────────────────────────┘
```

## Files to Create

### 1. Edge Function: `elevenlabs-conversation-token`
**Path:** `supabase/functions/elevenlabs-conversation-token/index.ts`

Server-side token generation for secure ElevenLabs WebRTC connection.

```typescript
// Generates a single-use conversation token for ElevenLabs agent
const response = await fetch(
  `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${AGENT_ID}`,
  { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
);
```

**Note:** Requires an ElevenLabs Conversational AI Agent to be created in the ElevenLabs web console with:
- Voice ID: `1Z7Y8o9cvUeWq8oLKgMY`
- Knowledge base about QuickApp features and navigation
- Bilingual support (English/Hindi)

### 2. React Hook: `useVoiceAssistant`
**Path:** `src/hooks/useVoiceAssistant.ts`

Manages ElevenLabs conversation using `@elevenlabs/react` SDK's `useConversation` hook.

Key features:
- Connects to ElevenLabs agent via WebRTC for low-latency voice
- Handles microphone permissions
- Tracks connection status and speaking state
- Provides volume controls for audio visualization

### 3. Component: `InteractionModeSelector`
**Path:** `src/components/chat/InteractionModeSelector.tsx`

The initial dialog showing two options:
- **Text Chat**: Opens existing ChatDialog
- **Voice Conversation**: Opens VoiceConversationDialog

UI matches the reference image with card-style buttons.

### 4. Component: `VoiceConversationDialog`
**Path:** `src/components/chat/VoiceConversationDialog.tsx`

Full-screen voice conversation interface featuring:
- Connection status indicator
- Animated microphone button (listening/speaking states)
- Real-time transcript display
- Stop/End conversation controls
- Visual feedback when AI is speaking

## Files to Modify

### 1. ChatWidget.tsx
**Changes:**
- Add state for interaction mode (`'selecting' | 'text' | 'voice'`)
- When button clicked, show `InteractionModeSelector` first
- Based on selection, render `ChatDialog` or `VoiceConversationDialog`

### 2. package.json (dependencies)
**Add:**
- `@elevenlabs/react` - ElevenLabs React SDK for conversational AI

## Technical Implementation Details

### ElevenLabs Agent Configuration (Manual Step in ElevenLabs Console)

Before the code works, an ElevenLabs Conversational AI Agent must be configured with:

1. **Voice:** Use Voice ID `1Z7Y8o9cvUeWq8oLKgMY`
2. **System Prompt:**
```text
You are a helpful AI assistant for QuickApp, a field sales management application. 
You help users navigate the app and answer questions about features.

The app includes these main sections:
- Home Dashboard: Overview of daily activities
- My Visits: Schedule and track retailer visits
- My Retailers: Manage retailer database
- Beat Planning: Plan daily routes
- Order Entry: Create orders during visits
- Analytics: View performance reports
- Attendance: Track check-in/check-out
- Schemes: View active promotions
- Team (for managers): Monitor team performance

When asked about navigation:
- Be specific about which menu item to click
- Describe the path step by step
- Mention any buttons or tabs they need to find

Respond naturally in the same language the user speaks (English or Hindi).
Keep responses concise and actionable.
```

3. **Language Settings:** Enable both English and Hindi
4. **First Message:** "Hello! I'm your QuickApp assistant. How can I help you today?"

### Voice Conversation Flow

```text
1. User clicks Voice Conversation
2. Frontend requests token from elevenlabs-conversation-token edge function
3. Edge function returns WebRTC token
4. Frontend connects to ElevenLabs agent using useConversation hook
5. User speaks (English or Hindi)
6. ElevenLabs processes speech, generates response
7. AI responds in same language via voice
8. Conversation continues until user ends
```

### Component Hierarchy

```text
ChatWidget (container)
├── Floating Button
├── InteractionModeSelector (initial choice)
│   ├── Text Chat Card
│   └── Voice Conversation Card
├── ChatDialog (existing text chat)
└── VoiceConversationDialog (new voice UI)
    ├── Header with close button
    ├── Status indicator (connecting/connected/speaking)
    ├── Visual waveform/animation
    ├── Transcript display area
    └── Control buttons (mute, end call)
```

### Error Handling
- Microphone permission denied: Show permission request dialog
- Connection failure: Display retry option
- Token expired: Automatically refresh and reconnect
- Network issues: Graceful degradation with error message

## New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @elevenlabs/react | ^0.0.x | ElevenLabs React SDK for useConversation hook |

## Implementation Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Create | Edge function for secure token generation |
| `src/hooks/useVoiceAssistant.ts` | Create | Hook wrapping ElevenLabs useConversation |
| `src/components/chat/InteractionModeSelector.tsx` | Create | Mode selection dialog (Text/Voice) |
| `src/components/chat/VoiceConversationDialog.tsx` | Create | Voice conversation UI |
| `src/components/chat/ChatWidget.tsx` | Modify | Add mode selection state and routing |

## User-Required Configuration

After implementation, the user must:
1. **Create an ElevenLabs Agent** in the ElevenLabs console
2. **Configure the agent** with Voice ID `1Z7Y8o9cvUeWq8oLKgMY`, bilingual support, and QuickApp knowledge
3. **Store the Agent ID** as a Supabase secret: `ELEVENLABS_AGENT_ID`

## Expected Outcome

After implementation:
1. Clicking the AI Assistant button shows "Choose how to interact" dialog
2. **Text Chat** opens the existing familiar text conversation
3. **Voice Conversation** connects to ElevenLabs with microphone access
4. Users can speak in English or Hindi
5. AI responds vocally in the same language
6. AI can answer questions about any QuickApp feature and provide navigation guidance
