'use client'
import GoalItem from "@/components/about-us/GoalItem";
import { BarChart3, CircleQuestionMark, DollarSign, LayoutDashboard, ShieldCheck, Users, WifiOff } from "lucide-react";

import AboutFooter from "@/components/about-us/AboutFooter";
import { SubmitButton } from "@/components/SubmitButton";
import { useRouter } from "next/navigation";

const FAQsPage = () => {

  const router = useRouter(); // to go to another route

  const faqs = [
    {
      icon: DollarSign,
      title: "Is this online voting system free?",
      description:
        "Yes, it is completely free to use for both voters and administrators.",
    },
    {
      icon: ShieldCheck,
      title: "How secure is the voting process?",
      description:
        "We use chain hashing and encryption to protect votes. If any data is altered, the system will display the election's integrity level in percentage to ensure transparency.",
    },
    {
      icon: LayoutDashboard,
      title: "How user-friendly is the interface?",
      description:
        "The system is built using Figma-based templates for a clean and intuitive design.",
    },
    {
      icon: Users,
      title: "Who can access the voting system?",
      description:
        "Registered voters may cast their votes, while anyone can serve as an election administrator if they formally request access with an official organization letter.",
    },
    {
      icon: BarChart3,
      title: "How are results counted and displayed?",
      description:
        "Votes are tallied automatically in real-time, and results can be viewed through the live dashboard.",
    },
    {
      icon: WifiOff,
      title: "Can it work without the internet?",
      description:
        "An internet connection is required to access the system. However, we are exploring offline-ready features for future updates.",
    },
  ];


  return (
    <main className="min-h-screen flex flex-col items-center mt-20">
      {/* about us */}
      <div className="flex flex-col items-center gap-6 py-20 px-5 xs:px-20">
        <div className="text-center">
            <p className="text-md font-semibold text-primary ">FAQs</p>
            <p className="text-dlg font-semibold text-black">Frequently asked questions</p>
        </div>
        <p className="text-xl font-normal text-gray text-center">Have questions? We&#39;re here to help.</p>
      </div>
      {/* faqs */}
      <div className="flex flex-col items-center gap-16 py-10 px-5 xs:px-20">
        <div className="flex flex-wrap gap-16 justify-center lg:justify-between">
          {faqs.map((goal, index) => (
            <GoalItem key={index} {...goal} />
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center gap-16 py-10 px-5 xs:px-20 bg-gray-50 w-full">
        <div className="flex flex-col items-center gap-6">
            <div className="flex-shrink-0 p-5 bg-red-100 rounded-full text-primary">
                <CircleQuestionMark size={24} />
            </div>
            <div className="space-y-2 text-center">
                <p className="text-lg font-semibold">Still have questions?</p>
                <p className="text-gray text-lg font-medium">Can&#39;t find the answer you&#39;re looking for? Please chat to our friendly team.</p>
            </div>
            <SubmitButton 
                label="Get in touch" 
                variant="action-primary-2"
                onClick={() => router.push("/public/contact")}
                />
        </div>

      </div>

      <AboutFooter/>
    </main>
  );
}

export default FAQsPage;