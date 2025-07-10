"use client";

import Button from "@/components/Button";

import { useEffect } from "react"; // to clear selection

import { useRouter } from "next/navigation";

import { Candidate } from "@/types";
import Dropdown from "@/components/Dropdown";
import CandidateCategory from "@/components/CandidateCategory";

import { useDispatch } from "react-redux"; //  lets you send actions to Redux
import { AppDispatch } from "@/store"; // typed version of dispatch
import {
  selectCandidate,
  deselectCandidate,
  clearSelections,
} from "@/store/ballotSlice"; // your action creator

const candidates: Candidate[] = [
  {
    name: "Posa Catler",
    img: "https://patch.com/img/cdn/users/271628/2015/07/raw/201507559b597b5e341.jpg",
    party: "Makatao",
    credentials: `Meow meow meow meow`,
    position: "President",
  },
  {
    name: "Chou",
    img: "https://i.pinimg.com/736x/bc/6f/a3/bc6fa3e52e1c84c9f21ebc9919f49813.jpg",
    party: "Makakalikasan",
    credentials: `Speed defines the winner`,
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
    name: "Alice",
    img: "https://i.pinimg.com/474x/7e/4d/c6/7e4dc69f99c591b425b04445db7c2f63.jpg",
    party: "Makakalikasan",
    credentials: `Darkness is closing in`,
    position: "Councilor",
  },
  {
    name: "Gatotcaca",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSvVCrVxk5caTDS39LsfSIIfeS7vbA9w3_WeQ&s",
    party: "Makakalikasan",
    credentials: `No pain no gain`,
    position: "Vice President",
  },

  {
    name: "Uranus",
    img: "https://cdn.oneesports.gg/cdn-data/2021/09/MLBB_CelestialBastionUranus-1024x623.jpeg",
    party: "Makakalikasan",
    credentials: `Uranus has awaken`,
    position: "Councilor",
  },
  {
    name: "Garfield",
    img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrOy5z90iLbiRND-3MHN7sCb7pV45Db0wY9g&s",
    party: "Makatao",
    credentials: `meow meow`,
    position: "Councilor",
  },
];
const BallotForm = () => {
  const router = useRouter(); // to go to another route
  const dispatch = useDispatch<AppDispatch>(); // used to redux dispatch

  // CLEAR selections whenever the form loads
  useEffect(() => {
    dispatch(clearSelections());
  }, [dispatch]);

  // use redux dispatch when selecting a candidate
  const handleSelectCandidate = (position: string, candidate: Candidate) => {
    dispatch(selectCandidate({ position, candidate }));
  };

  // use redux dispatch when deselecting a candidate
  const handleDeselectCandidate = (position: string, candidateName: string) => {
    dispatch(deselectCandidate({ position, candidateName }));
  };

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
    Councilor: 2,
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
              onSelectCandidate={(candidate) =>
                handleSelectCandidate(position, candidate)
              }
              onDeselectCandidate={(candidate) =>
                handleDeselectCandidate(position, candidate.name)
              }
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
            onClick={() => router.push("/voter/ballot-form/review")}
          >
            Review Vote
          </Button>
        </div>
      </div>
    </main>
  );
};

export default BallotForm;
