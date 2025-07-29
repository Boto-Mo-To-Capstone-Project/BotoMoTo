import { Menu } from "lucide-react";

interface AppHeaderProps {
  onMenuClick: () => void;
  title: string;
}

export default function AppHeader({ onMenuClick, title }: AppHeaderProps) {
  return (
    <header className="sticky top-0 left-0 w-full h-16 bg-white shadow z-50 flex items-center">
      <div className="w-full flex items-center px-6 lg:ml-68">
        {/* Hamburger for mobile */}
        <button
          className="mr-4 text-primary lg:hidden"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <Menu size={28} />
        </button>
        {/* Page Title */}
        <span className="font-semibold text-xl">{title}</span>
        {/* (Optional) Add user/profile/settings on the right */}
        <div className="ml-auto flex items-center gap-2">{/* ... */}</div>
      </div>
    </header>
  );
}
