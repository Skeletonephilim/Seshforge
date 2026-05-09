import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { checkAuth } = useAuthStore();
  
  if (!checkAuth()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
