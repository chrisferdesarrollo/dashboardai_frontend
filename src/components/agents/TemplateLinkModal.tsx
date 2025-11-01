import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TelegramIcon, WhatsAppIcon } from '@/components/ui/platform-icons';
import { Link as LinkIcon, MessageCircle } from 'lucide-react';
import { AgentTemplate } from '@/services/agentTemplateApi';

interface TemplateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: AgentTemplate | null;
  onSelectPlatform: (platform: 'telegram' | 'whatsapp', template: AgentTemplate) => void;
}

export function TemplateLinkModal({ 
  isOpen, 
  onClose, 
  template,
  onSelectPlatform 
}: TemplateLinkModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<'telegram' | 'whatsapp' | null>(null);

  const handlePlatformSelect = (platform: 'telegram' | 'whatsapp') => {
    if (template) {
      setSelectedPlatform(platform);
      onSelectPlatform(platform, template);
    }
  };

  const handleClose = () => {
    setSelectedPlatform(null);
    onClose();
  };

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Vincular Template a Mensajería
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Selecciona la plataforma donde deseas crear un agente usando el template <span className="font-semibold">"{template.name}"</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información del Template - Compacta */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-xs">
            <div className="font-semibold text-sm mb-1">Template Seleccionado</div>
            <div>
              <span className="font-medium">Nombre:</span> {template.name}
            </div>
            {template.description && (
              <div>
                <span className="font-medium">Descripción:</span> {template.description}
              </div>
            )}
            {template.knowledgeBaseName && (
              <div>
                <span className="font-medium">Base de Conocimiento:</span> {template.knowledgeBaseName}
              </div>
            )}
          </div>

          {/* Selección de Plataforma - Estilo compacto */}
          <div className="flex justify-center items-center gap-8 py-4">
            {/* WhatsApp */}
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
              </div>
              <div className="mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out
                             text-sm font-medium text-green-600 dark:text-green-400 transform 
                             translate-y-2 group-hover:translate-y-0">
                WhatsApp
              </div>
            </div>
            
            {/* Telegram */}
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
              </div>
              <div className="mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out
                             text-sm font-medium text-blue-600 dark:text-blue-400 transform 
                             translate-y-2 group-hover:translate-y-0">
                Telegram
              </div>
            </div>
          </div>

          {/* Nota informativa - Compacta */}
          <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/10 p-2.5 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="font-semibold mb-0.5">💡 Nota:</p>
            <p>
              El prompt del sistema, descripción y base de conocimiento del template se copiarán automáticamente.
            </p>
          </div>
        </div>

        <div className="flex justify-center pb-2">
          <Button variant="outline" onClick={handleClose} size="sm">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
