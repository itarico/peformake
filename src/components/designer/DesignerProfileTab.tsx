import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  staffId: string;
}

export default function DesignerProfileTab({ staffId }: Props) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/staff-profile', { replace: true });
  }, [navigate]);

  return null;
}
