import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Conversation } from "@/types/conversation";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteConversationDialogProps {
  conversation: Conversation | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteConversationDialog({
  conversation,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteConversationDialogProps) {
  if (!conversation) return null;

  const platformLabel = conversation.platform === 'whatsapp' ? 'WhatsApp' : 'Telegram';
  const platformIcon = conversation.platform === 'whatsapp' ? '📱' : '🤖';

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">
                Eliminar Conversación
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left text-sm">
                Esta acción no se puede deshacer
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-sm">
                  ¿Estás seguro de que quieres eliminar esta conversación?
                </p>
                <div className="bg-background rounded border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{platformIcon}</span>
                    <div>
                      <p className="font-semibold text-sm">{conversation.contact.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {conversation.contact.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      conversation.platform === 'whatsapp' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {platformIcon} {platformLabel}
                    </span>
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                      {conversation.totalMessages} mensajes
                    </span>
                  </div>
                </div>
                <p className="text-destructive text-sm">
                  Se eliminarán permanentemente todos los mensajes de esta conversación ({conversation.totalMessages} mensajes).
                  <span className="block mt-1 font-medium">
                    ⚠️ Los registros se eliminarán de la base de datos y no se podrán recuperar.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel 
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Conversación
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
