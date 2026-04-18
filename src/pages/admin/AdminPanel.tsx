import { ShieldCheck } from "lucide-react";

const AdminPanel = () => {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-4">
      <div className="inline-flex h-12 w-12 rounded-2xl bg-primary/10 items-center justify-center">
        <ShieldCheck className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Admin Panel</h1>
      <p className="text-sm text-muted-foreground">
        Admin tools are enabled. This starter screen keeps routing/build stable and can be extended with
        role-based analytics, parent controls, and moderation actions.
      </p>
    </div>
  );
};

export default AdminPanel;
