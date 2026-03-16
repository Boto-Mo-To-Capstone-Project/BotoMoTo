import { LogOut } from "lucide-react";
import { Avatar } from "@/components/Avatar";

type SidebarAccountCardProps = {
  name: string;
  email: string;
  image?: string | null;
  defaultImage?: string;
  onLogout: () => void;
};

const SidebarAccountCard = ({
  name,
  email,
  image,
  defaultImage,
  onLogout,
}: SidebarAccountCardProps) => {
  return (
    <div className="mt-auto pt-4 border-t border-white/20">
      <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15">
        <Avatar
          name={name}
          image={image}
          defaultImage={defaultImage}
          size="w-10 h-10"
          className="shrink-0 ring-2 ring-white/25"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-white">
            {name}
          </p>
          <p className="truncate text-xs leading-tight text-white/75" title={email}>
            {email}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default SidebarAccountCard;
