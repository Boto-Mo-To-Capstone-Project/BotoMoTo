import { ReactNode } from "react";

type SectionHeaderContainerProps = {
  children: ReactNode;
  variant?: "white" | "yellow" | "gray";
  fullWidth?: boolean;
};

const SectionHeaderContainer = ({
  children,
  variant = "white",
  fullWidth = false,
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

  const content = (
    <p
      className={`survey-section border px-6 py-5 border-gray-200 mb-2 rounded-2xl ${backgroundClass}`}
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
