// components/OAuthButtons.tsx
import Image from "next/image";
import GoogleIcon from "@/app/assets/google-icon.png";
import FacebookIcon from "@/app/assets/facebook-icon.png";
import { signIn } from "next-auth/react";

export function OAuthButtons() {
  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-[380px] flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => signIn("google")}
          className="w-full h-[44px] flex items-center justify-center border border-gray-300 rounded-md text-sm gap-2 hover:bg-gray-50"
        >
          <Image src={GoogleIcon} alt="Google" className="w-5 h-5" />
          Google
        </button>
        <button
          onClick={() => signIn("facebook")}
          className="w-full h-[44px] flex items-center justify-center border border-gray-300 rounded-md text-sm gap-2 hover:bg-gray-50"
        >
          <Image src={FacebookIcon} alt="Facebook" className="w-5 h-5" />
          Facebook
        </button>
      </div>
    </div>
  );
}
