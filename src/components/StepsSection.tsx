"use client";

interface StepsSectionProps {
  steps: string[];
}

export const StepsSection: React.FC<StepsSectionProps> = ({ steps }) => {
  return (
    <div className="bg-white border-[1.5px] border-[#800000] rounded-lg p-4 mb-6 overflow-x-auto w-full">
      <h2 className="font-semibold mb-2">Steps for Election Setup</h2>
      <ol className="list-decimal pl-5 space-y-1 text-gray-700">
        {steps.map((step, idx) => (
          <li key={idx}>{step}</li>
        ))}
      </ol>
    </div>
  );
}; 