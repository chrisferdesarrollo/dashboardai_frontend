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
import { DocumentResponse } from "@/services/documentApi";
import { AgentResponse } from "@/services/agentApi";
import { Trash2, AlertTriangle, FileText, Tag, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DeleteDocumentDialogProps {
  document: DocumentResponse | null;
  agent: AgentResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteDocumentDialog({
  document,
  agent,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteDocumentDialogProps) {
  if (!document) return null;

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
                Eliminar Documento
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
                  ¿Estás seguro de que quieres eliminar este documento?
                </p>
                <div className="bg-background rounded border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="font-semibold text-sm">{document.name}</p>
                  </div>
                  
                  {document.description && (
                    <p className="text-muted-foreground text-xs mb-2">
                      {document.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-2">
                    {document.tags && document.tags.length > 0 && (
                      <>
                        {document.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {document.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{document.tags.length - 2} más
                          </Badge>
                        )}
                      </>
                    )}
                  </div>

                  {agent && (
                    <div className="flex items-center gap-2">
                      <Bot className="h-3 w-3 text-blue-600" />
                      <span className="text-xs text-muted-foreground">
                        Usado por: <span className="font-medium">{agent.name}</span>
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    Subido el {new Date(document.uploadDate).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <p className="text-destructive text-sm">
                  Se eliminará permanentemente del sistema y se removerá de la base de conocimientos vectorizada.
                  {agent && (
                    <span className="block mt-1 font-medium">
                      ⚠️ El agente "{agent.name}" ya no tendrá acceso a este documento.
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
                Eliminar Documento
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
