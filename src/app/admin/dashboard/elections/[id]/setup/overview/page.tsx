"use client";
import { SubmitButton } from '@/components/SubmitButton';
import Voter from "@/app/assets/Voter.png";
import Position from "@/app/assets/Position.png";
import Candidate from "@/app/assets/Candidate.png";
import ElectionStatus from "@/app/assets/ElectionStatus.png";
import  Setup from "@/app/assets/Setup.png";

import { useState } from "react";
import { FiMoreHorizontal } from "react-icons/fi";
import { MdFileUpload } from 'react-icons/md';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

const setupCards = [
  {
    title: "Add Voter",
    desc: "Add voters to the election or use the import button for batch upload.",
    img: Voter,
    bg: "bg-gray-50",
    text: "text-gray-800",
  },
  {
    title: "Add Position",
    desc: "Define the election positions (e.g. President, Secretary).",
    img: Position,
    bg: "bg-gray-50",
    text: "text-gray-800",
  },
  {
    title: "Add Candidate",
    desc: "Manage the candidates running for each position.",
    img: Candidate,
    bg: "bg-gray-50",
    text: "text-gray-800",
  },
  {
    title: "Manage Election",
    desc: "Setup the election configurations.",
    img: ElectionStatus,
    bg: "bg-gray-50",
    text: "text-gray-800",
  },
];

export default function ElectionSetupOverview() {
  const params = useParams<{ id: string }>();
  const electionId = Number(params?.id);
  const router = useRouter();
  const { data: session } = useSession();
  const [showSteps, setShowSteps] = useState(false);

  return (
      <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8 pt-4">

        {/* Election Header - Professional Gradient */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-8 mt-4">
          <div className="absolute inset-0 bg-gradient-to-r from-[#7b1c1c] via-[#992b2b] to-[#5c0000]"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
          <div className="relative px-6 py-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-md font-bold text-white mb-1">Hi, {session?.user?.name || 'User'}!</h2>
              <p className="text-white/90 text-sm">
                Follow the steps below to complete election setup.
              </p>
            </div>
          </div>
        </div>

        {/* Election Setup Steps Dropdown */}
        <div className="mb-6 px-2 sm:px-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between rounded-t-xl">
              <span className="font-semibold text-sm py-4 pl-5">Steps for Election Setup</span>
              <button
                className="p-2 rounded-full hover:bg-gray-200 transition mr-3"
                onClick={() => setShowSteps((prev) => !prev)}
                aria-label="Show steps"
              >
                <FiMoreHorizontal size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="border-b border-gray-200 shadow-sm" />
            {showSteps && (
              <div className="border border-red-400 rounded-lg m-4 p-4 text-gray-700 text-sm bg-white">
                <ol className="space-y-2 list-decimal ml-4">
                  <li className="text-sm">Click "Add Voter" to add voters to the election.</li>
                  <li className="text-sm">Click "Add Position" to manage the positions that the candidates will run for in the election.</li>
                  <li className="text-sm">Click "Add Candidate" to add candidates, input their details, and assign them to specific positions.</li>
                  <li className="text-sm">Note: Import button can be used for easy batch upload.</li>
                </ol>
              </div>
            )}
            {/* Setup Cards/Buttons inside the card */}
            <div className="main-content pb-3 px-2 sm:px-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-2 sm:mt-0 p-4">
                {setupCards.map((card, idx) => (
                  <button
                    key={idx}
                    className={`
              ${card.bg} rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 p-2
              border-4 border-transparent hover:border-red-900
              flex flex-col items-center text-center h-full
            `}
                    onClick={() => {
                      if (card.title === 'Add Voter') {
                        router.push(`/admin/dashboard/elections/${electionId}/setup/voters`);
                      }
                      if (card.title === 'Add Position') {
                        router.push(`/admin/dashboard/elections/${electionId}/setup/positions`);
                      }
                      if (card.title === 'Add Candidate') {
                        router.push(`/admin/dashboard/elections/${electionId}/setup/candidates`);
                      }
                      if (card.title === 'Manage Election') {
                        router.push(`/admin/dashboard/elections/${electionId}/setup/manage-election`);
                      }
                    }}
                  >
                    <div className="w-full mb-2">
                        <img
                          src={card.img.src}
                          alt={card.title}
                          className="w-full h-40 object-contain rounded-xl p-2 bg-[# ]"
                        />
                    </div>
                    <h3 className={`text-sm font-semibold mb-2 px-0 sm:px-0 ${card.text} text-left w-full`}>{card.title}</h3>
                    <p className={`text-sm ${card.text} text-left w-full opacity-80`}>{card.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}