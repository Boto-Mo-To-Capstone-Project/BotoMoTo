import Image from "next/image";
import logo from "@/app/assets/Logomark.png"
import aboutUsImage from "@/app/assets/DashboardImageFull.png"
import GoalItem from "@/components/about-us/GoalItem";
import { Rocket } from "lucide-react";
import { FaGithubAlt, FaGithubSquare, FaLinkedin, FaLinkedinIn, FaTwitter, FaTwitterSquare } from "react-icons/fa";
import TeamItem from "@/components/about-us/TeamItem";

import stack_tailwind from "@/app/assets/stack-tailwind.png"
import stack_next from "@/app/assets/stack-next.png"
import stack_prisma from "@/app/assets/stack-prisma.png"
import AboutFooter from "@/components/about-us/AboutFooter";




const AboutPage = () => {

  const images = [
  { src: stack_next, alt: "Photo 1", },
  { src: stack_tailwind, alt: "Photo 2", },
  { src: stack_prisma, alt: "Photo 3", },

  ];


  const goals = [
    {
      icon: Rocket,
      title: "Simple multi-device votings",
      description:
        "Provide a simple and intuitive voting interface accessible on multiple devices.",
    },
    {
      icon: Rocket,
      title: "Secure and private elections",
      description:
        "Ensure vote integrity and privacy using secure authentication and encryption.",
    },
    {
      icon: Rocket,
      title: "Real-time results transparency",
      description:
        "Deliver real-time results and analytics for transparency.",
    },
    {
      icon: Rocket,
      title: "Cost and time efficiency",
      description:
        "Reduce the costs and time associated with traditional paper-based voting.",
    },
  ];

  const teamMembers = [
    {
      image: logo,
      name: "John Doe",
      role: "Frontend Developer",
      description:
        "Passionate about building interactive and accessible web applications.",
      socials: [
        { icon: FaGithubSquare, link: "https://github.com/johndoe" },
        { icon: FaLinkedinIn, link: "https://linkedin.com/in/johndoe" },
        { icon: FaTwitter, link: "https://twitter.com/johndoe" },
      ],
    },
    {
      image: logo,
      name: "Jane Smith",
      role: "UI/UX Designer",
      description:
        "Designing beautiful, user-friendly interfaces with a focus on accessibility.",
      socials: [
        { icon: FaLinkedin, link: "https://linkedin.com/in/janesmith" },
        { icon: FaTwitterSquare, link: "https://twitter.com/janesmith" },
      ],
    },
    {
      image: logo,
      name: "Mike Johnson",
      role: "Backend Engineer",
      description:
        "Loves solving complex problems and optimizing server performance.",
      socials: [
        { icon: FaGithubAlt, link: "https://github.com/mikejohnson" },
      ],
    },
    {
      image: logo,
      name: "Mike Johnson",
      role: "Backend Engineer",
      description:
        "Loves solving complex problems and optimizing server performance.",
      socials: [
        { icon: FaGithubAlt, link: "https://github.com/mikejohnson" },
      ],
    },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center mt-20">
      {/* about us */}
      <div className="flex flex-col items-center gap-6 py-20 px-5">
        <p className="text-dlg font-semibold text-black">About us</p>
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
            <p className="text-xl font-normal text-gray">It streamlines the election process, minimizes logistical issues, and ensures fair, accurate results.</p>
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
      <div className="flex flex-col items-center gap-16 py-24 px-5 bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <p className="text-md font-semibold text-primary ">Get to Know Us</p>
            <p className="text-dmd font-semibold text-black">Meet our team</p>
          </div>
          <p className="text-center text-xl font-normal text-gray">Get to know the passionate individuals behind our project.</p>
        </div>
        <div className="flex flex-wrap gap-16 justify-center">
          {teamMembers.map((member, index) => (
            <TeamItem key={index} {...member} />
          ))}

        </div>
      </div>

      {/* Tech Stack */}
      <div className="flex flex-col items-center py-24 px-5 gap-2">
        <p className="text-md font-medium text-gray">Tech Stack</p>
        <div className="flex flex-wrap justify-center items-center gap-20 p-4">
          {images.map((img, index) => (
            <div key={index} className="flex-shrink-0">
              <Image
                src={img.src}
                alt={img.alt}
                width="150"
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