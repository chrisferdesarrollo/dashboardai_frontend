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
    // NO llamar onClose() aquí - queremos mantener el flujo abierto
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Selecciona la Plataforma
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-6">
          <p className="text-center text-muted-foreground text-sm leading-relaxed">
            ¿En qué plataforma quieres crear tu agente?
          </p>
          
          <div className="flex justify-center items-center gap-12 px-4">
            {/* WhatsApp Option */}
            <div
              className="group relative cursor-pointer flex flex-col items-center justify-center
                         transition-all duration-300 ease-in-out
                         hover:scale-110 active:scale-95"
              onClick={() => handlePlatformSelect('whatsapp')}
            >
              <div className="relative h-16 w-16 transition-all duration-300 group-hover:scale-110">
                <WhatsAppIcon className="w-full h-full filter group-hover:brightness-110 
                                       group-hover:drop-shadow-2xl transition-all duration-300" />
                <div className="absolute inset-0 rounded-full bg-green-400/10 scale-0 group-hover:scale-[2] 
                               transition-transform duration-500 ease-out blur-md"></div>
                <div className="absolute inset-0 rounded-full bg-green-400/5 scale-0 group-hover:scale-[3] 
                               transition-transform duration-700 ease-out blur-lg"></div>
              </div>
              <div className="mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out
                             text-sm font-medium text-green-600 dark:text-green-400 transform 
                             translate-y-2 group-hover:translate-y-0">
                WhatsApp
              </div>
            </div>
            
            {/* Telegram Option */}
            <div
              className="group relative cursor-pointer flex flex-col items-center justify-center
                         transition-all duration-300 ease-in-out
                         hover:scale-110 active:scale-95"
              onClick={() => handlePlatformSelect('telegram')}
            >
              <div className="relative h-16 w-16 transition-all duration-300 group-hover:scale-110">
                <TelegramIcon className="w-full h-full filter group-hover:brightness-110 
                                      group-hover:drop-shadow-2xl transition-all duration-300" />
                <div className="absolute inset-0 rounded-full bg-blue-400/10 scale-0 group-hover:scale-[2] 
                               transition-transform duration-500 ease-out blur-md"></div>
                <div className="absolute inset-0 rounded-full bg-blue-400/5 scale-0 group-hover:scale-[3] 
                               transition-transform duration-700 ease-out blur-lg"></div>
              </div>
              <div className="mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out
                             text-sm font-medium text-blue-600 dark:text-blue-400 transform 
                             translate-y-2 group-hover:translate-y-0">
                Telegram
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
