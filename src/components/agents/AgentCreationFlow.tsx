import { useState, useEffect, useCallback } from 'react';
import { Agent, PlatformType } from '@/types/agent';
import { PlatformSelectionModal } from './PlatformSelectionModal';
import { WhatsAppAgentModal } from './WhatsAppAgentModal';
import { TelegramAgentModal } from './TelegramAgentModal';

interface AgentCreationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  agent?: Agent | null;
}

type FlowStep = 'platform-selection' | 'whatsapp-form' | 'telegram-form';

export function AgentCreationFlow({ isOpen, onClose, agent }: AgentCreationFlowProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('platform-selection');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(null);

  // Si estamos editando un agente existente, ir directamente al formulario correspondiente
  useEffect(() => {
    if (isOpen) {
      if (agent) {
        setCurrentStep(agent.platform === 'whatsapp' ? 'whatsapp-form' : 'telegram-form');
        setSelectedPlatform(agent.platform);
      } else {
        setCurrentStep('platform-selection');
        setSelectedPlatform(null);
      }
    }
  }, [isOpen, agent]);

  const handleClose = useCallback(() => {
    setCurrentStep('platform-selection');
    setSelectedPlatform(null);
    onClose();
  }, [onClose]);

  const handlePlatformSelect = (platform: PlatformType) => {
    setSelectedPlatform(platform);
    setCurrentStep(platform === 'whatsapp' ? 'whatsapp-form' : 'telegram-form');
  };

  const handleBackToPlatformSelection = useCallback(() => {
    setCurrentStep('platform-selection');
    setSelectedPlatform(null);
  }, []);

  return (
    <>
      {/* Modal de selección de plataforma */}
      {!agent && (
        <PlatformSelectionModal
          isOpen={isOpen && currentStep === 'platform-selection'}
          onClose={handleClose}
          onSelectPlatform={handlePlatformSelect}
        />
      )}

      {/* Modal de formulario WhatsApp */}
      <WhatsAppAgentModal
        isOpen={isOpen && currentStep === 'whatsapp-form'}
        onClose={handleClose}
        onBack={agent ? handleClose : handleBackToPlatformSelection}
        agent={agent && agent.platform === 'whatsapp' ? agent : null}
      />

      {/* Modal de formulario Telegram */}
      <TelegramAgentModal
        isOpen={isOpen && currentStep === 'telegram-form'}
        onClose={handleClose}
        onBack={agent ? handleClose : handleBackToPlatformSelection}
        agent={agent && agent.platform === 'telegram' ? agent : null}
      />
    </>
  );
}
