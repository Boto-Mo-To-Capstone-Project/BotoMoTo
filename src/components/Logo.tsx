// components/Logo.tsx
import Image from "next/image";
import Logomark from "@/app/assets/Logomark.png";

export default function Logo() {
  return (
    <div className="flex justify-center">
      <Image src={Logomark} alt="Boto Mo 'To Logo" className="w-16 h-16" />
    </div>
  );
}