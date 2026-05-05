import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, MessageCircleQuestion, Trophy,
  BarChart3, Upload, Settings, User, Flame, Gamepad2, Bot,
  Timer, Focus, X, ChevronLeft, MessageSquare, Camera
} from "lucide-react";
import { useDeepFocus } from "@/hooks/useDeepFocus";
import GlobalTimer from "@/components/GlobalTimer";

import eduonxLogo from "@/assets/eduonx-logo.jpeg";

const sidebarLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/lessons", icon: BookOpen, label: "Lessons" },
  { to: "/doubts", icon: MessageCircleQuestion, label: "Ask Doubt" },
  { to: "/quiz", icon: Gamepad2, label: "Practice Arena" },
  { to: "/materials", icon: Upload, label: "Materials" },
  { to: "/materials/tutor", icon: Bot, label: "AI Tutor" },
  { to: "/progress", icon: BarChart3, label: "Progress" },
  { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { to: "/achievements", icon: Flame, label: "Achievements" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/feedback", icon: MessageSquare, label: "Feedback" },
];

// Mobile nav shows only the 5 most important routes
const mobileNavLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/doubts", icon: MessageCircleQuestion, label: "Ask Doubt" },
  { to: "/quiz", icon: Gamepad2, label: "Practice Arena" },
  { to: "/materials/tutor", icon: Bot, label: "AI Tutor" },
];

const AppLayout = () => {
  const { pathname } = useLocation();
  const { isDeepFocus, disableDeepFocus } = useDeepFocus();

  return (
    <div className="min-h-screen bg-background flex">
      <GlobalTimer />

      {/* ── Sidebar (hidden in Deep Focus Mode) ────────────────── */}
      {!isDeepFocus && (
        <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card fixed inset-y-0 left-0 z-30">
          <div className="px-6 py-8 border-b border-border flex-shrink-0">
            <Link to="/" className="flex items-center shrink-0 w-full justify-start">
              <img src={eduonxLogo} alt="EduOnx Logo" className="h-[150px] w-auto max-w-[300px] object-contain object-left scale-[1.35] origin-left" />
            </Link>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
            {sidebarLinks.map((link) => {
              const active =
                pathname === link.to ||
                (link.to !== "/dashboard" && pathname.startsWith(link.to + "/"));
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
                      ? "bg-primary/10 text-primary border-l-[3px] border-primary pl-[9px]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                >
                  <link.icon className="h-4 w-4 flex-shrink-0" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User footer */}
          <div className="px-4 py-4 border-t border-border flex-shrink-0">
            <Link
              to="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">My Account</div>
                <div className="text-xs text-muted-foreground">View Profile</div>
              </div>
            </Link>
          </div>
        </aside>
      )}

      {/* ── Deep Focus Mode — minimal top bar ──────────────────── */}
      {isDeepFocus && (
        <div className="fixed top-0 left-0 right-0 z-30 h-12 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Focus className="h-4 w-4" />
            Deep Focus Mode
          </div>
          <button
            onClick={disableDeepFocus}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Exit Focus
          </button>
        </div>
      )}

      {/* ── Mobile Bottom Nav (hidden in Deep Focus Mode) ──────── */}
      {!isDeepFocus && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex safe-area-pb">
          {mobileNavLinks.map((link) => {
            const active =
              pathname === link.to ||
              (link.to !== "/dashboard" && pathname.startsWith(link.to + "/"));
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"
                  }`}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main
        className={`flex-1 ${isDeepFocus
            ? "pt-12 pb-0"                        // Deep Focus: only top-bar offset
            : "md:ml-64 pb-20 md:pb-0"            // Normal: sidebar offset + mobile nav padding
          }`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
