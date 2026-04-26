import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Simple Pricing</h1>
        <p className="text-muted-foreground">
          This project currently runs on a free-first model. You can keep all core learning features enabled
          at zero cost using Firebase Spark + Vercel free tier.
        </p>

        <div className="rounded-xl border border-border p-6 bg-card space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Free Plan</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Study timer with day-wise records
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Weekly and monthly performance tracking
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Firebase Auth and Firestore backend
            </li>
          </ul>
          <Button asChild>
            <Link to="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
