import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect to main login - this page is deprecated
export default function StaffLogin() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/login', { replace: true }); }, [navigate]);
  return null;
}
