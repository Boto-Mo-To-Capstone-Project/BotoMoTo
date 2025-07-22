"use client";
import { useRef, useState } from "react";
import { SubmitButton } from '@/components/SubmitButton';
import { FileDropzone } from '@/components/FileDropzone';
import { UploadedFileDisplay } from "@/components/UploadedFileDisplay";
import Scope from "@/app/assets/Scope.png";
import Party from "@/app/assets/Party.png";
import Voter from "@/app/assets/Voter.png";
import Position from "@/app/assets/Position.png";
import Candidate from "@/app/assets/Candidate.png";
import ElectionStatus from "@/app/assets/ElectionStatus.png";
import { StepsSection } from '@/components/StepsSection';
import { SetupCard } from '@/components/SetupCard';

const steps = [
  "Step 1: Click 'Add Scope' – Set eligibility rules or levels for voting, such as limiting access based on voter level (e.g., Level 1, 2, 3).",
  "Step 2: Click 'Add Voter' – This allows you to add all the voters who will participate in any of the elections.",
  "Step 3: Click 'Add Position' – Use this to manage all positions that candidates will run for (e.g., President, Secretary).",
  "Step 4: Click 'Add Party' – Register and manage political parties or groups to which candidates may belong.",
  "Step 5: Click 'Add Candidate' – Manage the candidates running for each position. You can input their details and assign them to specific positions.",
];

const setupCards = [
  {
    title: "Add Scope",
    desc: "Set eligibility rules and levels for voting. Example: Level 1, 2, 3.",
    img: Scope,
    href: "#",
  },
  {
    title: "Add Party",
    desc: 'Step 2: Click "Add Party" Register and manage political parties or groups to which candidates may belong.',
    img: Party,
    href: "#",
  },
  {
    title: "Add Voter",
    desc: "Add or upload voters. This button allows you to add voters to all elections.",
    img: Voter,
    href: "#",
  },
  {
    title: "Add Position",
    desc: "Support the setup of positions (e.g., President, Secretary).",
    img: Position,
    href: "#",
  },
  {
    title: "Add Candidate",
    desc: "Manage the candidates running for each position.",
    img: Candidate,
    href: "#",
  },
  {
    title: "Election Status",
    desc: "Configure the status of the election.",
    img: ElectionStatus,
    href: "#",
  },
];

export default function ElectionSetupOverview() {
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const fileInputRef = useRef(null);
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const templateFile = new File([""], "TemplateFile_BatchUpload.csv", { type: "text/csv", lastModified: new Date().getTime() });

  return (
    <div className="flex min-h-screen">
      {/* <AdminSidebar variant="default" /> */}
      <main className="flex-1 bg-white p-4 sm:p-8 w-full min-w-0">
        <h1 className="text-2xl font-bold mb-1">Configuration</h1>
        <p className="text-gray-600 mb-6">After creating the election form, proceed with the configuration by following these steps to complete the election setup:</p>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4 mb-6">
          {/* Responsive action buttons, right aligned on desktop */}
          <div className="w-full flex gap-2 md:w-auto md:ml-auto justify-end">
            <SubmitButton
              label="Cancel"
              variant="small-action"
              onClick={() => {}}
            />
            <SubmitButton
              label="Save"
              variant="small"
              onClick={() => {}}
            />
          </div>
        </div>

        {/* Steps for Election Setup */}
        <StepsSection steps={steps} />

        {/* Batch Upload */}
        <div className="w-full mb-6 flex flex-col md:flex-row md:items-start md:gap-6">
          {/* Left column: label and description */}
          <div className="md:w-1/3 w-full mb-4 md:mb-0">
            <div className="font-semibold text-base">Batch upload (CSV or Excel)</div>
            <div className="text-sm text-gray-600 mt-1">
              Batch Upload lets you import position records using CSV or Excel files to save time and avoid manual typing.
            </div>
          </div>
          {/* Right column: dropzone and template */}
          <div className="md:w-2/3 w-full flex flex-col items-center">
            <FileDropzone
              label=""
              description=""
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              fileTypeText="SVG, PNG, JPG or GIF files, 800×400px"
            />
            <UploadedFileDisplay
              file={templateFile}
              onDownload={() => {
                window.open("/assets/template_pdf/sample_org_letter.pdf", "_blank", "noopener,noreferrer");
              }}
              className="mt-4 w-full max-w-[380px] mx-auto"
            />
          </div>
        </div>

        {/* Button for Election Setup */}
        <div className="mb-2 font-semibold">Button for Election Setup</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full">
          {setupCards.map((card, idx) => (
            <SetupCard
              key={idx}
              title={card.title}
              desc={card.desc}
              img={card.img}
              onClick={() => {
                // Add navigation logic here
                console.log(`Clicked ${card.title}`);
                // Example: router.push(card.href);
              }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
