"use client";
import Image from "next/image";
import { StaticImageData } from "next/image";

interface SetupCardProps {
  title: string;
  desc: string;
  img: StaticImageData;
  onClick: () => void;
}

export const SetupCard: React.FC<SetupCardProps> = ({ title, desc, img, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center border border-[var(--color-secondary)] rounded-[16px] bg-white shadow-sm hover:shadow-md transition-shadow w-full max-w-xs mx-auto p-4 text-left"
      style={{ minHeight: 220 }}
    >
      <Image
        src={img}
        alt={title}
        width={256}
        height={173}
        className="object-contain mb-3 rounded"
        draggable={false}
      />
      <div className="font-semibold text-[14px] mb-1 text-left w-full">{title}</div>
      <div className="text-gray-600 text-[12px] font-normal text-left w-full">{desc}</div>
    </button>
  );
}; 