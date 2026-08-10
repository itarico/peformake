import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileImage, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
}

interface MetricsUploadPanelProps {
  instanceId: string;
  questions: Question[];
  onDataExtracted: (data: Record<string, string>) => void;
}

export function MetricsUploadPanel({
  instanceId,
  questions,
  onDataExtracted,
}: MetricsUploadPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Record<string, string> | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAndExtractMutation = useMutation({
    mutationFn: async (file: File) => {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${instanceId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('consulting-files')
        .upload(fileName, file);

      if (uploadError) throw new Error('Failed to upload file');

      const isPdf = file.type === 'application/pdf';

      // Call extraction function with file_path for signed URL generation
      const response = await supabase.functions.invoke('consulting-extract-metrics', {
        body: {
          file_path: fileName,
          file_type: isPdf ? 'pdf' : 'image',
          instance_id: instanceId,
          questions: questions.map(q => ({ id: q.id, question_text: q.question_text })),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to extract metrics');
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data.extracted_data) {
        setExtractedData(data.extracted_data);
        setConfidence(data.confidence);
        setNotes(data.notes);
        toast.success('Dados extraídos com sucesso!');
      }
    },
    onError: (error) => {
      console.error('Extraction error:', error);
      toast.error('Erro ao extrair dados. Tente novamente.');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Formato não suportado. Use PNG, JPG, WEBP ou PDF.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB.');
        return;
      }

      setSelectedFile(file);
      setExtractedData(null);
      setConfidence(null);
      setNotes(null);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setConfidence(null);
    setNotes(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExtract = () => {
    if (selectedFile) {
      uploadAndExtractMutation.mutate(selectedFile);
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
    }
  };

  const getConfidenceBadge = () => {
    if (!confidence) return null;
    const variants: Record<string, { color: string; label: string }> = {
      high: { color: 'bg-green-500', label: 'Alta Confiança' },
      medium: { color: 'bg-yellow-500', label: 'Média Confiança' },
      low: { color: 'bg-red-500', label: 'Baixa Confiança' },
    };
    const variant = variants[confidence] || variants.medium;
    return (
      <Badge className={variant.color}>
        {variant.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-1">
            Clique para fazer upload ou arraste o arquivo
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WEBP ou PDF (máx. 10MB)
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileImage className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>

                {!extractedData && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleExtract}
                      disabled={uploadAndExtractMutation.isPending}
                    >
                      {uploadAndExtractMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Extraindo...
                        </>
                      ) : (
                        'Extrair Dados'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRemoveFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Data */}
      {extractedData && (
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="font-medium">Dados Extraídos</span>
              </div>
              {getConfidenceBadge()}
            </div>

            <div className="space-y-2 mb-4">
              {Object.entries(extractedData).map(([questionId, value]) => {
                const question = questions.find(q => q.id === questionId);
                return (
                  <div key={questionId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">
                      {question?.question_text || questionId}:
                    </span>
                    <span className="font-medium">{value}</span>
                  </div>
                );
              })}
            </div>

            {notes && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4 p-2 bg-muted rounded">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{notes}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleApply} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Aplicar Dados
              </Button>
              <Button variant="outline" onClick={handleRemoveFile}>
                Novo Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
