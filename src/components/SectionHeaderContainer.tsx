import { ReactNode } from "react";

type SectionHeaderContainerProps = {
  children: ReactNode;
  variant?: "white" | "yellow" | "gray" | "maroon";
  fullWidth?: boolean;
};

const SectionHeaderContainer = ({
  children,
  variant = "white",
  fullWidth = false,
}: SectionHeaderContainerProps) => {
  let backgroundClass = "";
  let borderClass = "border-gray-200";
  let textClass = "";

  switch (variant) {
    case "yellow":
      backgroundClass = "bg-secondary ";
      break;
    case "gray":
      backgroundClass = "bg-gray-100 ";
      break;
    case "maroon":
      backgroundClass = "bg-red-800";
      borderClass = "border-red-800";
      textClass = "font-bold text-white"; // <-- white na
      break;
    case "white":
    default:
      backgroundClass = "bg-white";
      break;
  }

  const content = (
    <p
      className={`survey-section border px-6 py-5 ${borderClass} mb-2 rounded-2xl ${backgroundClass} ${textClass}`}
    >
      {children}
    </p>
  );

  if (fullWidth) {
    return (
      <div className="w-full mx-auto">
        {content}
      </div>
    );
  }

  return content;
};

export default SectionHeaderContainer;