"use client";

import Button from "@/components/Button";

import termsAndConditionList from "@/app/assets/termsAndConditionList"; // example image for open state

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const ElectionTermsCondition = () => {
  const [isChecked, setIsChecked] = useState(false); // so checkbutton must be clicked before proceeding
  const [voterData, setVoterData] = useState<any>(null);

  const router = useRouter(); // to go to another route

  useEffect(() => {
    // Get voter data from localStorage
    const storedData = localStorage.getItem("voterData");
    if (storedData) {
      setVoterData(JSON.parse(storedData));
    }
  }, []);

  const handleStartVoting = () => {
    if (!isChecked) {
      alert("Please read and agree to the Terms and Conditions before proceeding.");
      return;
    }
    router.push("/voter/ballot-form");
  };

  return (
    <main className="flex flex-col items-center gap-10 px-10 pb-20 pt-40 text-justify">
      <div className="text-center space-y-2">
        <p className="voter-election-heading">Terms and Conditions</p>
        <p className="voter-election-subheading">
          You&apos;re voting in the {voterData?.election?.name || '2025 Election of Provident'}
        </p>
      </div>
      <div className="lg:w-3/5">
        <div className="mb-10">
          <p className="voter-election-desc">
            <strong>Last updated: May 21, 2025</strong>
          </p>
          <li className="list-none voter-election-desc space-y-3 mt-2">
            <ul>
              Welcome to the Boto Mo ‘To – a secure, digital platform for
              conducting official elections and surveys.
            </ul>
            <ul>
              By accessing and participating in any election on this platform,
              you agree to the following terms and conditions:
            </ul>
          </li>
        </div>
        {/* List of terms loop*/}

        <div className="space-y-10">
          {termsAndConditionList.map((term, index) => (
            <div key={index} className="flex flex-col gap-2">
              <p className="voter-election-item">{term.title}</p>
              <ul className="list-disc pl-5 space-y-2 voter-election-desc">
                {term.descriptions.map((desc, descIndex) => (
                  <li key={descIndex}>{desc}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <li className="list-none voter-election-desc space-y-3 mt-2">
            <ul>
              By using this system, you acknowledge that you have read,
              understood, and agreed to these Terms and Conditions.
            </ul>
            <ul>
              If you do not agree, please do not proceed with the voting
              process.
            </ul>
          </li>
        </div>
      </div>

      <div className="pt-5 flex flex-col gap-4 w-4/5 xs:w-auto xs:items-center">
        <div className="flex gap-3 justify-center items-center">
          <input
            type="checkbox"
            id="terms-agreement"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="h-6 w-6 accent-primary flex-shrink-0"
          />
          <label
            htmlFor="terms-agreement"
            className="text-sm text-gray-600 sm:text-md"
          >
            I have read and agree to the Terms and Conditions
          </label>
        </div>
        <Button
          variant="long_primary"
          disabled={!isChecked}
          onClick={handleStartVoting}
        >
          Start Voting
        </Button>
      </div>
    </main>
  );
};

export default ElectionTermsCondition;
