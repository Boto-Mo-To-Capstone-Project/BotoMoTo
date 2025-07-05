"use client";

import Button from "@/components/Button";

import { useRouter } from "next/navigation";

import { Candidate } from "@/types";
import Dropdown from "@/components/Dropdown";
import CandidateCategory from "@/components/CandidateCategory";

const candidates: Candidate[] = [
  {
    name: "Posa Catler",
    img: "https://patch.com/img/cdn/users/271628/2015/07/raw/201507559b597b5e341.jpg",
    party: "Makatao",
    credentials: `Meow meow meow meow`,
    position: "President",
  },
  {
    name: "Chou Gods",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS26Io42jEczj06-pfPIpiNeS-sFBnV8QBivA&s",
    party: "Makakalikasan",
    credentials: `hule na!`,
    position: "President",
  },
  {
    name: "Posa Catolf",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQehlOE35MK3dZ0Pv4yWJIPjBa5_OV1nVkMrw&s",
    party: "Makatao",
    credentials: `- Meow meow meow meow meow`,
    position: "Vice President",
  },
  {
    name: "Gatot Only",
    img: "https://i.pinimg.com/736x/80/8b/63/808b6327fc2dba47ce30dcbef5f0c6ab.jpg",
    party: "Makakalikasan",
    credentials: `set ko sa tore`,
    position: "Vice President",
  },
];
const BallotForm = () => {
  const router = useRouter(); // to go to another route

  // Group candidates by position
  const candidatesByPosition: Record<string, Candidate[]> = candidates.reduce(
    (acc, candidate) => {
      if (!acc[candidate.position]) {
        acc[candidate.position] = [];
      }
      acc[candidate.position].push(candidate);
      return acc;
    },
    {} as Record<string, Candidate[]>
  );

  // Decide how many candidates can be selected per position:
  const selectionLimits: Record<string, number> = {
    President: 1,
    "Vice President": 1,
    // Add more if needed
  };
  return (
    <main className="flex flex-col items-center gap-10 px-10 pb-20 pt-40 text-justify">
      <div className="text-center space-y-2">
        <p className="voter-election-heading">Official Ballot Form</p>
        <p className="voter-election-subheading">
          You're voting in the 2025 Election of Provident
        </p>
      </div>
      <div className="lg:w-3/5 flex flex-col flex-wrap">
        <div className="mb-10">
          <p className="voter-election-desc">
            <strong>Instructions for Voting</strong>
          </p>
          <li className="list-none voter-election-desc space-y-3 mt-2">
            <ul>1. Select the circle next to your chosen candidate's name.</ul>
            <ul>
              2. Do not select more candidates than the allowed number for each
              position.
            </ul>
            <ul>
              3. Click 'Check Credentials' to review the background and details
              of each candidates.
            </ul>
          </li>
        </div>
        <Dropdown
          label="Vote Straight (Party)"
          options={["Makatao", "Makabayan", "Makakalikasan", "Makadiyos"]}
        />

        <div className="mt-5">
          {Object.entries(candidatesByPosition).map(([position, list]) => (
            <CandidateCategory
              key={position}
              position={position}
              selectCount={selectionLimits[position] || 1}
              candidateList={list}
            />
          ))}
        </div>

        <div className="flex gap-4 justify-end">
          <Button
            variant="secondary"
            onClick={() => router.push("/voter/election-terms-conditions")}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push("/voter/ballot-form")}
          >
            Review Vote
          </Button>
        </div>
      </div>
    </main>
  );
};

export default BallotForm;
