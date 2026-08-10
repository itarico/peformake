import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, X, Loader2, Image as ImageIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiImageUploadProps {
  bucket: 'reference-images' | 'final-arts' | 'client-logos' | 'avatars' | 'portfolio-media';
  folder: string;
  currentUrls?: string[] | null;
  onUpload: (urls: string[]) => void;
  className?: string;
  disabled?: boolean;
  maxImages?: number;
}

export function MultiImageUpload({
  bucket,
  folder,
  currentUrls,
  onUpload,
  className,
  disabled = false,
}: MultiImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const images = currentUrls || [];

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages = [...images];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`Arquivo ${file.name} não é uma imagem`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`A imagem ${file.name} deve ter no máximo 5MB`);
          continue;
        }

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

        newImages.push(urlData.publicUrl);
      }

      onUpload(newImages);

      toast.success('Imagens enviadas com sucesso!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar imagem: ' + error.message);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (index: number) => {
    const imageUrl = images[index];
    const newImages = images.filter((_, i) => i !== index);

    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/storage/v1/object/public/')[1];
      if (pathParts) {
        const [bucketName, ...filePath] = pathParts.split('/');
        await supabase.storage.from(bucketName).remove([filePath.join('/')]);
      }
    } catch (error) {
      console.error('Error removing file:', error);
    }

    onUpload(newImages);

  };

  return (
    <div className={cn('space-y-4', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => (
          <div key={index} className="relative group h-16 w-16">
            <img
              src={url}
              alt={`Preview ${index + 1}`}
              className="w-full h-full object-cover rounded-md border"
            />
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full shadow-md z-20"
                onClick={() => handleRemove(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        
        {!disabled && (
          <button
            type="button"
            className={cn(
              'flex items-center justify-center h-16 w-16 border-2 border-dashed rounded-md cursor-pointer transition-colors shrink-0',
              isUploading ? 'bg-muted cursor-not-allowed' : 'hover:bg-accent hover:border-primary'
            )}
            onClick={() => !isUploading && inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Plus className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {images.length === 0 && !isUploading && !disabled && (
        <p className="text-[10px] text-muted-foreground italic">Nenhuma imagem de referência enviada</p>
      )}
    </div>
  );
}
