// components/TeamItem.tsx
import Image, { StaticImageData } from "next/image";
import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons/lib";

interface Social {
  icon: IconType;
  link: string;
}

interface TeamItemProps {
  image: StaticImageData;
  name: string;
  role: string;
  description: string;
  socials: Social[];
}

export default function TeamItem({
  image,
  name,
  role,
  description,
  socials,
}: TeamItemProps) {
  return (
    <div className="w-full flex flex-col items-center sm:w-1/3 lg:w-1/6">
      <div className="flex items-center justify-center w-20 h-20 rounded-full ">
        <Image
          src={image}
          alt={name}
        />
      </div>
      <div className="text-center mt-4">
        <p className="text-lg font-semibold">{name}</p>
        <p className="text-md text-primary font-normal">{role}</p>
      </div>
      
      <p className="text-center text-md mt-2 text-gray font-normal px-10 sm:px-0">{description}</p>

      <div className="flex mt-2">
        {socials.map((social, index) => {
          const Icon = social.icon;
          return (
            <a
              key={index}
              href={social.link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-gray-200 transition"
            >
              <Icon className="w-5 h-5 text-gray-400" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
