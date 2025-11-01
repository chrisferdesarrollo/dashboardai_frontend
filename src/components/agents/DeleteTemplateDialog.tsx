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
import { AgentTemplate } from "@/services/agentTemplateApi";
import { Trash2, AlertTriangle, FileText } from "lucide-react";

interface DeleteTemplateDialogProps {
  template: AgentTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteTemplateDialog({
  template,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteTemplateDialogProps) {
  if (!template) return null;

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
                Eliminar Template
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
                  ¿Estás seguro de que quieres eliminar este template?
                </p>
                <div className="bg-background rounded border p-3">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">{template.name}</p>
                      {template.description && (
                        <p className="text-muted-foreground text-xs mt-1">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {template.knowledgeBaseName && (
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                            📚 {template.knowledgeBaseName}
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                          {template.usageCount} {template.usageCount === 1 ? 'uso' : 'usos'}
                        </span>
                        {template.isActive && (
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                            🟢 Activo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-destructive text-sm">
                  Se eliminará permanentemente de la base de datos.
                  {template.usageCount > 0 && (
                    <span className="block mt-1 font-medium">
                      ⚠️ Este template ha sido usado {template.usageCount} {template.usageCount === 1 ? 'vez' : 'veces'}.
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
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isDeleting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar Template
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
