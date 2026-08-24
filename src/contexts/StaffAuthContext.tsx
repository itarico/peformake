import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';
import { normalizeRoles } from '@/lib/staffRoles';

interface StaffMember {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: AppRole;
  roles: AppRole[];
  cost_per_art: number;
  is_active: boolean;
  has_password_login: boolean;
}

interface StaffAuthContextType {
  staffMember: StaffMember | null;
  isLoading: boolean;
  isAdmin: boolean;
  isLeader: boolean;
  isSocialMedia: boolean;
  isDesigner: boolean;
  isSDR: boolean;
  isCloser: boolean;
  isVideomaker: boolean;
  isEditor: boolean;
  isHeadMarketing: boolean;
  isFinanceEllcazo: boolean;
  isAudiovisualFull: boolean;
  isEllcazo: boolean;
  isStaff: boolean;
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
  staffSignIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  staffSignOut: () => void;
}

const StaffAuthContext = createContext<StaffAuthContextType | null>(null);

/**
 * Normaliza por alias (ex: 'video' -> 'videomaker') — cargos atribuídos direto no banco, fora da
 * tela de atribuição, às vezes usaram valores que não batem com o que o código espera. Ver
 * src/lib/staffRoles.ts.
 */
function deriveRoles(staff: StaffMember): AppRole[] {
  const raw = staff.roles && staff.roles.length > 0 ? staff.roles : [staff.role];
  return normalizeRoles(raw);
}

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);

  useEffect(() => {
    const storedStaff = localStorage.getItem('staff_session_id');
    if (storedStaff) {
      verifyStaff(storedStaff);
    } else {
      setIsLoading(false);
    }

    // Heartbeat mechanism for real-time presence
    const heartbeat = setInterval(async () => {
      const staffId = localStorage.getItem('staff_session_id');
      if (staffId) {
        await supabase
          .from('staff_members')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', staffId);
      }
    }, 60000); // Every minute

    return () => clearInterval(heartbeat);
  }, []);

  useEffect(() => {
    if (!staffMember) {
      setActiveRoleState(null);
      return;
    }
    const roles = deriveRoles(staffMember);
    const storedRaw = localStorage.getItem('staff_active_role');
    const stored = storedRaw ? normalizeRoles([storedRaw])[0] : null;
    if (stored && roles.includes(stored)) {
      setActiveRoleState(stored);
    } else {
      setActiveRoleState(roles[0]);
    }
  }, [staffMember]);

  const setActiveRole = (role: AppRole) => {
    setActiveRoleState(role);
    localStorage.setItem('staff_active_role', role);
  };

  const verifyStaff = async (staffId: string) => {
    try {
      const { data, error } = await supabase.rpc('verify_staff_session', {
        p_staff_id: staffId,
      });

      if (error || !data || !(data as any).valid) {
        localStorage.removeItem('staff_session_id');
        setStaffMember(null);
      } else {
        const raw = (data as any).staff;
        const staff: StaffMember = {
          ...raw,
          roles: raw.roles && Array.isArray(raw.roles) ? raw.roles : [raw.role],
        };
        setStaffMember(staff);
      }
    } catch {
      localStorage.removeItem('staff_session_id');
      setStaffMember(null);
    } finally {
      setIsLoading(false);
    }
  };

  const staffSignIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc('authenticate_staff_by_email', {
        p_email: email,
        p_password: password,
      });

      if (error) throw error;

      const result = data as any;

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const raw = result.staff;
      const staff: StaffMember = {
        ...raw,
        roles: raw.roles && Array.isArray(raw.roles) ? raw.roles : [raw.role],
      };
      setStaffMember(staff);
      localStorage.setItem('staff_session_id', staff.id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const staffSignOut = () => {
    localStorage.removeItem('staff_session_id');
    localStorage.removeItem('staff_active_role');
    setStaffMember(null);
    setActiveRoleState(null);
  };

  const roles = staffMember ? deriveRoles(staffMember) : [];
  const effectiveRole = activeRole || (roles.length > 0 ? roles[0] : null);

  const isAdmin = roles.includes('admin') || effectiveRole === 'admin';
  const isLeader = roles.includes('leader') || effectiveRole === 'leader';
  const isSocialMedia = roles.includes('social_media') || effectiveRole === 'social_media';
  const isDesigner = roles.includes('designer') || effectiveRole === 'designer';
  const isSDR = roles.includes('sdr') || effectiveRole === 'sdr';
  const isCloser = roles.includes('closer') || effectiveRole === 'closer';
  const isVideomaker = roles.includes('videomaker') || effectiveRole === 'videomaker';
  const isEditor = roles.includes('editor') || effectiveRole === 'editor';
  const isHeadMarketing = roles.includes('head_marketing') || effectiveRole === 'head_marketing';
  const isFinanceEllcazo = roles.includes('finance_ellcazo') || effectiveRole === 'finance_ellcazo';
  const isAudiovisualFull = roles.includes('audiovisual_full') || effectiveRole === 'audiovisual_full';
  // Perfil dedicado da produtora Ellcazo (braço da Peformake): Audiovisual + Financeiro Ellcazo.
  const isEllcazo = roles.includes('ellcazo') || effectiveRole === 'ellcazo';
  const isStaff = !!staffMember;

  return (
    <StaffAuthContext.Provider
      value={{
        staffMember,
        isLoading,
        isAdmin,
        isLeader,
        isSocialMedia,
        isDesigner,
        isSDR,
        isCloser,
        isVideomaker,
        isEditor,
        isHeadMarketing,
        isFinanceEllcazo,
        isAudiovisualFull,
        isEllcazo,
        isStaff,
        activeRole: effectiveRole,
        setActiveRole,
        staffSignIn,
        staffSignOut,
      }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (!context) {
    throw new Error('useStaffAuth must be used within a StaffAuthProvider');
  }
  return context;
}