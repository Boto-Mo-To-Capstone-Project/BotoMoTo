import { ReactNode } from "react";

type SectionHeaderContainerProps = {
  children: ReactNode;
  variant?: "white" | "yellow" | "gray";
};

const SectionHeaderContainer = ({
  children,
  variant = "white",
}: SectionHeaderContainerProps) => {
  let backgroundClass = "";

  switch (variant) {
    case "yellow":
      backgroundClass = "bg-secondary ";
      break;
    case "gray":
      backgroundClass = "bg-gray-100 ";
      break;
    case "white":
    default:
      backgroundClass = "bg-white";
      break;
  }

  return (
    <p
      className={`survey-section border px-6 py-5 border-gray-200 mb-2 ${backgroundClass}`}
    >
      {children}
    </p>
  );
};

export default SectionHeaderContainer;
