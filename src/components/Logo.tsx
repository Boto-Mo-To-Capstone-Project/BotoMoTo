// components/Logo.tsx
import Image from "next/image";
import LogomarkHD from "@/app/assets/LogomarkHD.png";

export default function Logo() {
  return (
    <div className="flex justify-center">
      <Image src={LogomarkHD} alt="Boto Mo 'To Logo" className="w-16 h-16" />
    </div>
  );
}