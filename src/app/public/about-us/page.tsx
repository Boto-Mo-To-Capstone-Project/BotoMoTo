import Image from "next/image";
import aboutUsImage from "@/app/assets/DashboardImageFull.png"
import GoalItem from "@/components/about-us/GoalItem";
import { FileCheck, Gauge, GlobeLock, Lock, ShieldCheck, Users } from "lucide-react";
import { FaGithub, FaLinkedinIn, } from "react-icons/fa";
import TeamItem from "@/components/about-us/TeamItem";

import stack_tailwind from "@/app/assets/tech-stack/stack-tailwind.png"
import stack_next from "@/app/assets/tech-stack/stack-next.png"
import stack_prisma from "@/app/assets/tech-stack/stack-prisma.png"
import stack_postgresql from "@/app/assets/tech-stack/stack-postgresql.png"
import stack_resend from "@/app/assets/tech-stack/stack-resend.png"
import stack_s3 from "@/app/assets/tech-stack/stack-s3.png"
import stack_supabase from "@/app/assets/tech-stack/stack-supabase.png"
import stack_ses from "@/app/assets/tech-stack/stack-ses.png"


import AboutFooter from "@/components/about-us/AboutFooter";

import Alpornon from "@/app/assets/team/Alpornon.png"
import Sebastian from "@/app/assets/team/Sebastian.png"
import King from "@/app/assets/team/King.png"
import Edusma from "@/app/assets/team/Edusma.png"





const AboutPage = () => {

  const images = [
  { src: stack_next, alt: "Photo 1", },
  { src: stack_tailwind, alt: "Photo 2", },
  { src: stack_prisma, alt: "Photo 3", },
  { src: stack_supabase, alt: "Photo 6", },
  { src: stack_postgresql, alt: "Photo 7", },
  { src: stack_s3, alt: "Photo 4", },
  { src: stack_ses, alt: "Photo 5", },
  { src: stack_resend, alt: "Photo 8", },

  ];


  const goals = [
    {
      icon: ShieldCheck,
      title: "Secure & Accessible",
      description:
        "Robust authentication and intuitive design",
    },
    {
      icon: Lock,
      title: "Accurate & Confidential",
      description:
        "Flexible system ensuring data integrity",
    },
    {
      icon: Users,
      title: "Inclusive & Transparent",
      description:
        "Mobile-friendly with voter receipts",
    },
    {
      icon: GlobeLock,
      title: "Modern & Encrypted",
      description:
        "Web-based with advanced cryptography",
    },
    {
      icon: FileCheck,
      title: "Authentic Results",
      description:
        "Transparent and auditable election outcomes",
    },
    {
      icon: Gauge,
      title: "Reliable Performance",
      description:
        "Tested for efficiency and security",
    },
  ];

  const teamMembers = [
    {
      image: Alpornon,
      name: "CJ Alpornon",
      role: "Project Manager",
      description:
        "Just vibing with the code.",
      socials: [
        { icon: FaGithub, link: "https://github.com/haileyabadeerx" },
        { icon: FaLinkedinIn, link: "https://www.linkedin.com/in/chrstnjulia/" },
      ],
    },
    {
      image: King,
      name: "Marc King",
      role: "Frontend Developer",
      description:
        "Frontend XP Grinder",
      socials: [
        { icon: FaLinkedinIn, link: "https://www.linkedin.com/in/marclawrenceking/" },

      ],
    },
    {
      image: Sebastian,
      name: "Bri Sebastian",
      role: "Backend Developer",
      description:
        "work smart, para may pang bebetime pa",
      socials: [
        { icon: FaLinkedinIn, link: "https://www.linkedin.com/in/brisebas/" },
      ],
    },
    
    {
      image: Edusma,
      name: "MC Edusma",
      role: "Frontend Developer & UI/UX",
      description:
        "Well, I named the system",
      socials: [
        { icon: FaLinkedinIn, link: "https://ph.linkedin.com/in/marie-cris-edusma-98aa9a256" },
      ],
    },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center mt-20">
      {/* about us */}
      <div className="flex flex-col items-center gap-6 py-20 px-5">
        <div className="text-center">
          <p className="text-md font-semibold text-primary">About us</p>
          <p className="text-dlg font-semibold text-black">Get to know us</p>
        </div>
        <p className="text-xl font-normal text-gray">Learn more about the team behind Boto Mo 'To</p>
      </div>
      {/* our project */}
      <div className="flex flex-col bg-gray-50 px-5 lg:px-20 py-24 xl:flex-row">
        <div className="flex basis-[50%] items-center justify-center">
          <Image
          src={aboutUsImage}
          width={600}
          height={600}
          alt="Picture"
          className=""
          />   
        </div>
         
        <div className="flex flex-col items-start gap-10 xl:gap-12 basis-[50%] py-10">
          <div className="">
            <p className="text-md font-semibold text-primary ">Vote. Securely. Anywhere.</p>
            <p className="text-dlg font-semibold text-black">Our Project</p>
          </div>
          <div className="space-y-5 ">
            <p className="text-xl font-normal text-gray">Boto Mo To is a secure and user-friendly online voting system for small organizations such as student councils, and community groups. </p>
            <p className="text-xl font-normal text-gray">It streamlines the election process, and ensures fair, accurate results.</p>
          </div>
        </div>
      </div>
      {/* our goals */}
      <div className="flex flex-col items-center gap-16 py-24 px-5">

        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="text-md font-semibold text-primary ">Driving Our Purpose</p>
            <p className="text-dmd font-semibold text-black">Our Goals</p>
          </div>
          <p className="text-center text-xl font-normal text-gray">Our shared goals keep us connected and guide us as one team.</p>
        </div>
        <div className="flex flex-wrap gap-16 justify-center">
          {goals.map((goal, index) => (
            <GoalItem key={index} {...goal} />
          ))}
        </div>
      </div>
    
      {/* our team */}
      <div className="flex flex-col items-center gap-16 py-24 px-5 bg-gray-50 w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="text-md font-semibold text-primary ">Get to Know Us</p>
            <p className="text-dmd font-semibold text-black">Meet our team</p>
          </div>
          <p className="text-center text-xl font-normal text-gray">Get to know the passionate individuals behind our project.</p>
        </div>
        <div className="flex flex-wrap gap-16 xl:gap-25 justify-center">
          {teamMembers.map((member, index) => (
            <TeamItem key={index} {...member} />
          ))}

        </div>
      </div>

      {/* Tech Stack */}
      <div className="flex flex-col items-center py-24 px-5 gap-2">
        <p className="text-md font-medium text-gray">Tech Stack</p>
        <div className="flex flex-wrap justify-center items-center gap-30 p-4">
          {images.map((img, index) => (
            <div key={index} className="flex-shrink-0">
              <Image
                src={img.src}
                alt={img.alt}
                width={150}
                className="rounded-lg object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      <AboutFooter/>
    </main>
  );
}

export default AboutPage;