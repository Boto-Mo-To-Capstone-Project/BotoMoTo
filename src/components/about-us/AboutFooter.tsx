import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from "react-icons/fa";

export default function AboutFooter() {
  return (
    <footer className="flex flex-col items-center h-28 w-full bg-white text-gray-400">
        {/* Left side */}
        <div className="border-t border-gray-400 w-4/5 mb-10"></div>

        <div className="flex justify-between items-center w-4/5 ">
            <p className="text-md font-normal">
            © {new Date().getFullYear()} Organization Mo 'To. All rights reserved.
            </p>

            {/* Right side */}
            <div className="flex gap-4 text-lg">
                <a
                href="https://facebook.com/yourorg"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-500 transition-colors"
                >
                <FaFacebook size={24}/>
                </a>
                <a
                href="https://twitter.com/yourorg"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-sky-400 transition-colors"
                >
                <FaTwitter size={24}/>
                </a>
                <a
                href="https://instagram.com/yourorg"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-pink-500 transition-colors"
                >
                <FaInstagram size={24}/>
                </a>
                <a
                href="https://linkedin.com/company/yourorg"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors"
                >
                <FaLinkedin size={24}/>
                </a>
            </div>
        </div>

        
    </footer>
  );
}
