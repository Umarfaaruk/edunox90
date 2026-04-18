import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-3 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading admin access...</p>
        </div>
      </div>
    );
  }

  // Free-tier fallback: treat any signed-in user as admin until role system is added.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
