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
import { Agent } from "@/types/agent";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteAgentDialogProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteAgentDialog({
  agent,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteAgentDialogProps) {
  if (!agent) return null;

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
                Eliminar Agente
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
                  ¿Estás seguro de que quieres eliminar el agente?
                </p>
                <div className="bg-background rounded border p-3">
                  <p className="font-semibold text-sm">{agent.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {agent.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      agent.platform === 'whatsapp' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {agent.platform === 'whatsapp' ? '📱 WhatsApp' : '🤖 Telegram'}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      agent.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : agent.status === 'inactive'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {agent.status === 'active' ? '🟢 Activo' : 
                       agent.status === 'inactive' ? '⚪ Inactivo' : '🔴 Error'}
                    </span>
                  </div>
                </div>
                <p className="text-destructive text-sm">
                  Se eliminará permanentemente de la base de datos y se detendrán todos los workflows asociados.
                  {agent.platform === 'whatsapp' && (
                    <span className="block mt-1 font-medium">
                      ⚠️ También se eliminará la sesión de WhatsApp en Evolution API.
                    </span>
                  )}
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
                Eliminar Agente
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
