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

const setupCards = [
  {
    title: "Add Voter",
    desc: "Add voters to the election or use the import button for batch upload.",
    img: Voter,
    bg: "bg-violet-100",
    text: "text-violet-900",
  },
  {
    title: "Add Position",
    desc: "Define the election positions (e.g. President, Secretary).",
    img: Position,
    bg: "bg-pink-100",
    text: "text-pink-900",
  },
  {
    title: "Add Candidate",
    desc: "Manage the candidates running for each position.",
    img: Candidate,
    bg: "bg-yellow-100",
    text: "text-yellow-900",
  },
  {
    title: "Manage Election",
    desc: "Setup the election configurations.",
    img: ElectionStatus,
    bg: "bg-green-100",
    text: "text-green-900",
  },
];

export default function ElectionSetupOverview() {
  const [showSteps, setShowSteps] = useState(false);

  return (
      <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8 pt-4">

        {/* Red Header Card */}
        <div className="flex items-center rounded-2xl bg-red-800 mb-6 px-6 py-6 relative overflow-hidden mt-8">
          <div>
            <h2 className="text-white text-xl font-semibold mb-2">Hi, Brian King!</h2>
            <p className="text-white text-base">
              Follow the steps below to complete election setup.
            </p>
          </div>
        </div>

        {/* Election Setup Steps Dropdown */}
        <div className="mb-6 px-2 sm:px-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between rounded-t-xl">
              <span className="font-semibold text-base py-4 pl-5">Steps for Election Setup</span>
              <button
                className="p-2 rounded-full hover:bg-gray-200 transition mr-3"
                onClick={() => setShowSteps((prev) => !prev)}
                aria-label="Show steps"
              >
                <FiMoreHorizontal size={22} className="text-gray-400" />
              </button>
            </div>
            <div className="border-b border-gray-200 shadow-sm" />
            {showSteps && (
              <div className="border border-red-400 rounded-lg m-4 p-4 text-gray-700 text-sm bg-white">
                <ol className="space-y-2 list-decimal ml-4">
                  <li>Click "Add Voter" to add voters to the election.</li>
                  <li>Click "Add Position" to manage the positions that the candidates will run for in the election.</li>
                  <li>Click "Add Candidate" to add candidates, input their details, and assign them to specific positions.</li>
                  <li>
                    <span className="flex items-center gap-2">
                      Note: Import button can be used for easy batch upload.
                      <SubmitButton
                        label=""
                        variant="action"
                        icon={<MdFileUpload size={20} />}
                        title="Import"
                      />
                    </span>
                  </li>
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
              border-4 border-transparent
              ${idx === 0 ? "hover:border-violet-700" : ""}
              ${idx === 1 ? "hover:border-pink-700" : ""}
              ${idx === 2 ? "hover:border-yellow-700" : ""}
              ${idx === 3 ? "hover:border-green-700" : ""}
              flex flex-col items-center text-center h-full
            `}
                    onClick={() => {
                      // Add navigation logic here
                    }}
                  >
                    <div className="w-full mb-2">
                        <img
                          src={card.img.src}
                          alt={card.title}
                          className="w-full h-40 object-contain rounded-xl p-2 bg-[# ]"
                        />
                    </div>
                    <h3 className={`text-[14px] font-semibold mb-2 px-0 sm:px-0 ${card.text} text-left w-full`}>{card.title}</h3>
                    <p className={`text-[12px] ${card.text} text-left w-full`}>{card.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}