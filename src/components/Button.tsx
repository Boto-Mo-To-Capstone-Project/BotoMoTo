import { ButtonHTMLAttributes } from "react";

// ButtonHTMLAttributes is a TypeScript helper from React that ensures your custom Button component can accept all normal HTML button props
// Para hindi na isusulat isa isa ang props ng isang html button.

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "long_primary" | "secondary" | "long_secondary";
};

const Button = ({
  children,
  className = "",
  variant = "primary",
  ...rest
}: ButtonProps) => {
  const baseStyles =
    "rounded-lg h-11 px-3 btn-text cursor-pointer hover:brightness-90";

  const variants = {
    primary: "bg-primary text-white xs:w-39",
    long_primary: "bg-primary text-white xs:w-86",
    long_secondary: "border border-gray text-gray xs:w-86",
    secondary:
      "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
