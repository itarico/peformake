import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, X, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  bucket: 'reference-images' | 'final-arts' | 'client-logos' | 'avatars' | 'portfolio-media' | 'client-contracts';
  folder: string;
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  className?: string;
  disabled?: boolean;
  accept?: string;
  label?: string;
}

export function FileUpload({
  bucket,
  folder,
  currentUrl,
  onUpload,
  onRemove,
  className,
  disabled = false,
  accept = "image/*,application/pdf",
  label = "Clique para enviar",
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB for contracts, 5MB for images)
    const maxSize = bucket === 'client-contracts' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`O arquivo deve ter no máximo ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;
      setPreviewUrl(publicUrl);
      onUpload(publicUrl);
      toast.success('Arquivo enviado com sucesso!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar arquivo: ' + error.message);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!previewUrl || !onRemove) return;

    try {
      // Extract path from URL
      const url = new URL(previewUrl);
      const storagePrefix = '/storage/v1/object/public/';
      if (url.pathname.includes(storagePrefix)) {
        const pathParts = url.pathname.split(storagePrefix)[1];
        if (pathParts) {
          const [bucketName, ...filePath] = pathParts.split('/');
          await supabase.storage.from(bucketName).remove([filePath.join('/')]);
        }
      }
    } catch (error) {
      console.error('Error removing file:', error);
    }

    setPreviewUrl(null);
    onRemove();
  };

  const isImage = previewUrl && (previewUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) || previewUrl.includes('client-logos') || previewUrl.includes('avatars'));

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {previewUrl ? (
        <div className="relative group">
          {isImage ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-32 object-contain rounded-lg border bg-muted/20"
            />
          ) : (
            <div className="w-full h-32 flex flex-col items-center justify-center rounded-lg border bg-muted/20">
              <FileText className="h-10 w-10 text-primary mb-2" />
              <p className="text-xs font-medium truncate max-w-[150px]">Contrato PDF</p>
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-[10px]" 
                onClick={() => window.open(previewUrl, '_blank')}
              >
                Visualizar
              </Button>
            </div>
          )}
          {onRemove && !disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
            disabled
              ? 'bg-muted cursor-not-allowed'
              : 'hover:bg-accent hover:border-primary',
            isUploading && 'pointer-events-none'
          )}
          onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
              <p className="text-[10px] text-muted-foreground">Enviando...</p>
            </>
          ) : (
            <>
              {bucket === 'client-contracts' ? <FileText className="h-6 w-6 text-muted-foreground mb-2" /> : <ImageIcon className="h-6 w-6 text-muted-foreground mb-2" />}
              <p className="text-[10px] text-muted-foreground font-semibold">
                {label}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
