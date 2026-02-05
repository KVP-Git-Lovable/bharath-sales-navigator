 import { useConversation } from '@elevenlabs/react';
 import { useState, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 export interface TextMessage {
   role: 'user' | 'assistant';
   content: string;
   timestamp: Date;
 }
 
 export function useTextAssistant() {
   const [isConnecting, setIsConnecting] = useState(false);
   const [messages, setMessages] = useState<TextMessage[]>([]);
   const [error, setError] = useState<string | null>(null);
 
   const conversation = useConversation({
     textOnly: true,
     onConnect: () => {
       console.log('Connected to ElevenLabs text agent');
       setError(null);
     },
     onDisconnect: () => {
       console.log('Disconnected from ElevenLabs text agent');
     },
     onMessage: (message: any) => {
       console.log('Text message:', message);
       
       // Handle agent responses - ElevenLabs sends messages in different formats
       // Format 1: { source: 'ai', role: 'agent', message: '...' }
       // Format 2: { type: 'agent_response', agent_response_event: { agent_response: '...' } }
       
       let agentResponse: string | null = null;
       
       // Check for direct message format (source: 'ai')
       if (message?.source === 'ai' && message?.role === 'agent' && message?.message) {
         agentResponse = message.message;
       }
       // Check for agent_response event format
       else if (message?.type === 'agent_response') {
         agentResponse = message?.agent_response_event?.agent_response;
       }
       // Check for transcript format
       else if (message?.type === 'agent_response_correction') {
         agentResponse = message?.agent_response_correction_event?.corrected_agent_response;
       }
       
       if (agentResponse) {
         setMessages(prev => [...prev, {
           role: 'assistant',
           content: agentResponse,
           timestamp: new Date()
         }]);
       }
     },
     onError: (error) => {
       console.error('Text conversation error:', error);
       setError('Connection error. Please try again.');
       toast.error('Text chat connection failed. Please try again.');
     },
   });
 
   const connect = useCallback(async () => {
     setIsConnecting(true);
     setError(null);
     setMessages([]);
 
     try {
       // Get signed URL from edge function with text agent type
       const { data, error: fnError } = await supabase.functions.invoke(
         'elevenlabs-conversation-token',
         { body: { agentType: 'text' } }
       );
 
       if (fnError) {
         console.error('Token fetch error:', fnError);
         throw new Error('Failed to get connection token');
       }
 
       if (!data?.signed_url) {
         console.error('No signed URL received:', data);
         throw new Error('No connection URL received');
       }
 
       console.log('Starting text session with signed URL');
 
       // Start the conversation with WebSocket
       await conversation.startSession({
         signedUrl: data.signed_url,
       });
 
     } catch (err) {
       console.error('Failed to start text conversation:', err);
       
       if (err instanceof Error) {
         setError(err.message);
         toast.error(err.message);
       } else {
         setError('Failed to connect. Please try again.');
         toast.error('Failed to start text conversation');
       }
     } finally {
       setIsConnecting(false);
     }
   }, [conversation]);
 
   const sendMessage = useCallback((text: string) => {
     if (!text.trim()) return;
     
     // Add user message to the list
     setMessages(prev => [...prev, {
       role: 'user',
       content: text.trim(),
       timestamp: new Date()
     }]);
     
     // Send to the agent
     conversation.sendUserMessage(text.trim());
   }, [conversation]);
 
   const disconnect = useCallback(async () => {
     try {
       await conversation.endSession();
     } catch (err) {
       console.error('Error ending conversation:', err);
     }
   }, [conversation]);
 
   return {
     status: conversation.status,
     isConnecting,
     messages,
     error,
     connect,
     sendMessage,
     disconnect,
   };
 }