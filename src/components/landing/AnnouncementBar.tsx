import { Sparkles } from "lucide-react";

const AnnouncementBar = () => (
  <div className="bg-navy text-primary-foreground py-2.5 px-4 text-center text-sm font-medium tracking-wide">
    <div className="container flex items-center justify-center gap-2">
      <Sparkles className="h-4 w-4 text-highlight" />
      <span>New: AI Tutor now supports document learning uploads.</span>
      <a href="#" className="underline underline-offset-4 hover:text-highlight transition-colors ml-1">Learn more →</a>
    </div>
  </div>
);

export default AnnouncementBar;
