import { useState, memo, useCallback } from 'react';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatDialog } from './ChatDialog';
import { InteractionModeSelector } from './InteractionModeSelector';
import { VoiceConversationDialog } from './VoiceConversationDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type InteractionMode = 'selecting' | 'text' | 'voice';

export const ChatWidget = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<InteractionMode>('selecting');
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  const handleOpen = useCallback(() => {
    setMode('selecting');
    setIsOpen(true);
  }, []);
  
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setMode('selecting');
  }, []);

  const handleSelectText = useCallback(() => setMode('text'), []);
  const handleSelectVoice = useCallback(() => setMode('voice'), []);
  const handleBack = useCallback(() => setMode('selecting'), []);

  // Don't render chat widget if user is not logged in
  if (!user) {
    return null;
  }

  const getTitle = () => {
    switch (mode) {
      case 'text': return 'Text Chat';
      case 'voice': return 'Voice Assistant';
      default: return 'AI Assistant';
    }
  };

  const renderContent = () => {
    switch (mode) {
      case 'text':
        return <ChatDialog onClose={handleClose} />;
      case 'voice':
        return <VoiceConversationDialog onClose={handleClose} />;
      default:
        return (
          <InteractionModeSelector 
            onSelectText={handleSelectText} 
            onSelectVoice={handleSelectVoice} 
          />
        );
    }
  };

  const renderHeader = () => (
    <div className="flex items-center gap-2">
      {mode !== 'selecting' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      <MessageCircle className="h-5 w-5" />
      {getTitle()}
    </div>
  );

  return (
    <>
      {/* Floating Chat Button - respects safe area bottom */}
      {!isOpen && (
        <Button
          onClick={handleOpen}
          className="fixed right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
          style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Mobile: Drawer from bottom */}
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="h-[85vh] max-h-[85vh]">
            <DrawerHeader className="border-b bg-primary text-primary-foreground">
              <DrawerTitle className="flex items-center gap-2">
                {renderHeader()}
              </DrawerTitle>
            </DrawerHeader>
            {renderContent()}
          </DrawerContent>
        </Drawer>
      ) : (
        /* Desktop: Sheet from right */
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="right" className="w-[400px] sm:w-[500px] p-0 flex flex-col">
            <SheetHeader className="border-b bg-primary text-primary-foreground p-4">
              <SheetTitle className="flex items-center gap-2 text-primary-foreground">
                {renderHeader()}
              </SheetTitle>
            </SheetHeader>
            {renderContent()}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
});

ChatWidget.displayName = 'ChatWidget';