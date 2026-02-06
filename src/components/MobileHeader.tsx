import { Menu } from 'lucide-react';

export default function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="fixed top-0 left-0 w-full h-16 bg-white shadow z-50 lg:hidden">
      <div className="mx-auto max-w-screen-lg h-16 flex items-center px-4">
        <button
          className="mr-4 text-primary"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <Menu size={28} />
        </button>
        <span className="font-bold text-lg">Admin</span>
      </div>
    </header>
  );
} 