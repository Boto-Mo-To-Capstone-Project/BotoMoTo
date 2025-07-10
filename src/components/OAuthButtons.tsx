// components/OAuthButtons.tsx
import Image from "next/image";
import GoogleIcon from "@/app/assets/google-icon.png";
import FacebookIcon from "@/app/assets/facebook-icon.png";
import { signIn } from "next-auth/react";

export function OAuthButtons() {
  return (
    <div className="flex justify-center">
      <div className="w-[380px] flex justify-between">
        <button
          onClick={() => signIn("google")}
          className="w-[187px] h-[44px] flex items-center justify-center border border-gray-300 rounded-md text-sm gap-2 hover:bg-gray-50"
        >
          <Image src={GoogleIcon} alt="Google" className="w-5 h-5" />
          Google
        </button>
        <button
          onClick={() => signIn("facebook")}
          className="w-[187px] h-[44px] flex items-center justify-center border border-gray-300 rounded-md text-sm gap-2 hover:bg-gray-50"
        >
          <Image src={FacebookIcon} alt="Facebook" className="w-5 h-5" />
          Facebook
        </button>
      </div>
    </div>
  );
}
