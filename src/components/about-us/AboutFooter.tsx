import { FaLinkedin, FaGithubSquare } from "react-icons/fa";

export default function AboutFooter() {
  return (
    <footer className="flex flex-col items-center h-28 w-full bg-white text-gray-400 px-5 xs:px-20">
        {/* Left side */}
        <div className="border-t border-gray-400 w-full mb-10"></div>

        <div className="flex justify-between items-center w-full">
            <p className="text-md font-normal">
            © {new Date().getFullYear()} Boto Mo 'To. All rights reserved.
            </p>

            {/* Right side */}
            <div className="flex gap-4 text-lg">
                {/* <a
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
                </a> */}
                <a
                href="https://github.com/Boto-Mo-To-Capstone-Project/BotoMoTo"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900 transition-colors"
                >
                <FaGithubSquare size={24}/>
                </a>
                <a
                href="https://www.linkedin.com/in/chrstnjulia/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-800 transition-colors"
                >
                <FaLinkedin size={24}/>
                </a>
            </div>
        </div>

        
    </footer>
  );
}
