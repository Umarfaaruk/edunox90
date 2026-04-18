import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, User, LogOut, Shield, CreditCard, Puzzle, Bot } from "lucide-react";

const tabs = [
  { key: "profile", icon: User, label: "Profile" },
  { key: "notifications", icon: Bell, label: "Notifications" },
  { key: "security", icon: Shield, label: "Security" },
  { key: "integrations", icon: Puzzle, label: "Integrations" },
];

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john@example.com");
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [notifications, setNotifications] = useState({ email: true, push: true, streak: true });
  const [tutorTone, setTutorTone] = useState<"academic" | "friendly" | "direct">("academic");
  const [socraticMethod, setSocraticMethod] = useState(true);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>›</span>
        <span className="text-foreground font-medium">Settings</span>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-8">
        {/* Left sidebar nav */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Settings</h2>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "text-accent bg-accent/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Plan badge */}
          <div className="bg-accent text-accent-foreground rounded-xl p-4 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider">Current Plan</div>
            <div className="text-lg font-bold">Vistar Pro</div>
            <p className="text-xs opacity-80">Unlimited AI tutors & detailed progress analytics.</p>
            <Button size="sm" className="w-full bg-white/20 hover:bg-white/30 text-white text-xs mt-2">
              Manage Billing
            </Button>
          </div>
        </div>

        {/* Right content area */}
        <div className="space-y-6">
          {activeTab === "profile" && (
            <>
              {/* Personal Information */}
              <div className="bg-card border border-border rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <h3 className="font-bold text-foreground">Personal Information</h3>
                  <button className="text-xs text-accent hover:underline font-medium">Edit Profile</button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">University / School</label>
                    <Input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="Enter university" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Major</label>
                    <Input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Enter major" className="h-10" />
                  </div>
                </div>
              </div>

              {/* AI Tutor Preferences */}
              <div className="bg-card border border-border rounded-xl p-6 space-y-5">
                <h3 className="font-bold text-foreground pb-4 border-b border-border">AI Tutor Preferences</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-accent" />
                    <div>
                      <div className="text-sm font-medium text-foreground">Socratic Method</div>
                      <div className="text-xs text-muted-foreground">AI will guide you with questions instead of giving answers directly.</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSocraticMethod(!socraticMethod)}
                    className={`h-6 w-11 rounded-full transition-colors flex-shrink-0 ${
                      socraticMethod ? "bg-accent" : "bg-muted"
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-card shadow transition-transform ${
                      socraticMethod ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Tutor Personality Tone</div>
                  <div className="grid grid-cols-3 gap-3">
                    {(["academic", "friendly", "direct"] as const).map((tone) => (
                      <button
                        key={tone}
                        onClick={() => setTutorTone(tone)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
                          tutorTone === tone
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-muted-foreground hover:border-accent/30"
                        }`}
                      >
                        {tone === "academic" ? "✦ Academic" : tone === "friendly" ? "☺ Friendly" : "✦ Direct"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center justify-between">
                <button className="text-sm text-destructive hover:underline">Deactivate Account</button>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm">Cancel</Button>
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">Save All Changes</Button>
                </div>
              </div>
            </>
          )}

          {activeTab === "notifications" && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
              <h3 className="font-bold text-foreground pb-4 border-b border-border">Notification Preferences</h3>
              {[
                { key: "email", label: "Email notifications", desc: "Receive weekly progress reports" },
                { key: "push", label: "Push notifications", desc: "Get reminders to study" },
                { key: "streak", label: "Streak reminders", desc: "Don't lose your streak!" },
              ].map((n) => (
                <div key={n.key} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{n.label}</div>
                    <div className="text-xs text-muted-foreground">{n.desc}</div>
                  </div>
                  <button
                    onClick={() => setNotifications((p) => ({ ...p, [n.key]: !p[n.key as keyof typeof p] }))}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      notifications[n.key as keyof typeof notifications] ? "bg-accent" : "bg-muted"
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-card shadow transition-transform ${
                      notifications[n.key as keyof typeof notifications] ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-foreground pb-4 border-b border-border">Security</h3>
              <Button variant="outline" size="sm">Change Password</Button>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-foreground pb-4 border-b border-border">Integrations</h3>
              <p className="text-sm text-muted-foreground">No integrations configured yet.</p>
            </div>
          )}

          {/* Sign out */}
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="w-full gap-2 border-destructive text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
