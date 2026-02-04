import { memo } from 'react';
import { MessageCircle, Mic } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface InteractionModeSelectorProps {
  onSelectText: () => void;
  onSelectVoice: () => void;
}

export const InteractionModeSelector = memo(({ onSelectText, onSelectVoice }: InteractionModeSelectorProps) => {
  return (
    <div className="flex flex-col h-full">
      <DialogHeader className="p-4 pb-2">
        <DialogTitle className="text-center text-lg font-semibold">
          Choose how to interact
        </DialogTitle>
        <DialogDescription className="text-center text-sm text-muted-foreground">
          Select your preferred way to communicate with the AI Assistant
        </DialogDescription>
      </DialogHeader>
      
      <div className="flex-1 flex flex-col gap-4 p-4 pt-2 justify-center">
        {/* Text Chat Option */}
        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-md transition-all group"
          onClick={onSelectText}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-base">Text Chat</h3>
              <p className="text-sm text-muted-foreground">
                Type your questions and get instant responses
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Voice Conversation Option */}
        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-md transition-all group"
          onClick={onSelectVoice}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-base">Voice Conversation</h3>
              <p className="text-sm text-muted-foreground">
                Speak in English or Hindi for a natural conversation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

InteractionModeSelector.displayName = 'InteractionModeSelector';
