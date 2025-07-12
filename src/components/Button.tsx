import { ButtonHTMLAttributes } from "react";
import { StaticImageData } from "next/image";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:
    | "primary"
    | "secondary"
    | "long_primary"
    | "long_secondary"
    | "short_primary"
    | "short_secondary"
    | "oauth";
  icon?: React.ReactNode | StaticImageData; // Accept both ReactNode and StaticImageData
};

const Button = ({
  children,
  className = "",
  variant = "primary",
  disabled = false,
  icon,
  ...rest
}: ButtonProps) => {
  const baseStyles =
    "rounded-lg h-11 px-3 btn-text cursor-pointer hover:brightness-90 flex items-center justify-center gap-3";

  const disabledStyles = "opacity-50 cursor-not-allowed hover:brightness-100";

  const variants = {
    primary: "bg-primary text-white xs:w-39",
    secondary: "border border-gray text-gray xs:w-39",
    long_primary: "bg-primary text-white w-39 xs:w-86",
    long_secondary: "border border-gray text-gray xs:w-86",
    short_primary: "bg-primary text-white xs:w-24",
    short_secondary: "border border-gray text-gray xs:w-24",
    oauth: "border-2 border-gray-200 text-gray xs:w-86",
  };

  // Helper function to render the icon
  const renderIcon = () => {
    if (!icon) return null;

    // If it's a StaticImageData (from next/image)
    if (typeof icon === "object" && "src" in icon) {
      return (
        <img
          src={icon.src}
          alt=""
          className="h-5 w-5" // Adjust size as needed
        />
      );
    }

    // If it's a regular ReactNode
    return <span>{icon}</span>;
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${
        disabled ? disabledStyles : ""
      } ${className}`}
      {...rest}
    >
      {variant === "oauth" && renderIcon()}
      {children}
    </button>
  );
};

export default Button;
