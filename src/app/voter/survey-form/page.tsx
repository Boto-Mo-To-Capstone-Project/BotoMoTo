"use client";
import Button from "@/components/Button";
import SurveySection from "@/components/SurveySection";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SurveyForm = () => {
  const router = useRouter(); // to go to another route

  const [responses, setResponses] = useState<Record<string, number>>({});

  const handleAnswer = (questionId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const surveySections = [
    {
      title: "Section 1: System Usability",
      questions: [
        { id: "1", text: "1. The system is easy to use." },
        { id: "2", text: "2. I can navigate the system quickly." },
      ],
    },
    {
      title: "Section 2: User Satisfaction",
      questions: [
        {
          id: "3",
          text: "1. I am satisfied with the system performance.",
        },
        { id: "4", text: "2. I would recommend this system to others." },
      ],
    },
  ];
  return (
    <main className="flex flex-col items-center gap-10 px-5 md:px-10 pb-20 pt-40 text-justify">
      <div className="text-center space-y-2">
        <p className="voter-election-heading">Boto Mo &apos;To System Survey</p>
        <p className="voter-election-desc">
          We value your feedback! Help us enhance the Boto Mo 'To system by
          taking a few moments to complete this survey. Your insights are
          important to us.
        </p>
      </div>
      <div className="w-full sm:w-4/5 lg:w-3/5">
        <div className="mb-10 flex flex-col items-center">
          <table className="voter-election-desc mt-2 w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-200 px-2 py-1"></th>
                <th className="border border-gray-200 px-2 py-1 text-md">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 px-2 py-1 pr-4">1</td>
                <td className="border border-gray-200 px-2 py-1">
                  Strongly Disagree
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-2 py-1 pr-4">2</td>
                <td className="border border-gray-200 px-2 py-1">Disagree</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-2 py-1 pr-4">3</td>
                <td className="border border-gray-200 px-2 py-1">
                  Neutral / Neither Agree nor Disagree
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-2 py-1 pr-4">4</td>
                <td className="border border-gray-200 px-2 py-1">Agree</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-2 py-1 pr-4">5</td>
                <td className="border border-gray-200 px-2 py-1">
                  Strongly Agree
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="">
          {surveySections.map((section, index) => (
            <SurveySection
              key={index}
              section={section}
              onAnswer={handleAnswer}
              responses={responses}
            />
          ))}
          <pre className="bg-gray-100 p-4 mt-8 text-sm rounded">
            {/* just to see correct responses, pa remove nalang */}
            {JSON.stringify(responses, null, 2)}
          </pre>
        </div>
      </div>

      <div className="pt-5 flex flex-col gap-4 w-4/5 xs:w-auto xs:items-center">
        <Button
          variant="long_primary"
          onClick={() => router.push("/voter/live-dashboard")}
        >
          Submit
        </Button>
      </div>
    </main>
  );
};

export default SurveyForm;
