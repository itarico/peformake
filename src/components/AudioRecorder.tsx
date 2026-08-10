import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Trash2, Play, Pause, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AudioRecorderProps {
  onUpload: (url: string | null) => void;
  currentUrl?: string | null;
  bucket?: string;
  folder?: string;
}

export function AudioRecorder({ 
  onUpload, 
  currentUrl, 
  bucket = 'reference-images', 
  folder = 'audios' 
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(currentUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setAudioUrl(currentUrl || null);
  }, [currentUrl]);

  const getMimeType = () => {
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    return 'audio/ogg';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        await uploadAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (blob: Blob) => {
    setIsUploading(true);
    try {
      const extension = blob.type.split('/')[1].split(';')[0];
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setAudioUrl(publicUrl);
      onUpload(publicUrl);
      toast.success('Áudio enviado!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar áudio.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAudioUrl(null);
    onUpload(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlayback = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Playback error:', err);
        toast.error('Erro ao reproduzir áudio.');
      });
    }
    setIsPlaying(!isPlaying);
  };

  if (isUploading) {
    return (
      <Button variant="ghost" size="icon" disabled className="h-8 w-8 rounded-full">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {!audioUrl && !isRecording && (
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          onClick={startRecording}
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
          title="Gravar áudio"
        >
          <Mic className="h-4 w-4" />
        </Button>
      )}

      {isRecording && (
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          onClick={stopRecording}
          className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-full animate-pulse"
          title="Parar gravação"
        >
          <Square className="h-4 w-4 fill-current" />
        </Button>
      )}

      {audioUrl && !isRecording && (
        <>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={togglePlayback}
            className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
            title={isPlaying ? "Pausar" : "Ouvir"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={removeAudio}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
            title="Remover áudio"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}