import { Link } from "react-router-dom";
import { Home, Sparkles, Info, BookOpen } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";
import eduonxLogo from "@/assets/eduonx-logo.jpeg";

const navItems = [
  { name: 'Home', url: '/', icon: Home },
  { name: 'Features', url: '/#features', icon: Sparkles },
  { name: 'About Us', url: '/about', icon: Info },
];

const Navbar = () => {
  return (
    <>
      <nav className="absolute top-0 w-full z-40 bg-transparent border-transparent pt-0 md:pt-1 shrink-0 transition-opacity pointer-events-none flex justify-center">
        <div className="w-full max-w-7xl px-4 flex relative justify-start">
          <Link to="/" className="ml-4 md:ml-8 lg:ml-12 shrink-0 z-10 pointer-events-auto block transition-transform hover:opacity-90 active:scale-95 cursor-pointer">
            <img 
              src={eduonxLogo} 
              alt="EduOnx Logo" 
              className="h-[40px] md:h-[50px] lg:h-[60px] w-auto max-w-[240px] object-contain object-left mix-blend-screen invert grayscale brightness-200 opacity-90" 
            />
          </Link>
        </div>
      </nav>

      {/* Floating tubelight navigation */}
      <NavBar items={navItems} />
    </>
  );
};

export default Navbar;
