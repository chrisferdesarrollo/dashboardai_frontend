import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon, TelegramIcon } from '@/components/ui/platform-icons';
import { PlatformType } from '@/types/agent';

interface PlatformSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlatform: (platform: PlatformType) => void;
}

export function PlatformSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectPlatform 
}: PlatformSelectionModalProps) {
  const handlePlatformSelect = (platform: PlatformType) => {
    onSelectPlatform(platform);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Selecciona la Plataforma
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-6">
          <p className="text-center text-muted-foreground mb-6">
            ¿En qué plataforma quieres crear tu agente?
          </p>
          
          <div className="flex justify-center items-center gap-6 px-4">
            {/* WhatsApp Option */}
            <Button
              variant="outline"
              className="aspect-square h-20 w-20 flex items-center justify-center hover:bg-green-50 hover:border-green-300 transition-colors rounded-xl p-2"
              onClick={() => handlePlatformSelect('whatsapp')}
            >
              <WhatsAppIcon className="w-full h-full" />
            </Button>
            
            {/* Telegram Option */}
            <Button
              variant="outline"
              className="aspect-square h-20 w-20 flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 transition-colors rounded-xl p-2"
              onClick={() => handlePlatformSelect('telegram')}
            >
              <TelegramIcon className="w-full h-full" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
