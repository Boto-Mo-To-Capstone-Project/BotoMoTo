import { LucideIcon } from "lucide-react";

interface GoalItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function GoalItem({ icon: Icon, title, description }: GoalItemProps) {
  return (
    <div className="w-full flex gap-4 flex-col items-center md:w-1/3 lg:w-1/4">
        {/* Icon */}
        <div className="flex-shrink-0 p-5 bg-red-100 rounded-full text-primary">
            <Icon size={24} />
        </div>

        {/* Text */}
        <div className="text-center space-y-4">
            <p className="text-lg font-semibold">{title}</p>
            <p className="text-gray text-md font-medium">{description}</p>
        </div>
        
      
    </div>
  );
}
