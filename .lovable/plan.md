
# AI Assistant Updates - ElevenLabs Text Agent + Hindi Localization

## Overview
Two changes to the AI Assistant widget:
1. Switch Text Chat from the current edge function to use ElevenLabs Agent ID `agent_9301kgp19jzyf72rrtkshfdzbf11` in text-only mode
2. Add Hindi text to the Voice Conversation option in the interaction selector

---

## Change 1: Text Chat with ElevenLabs Agent

### Current Behavior
Text Chat uses the `chat-assistant` edge function with Lovable AI gateway for responses.

### New Behavior
Text Chat will use ElevenLabs Conversational AI in **text-only mode** with Agent ID `agent_9301kgp19jzyf72rrtkshfdzbf11`.

### Implementation

#### Step 1: Create a new hook for text-based ElevenLabs agent
**New File: `src/hooks/useTextAssistant.ts`**

```tsx
// Uses @elevenlabs/react useConversation with textOnly: true
// Connects to agent via signed URL from edge function
// Provides sendUserMessage() for text input
// Handles agent_response events for display
```

Key features:
- Uses `textOnly: true` mode (no microphone needed)
- Connects via WebSocket signed URL
- Sends text with `conversation.sendUserMessage(text)`
- Receives responses via `onMessage` callback

#### Step 2: Modify edge function to support text agent
**File: `supabase/functions/elevenlabs-conversation-token/index.ts`**

Update to accept an optional `agentType` parameter:
- `agentType: 'voice'` → Uses existing `ELEVENLABS_AGENT_ID` from env
- `agentType: 'text'` → Uses hardcoded `agent_9301kgp19jzyf72rrtkshfdzbf11`

```typescript
const agentId = agentType === 'text' 
  ? 'agent_9301kgp19jzyf72rrtkshfdzbf11' 
  : ELEVENLABS_AGENT_ID;
```

#### Step 3: Create new TextChatDialog component
**New File: `src/components/chat/TextChatDialog.tsx`**

A simpler chat interface that:
- Connects to ElevenLabs agent on mount
- Shows message history (user + agent)
- Provides text input field
- Displays connection status
- Uses the new `useTextAssistant` hook

#### Step 4: Update ChatWidget to use new component
**File: `src/components/chat/ChatWidget.tsx`**

Replace `ChatDialog` with `TextChatDialog` when mode is `'text'`.

---

## Change 2: Hindi Text in Voice Conversation Card

### Current Text
- Heading: "Voice Conversation"
- Subtext: "Speak in English or Hindi for a natural conversation"

### New Text (Bilingual)
- Heading: "Voice Conversation / ध्वनि वार्तालाप"
- Subtext: "Speak in English or Hindi for a natural conversation / अपने प्रश्न अंग्रेजी या हिंदी में पूछें।"

### Implementation
**File: `src/components/chat/InteractionModeSelector.tsx`**

```tsx
<h3 className="font-medium text-base">
  Voice Conversation / ध्वनि वार्तालाप
</h3>
<p className="text-sm text-muted-foreground">
  Speak in English or Hindi for a natural conversation
  <br />
  <span className="text-xs">अपने प्रश्न अंग्रेजी या हिंदी में पूछें।</span>
</p>
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/hooks/useTextAssistant.ts` | **Create** - New hook for text-only ElevenLabs agent |
| `src/components/chat/TextChatDialog.tsx` | **Create** - New text chat UI component |
| `supabase/functions/elevenlabs-conversation-token/index.ts` | **Modify** - Support both text and voice agent IDs |
| `src/components/chat/ChatWidget.tsx` | **Modify** - Import and use TextChatDialog |
| `src/components/chat/InteractionModeSelector.tsx` | **Modify** - Add Hindi text to Voice option |

---

## Technical Details

### useTextAssistant Hook Structure
```typescript
export function useTextAssistant() {
  const conversation = useConversation({
    textOnly: true,
    onMessage: (message) => {
      // Handle agent_response events
    },
    onConnect: () => { /* ... */ },
    onError: (error) => { /* ... */ },
  });

  const connect = async () => {
    const { data } = await supabase.functions.invoke(
      'elevenlabs-conversation-token',
      { body: { agentType: 'text' } }
    );
    await conversation.startSession({ signedUrl: data.signed_url });
  };

  const sendMessage = (text: string) => {
    conversation.sendUserMessage(text);
  };

  return { status, messages, connect, sendMessage, disconnect };
}
```

### Edge Function Update
```typescript
// Parse request body for agentType
const { agentType } = await req.json().catch(() => ({}));

// Select agent ID based on type
const agentId = agentType === 'text' 
  ? 'agent_9301kgp19jzyf72rrtkshfdzbf11' 
  : ELEVENLABS_AGENT_ID;

// Use selected agent ID in API call
const response = await fetch(
  `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
  // ...
);
```

---

## User Experience

### Text Chat Flow (After Change)
1. User opens AI Assistant → Sees mode selection
2. User selects "Text Chat"
3. System connects to ElevenLabs agent (text-only mode)
4. User types message → Agent responds
5. Conversation continues until user closes

### Voice Conversation Card (After Change)
The card will display bilingual text making it clear that Hindi is supported.
