"use client"; // useRouter needs a client component

import { useRouter } from "next/navigation";

import Image from "next/image";

import DashboardImage from "./assets/DashboardImage.png";
import DashboardImageFull from "./assets/DashboardImageFull.png";
import Button from "@/components/Button";

export default function HomePage() {
  const router = useRouter(); // to go to another route

  return (
    <main className="flex flex-col gap-8 md:justify-between">
      <div className="flex flex-col items-center pt-20">
        <div className="text-center px-10">
          <p className="landing-title">Boto Mo 'To, Boses Mo ‘To!</p>
          <p className="landing-description pt-3 px-10">
            Secure, fast, and reliable voting system for small organizations.
          </p>
        </div>
        <div className="flex flex-col gap-4 pt-10 w-3/5 xs:flex-row xs:w-auto">
          <Button variant="primary">Admin</Button>
          <Button onClick={() => router.push("/voterlogin")}>Voter</Button>
        </div>
      </div>

      <div className="flex justify-center pt-5 xl:pt-0">
        {/* Mobile image: visible below md */}
        <Image
          src={DashboardImageFull}
          height={480}
          alt="BotoMoToLogo"
          className="block xl:hidden"
        />

        {/* Desktop image: visible md and up */}
        <Image
          src={DashboardImage}
          height={480}
          alt="BotoMoToLogo"
          className="hidden xl:block"
        />
      </div>
    </main>
  );
}
