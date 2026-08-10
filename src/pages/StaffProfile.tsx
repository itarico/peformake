import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Upload, User, CreditCard } from 'lucide-react';

export default function StaffProfile() {
  const { staffMember } = useStaffAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAgency, setBankAgency] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['staff-profile-full', staffMember?.id],
    queryFn: async () => {
      const { data, error } = await invokeWithAuth('staff-profile', { action: 'get' });
      if (error) throw error;
      return (data as any)?.profile;
    },
    enabled: !!staffMember,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || staffMember?.full_name || '');
      setEmail(profile.email || staffMember?.email || '');
      setPhone(profile.phone || staffMember?.phone || '');
      setAvatarUrl(profile.avatar_url || '');
      setPixKey(profile.pix_key || '');
      setBankName(profile.bank_name || '');
      setBankAgency(profile.bank_agency || '');
      setBankAccount(profile.bank_account || '');
    } else {
      setFullName(staffMember?.full_name || '');
      setEmail(staffMember?.email || '');
      setPhone(staffMember?.phone || '');
    }
  }, [profile, staffMember]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await invokeWithAuth('staff-profile', {
        action: 'update',
        updates: {
          full_name: fullName,
          email,
          phone,
          avatar_url: avatarUrl,
          pix_key: pixKey,
          bank_name: bankName,
          bank_agency: bankAgency,
          bank_account: bankAccount,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      toast.success('Perfil salvo!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!staffMember) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Faça login para acessar o perfil.</p>
      </div>
    );
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `staff/${staffMember.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast.success('Foto atualizada!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <span>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Trocar foto
                  </span>
                </Button>
              </Label>
              <input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome completo</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Dados Bancários
          </CardTitle>
          <CardDescription>Para recebimento de pagamentos e comissões</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Chave PIX</Label>
            <Input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Banco</Label>
              <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Ex: Nubank" />
            </div>
            <div>
              <Label>Agência</Label>
              <Input value={bankAgency} onChange={e => setBankAgency(e.target.value)} />
            </div>
            <div>
              <Label>Conta</Label>
              <Input value={bankAccount} onChange={e => setBankAccount(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
        {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Salvar Perfil
      </Button>

    </div>
  );
}
