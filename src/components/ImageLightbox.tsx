import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, Edit2 } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
  onEdit?: () => void;
  onDownload?: () => void;
  showEditButton?: boolean;
}

export function ImageLightbox({
  imageUrl,
  isOpen,
  onClose,
  alt = 'Image',
  onEdit,
  onDownload,
  showEditButton = false,
}: ImageLightboxProps) {
  if (!imageUrl) return null;

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-sm">
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Image */}
          <div className="flex items-center justify-center p-4 min-h-[300px] max-h-[80vh]">
            <img
              src={imageUrl}
              alt={alt}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 p-4 border-t bg-background/80">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Baixar
            </Button>
            {showEditButton && onEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Edit2 className="mr-2 h-4 w-4" />
                Trocar Imagem
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
