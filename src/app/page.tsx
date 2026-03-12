"use client"; // useRouter needs a client component

import { useRouter } from "next/navigation";

import Image from "next/image";

import DashboardImageFull from "@/app/assets/DashboardImageFull.png";
import Button from "@/components/Button";

export default function HomePage() {
  const router = useRouter(); // to go to another route

  return (
    <main className="flex flex-col gap-8 md:justify-between pt-20 ">
      <div className="flex flex-col items-center pt-20 px-5 xs:px-20">
        <div className="text-center">
          <p className="landing-title">Boto Mo &apos;To, Boses Mo &apos;To!</p>
          <p className="landing-description pt-3">
            Secure, fast, and reliable voting system for small organizations.
          </p>
        </div>
        <div className="flex flex-col gap-4 pt-10 w-full xs:flex-row xs:w-auto">
          <Button onClick={() => router.push("/auth/login")}>Admin</Button>
          <Button onClick={() => router.push("/voter/login")}>Voter</Button>
        </div>
      </div>

      <div className="flex justify-center pt-5">
        <Image
          src={DashboardImageFull}
          height={480}
          alt="BotoMoToLogo"
        />
      </div>
    </main>
  );
}
