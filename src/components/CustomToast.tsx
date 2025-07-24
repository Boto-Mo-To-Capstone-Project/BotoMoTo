import { MdCheckCircle, MdClose } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function CustomToast({ t, message }: { t: any; message: string }) {
  return (
    <div
      className={`flex items-center gap-2 bg-white shadow-md rounded px-4 py-2 border border-green-200 ${
        t.visible ? 'animate-enter' : 'animate-leave'
      }`}
      style={{ minWidth: 0, maxWidth: 400 }}
    >
      <MdCheckCircle className="text-green-500" size={20} />
      <span className="text-green-800 text-sm font-medium truncate">
        {message}
      </span>
      <button
        className="ml-2 text-gray-400 hover:text-red-500"
        onClick={() => toast.dismiss(t.id)}
        aria-label="Close"
      >
        <MdClose size={18} />
      </button>
    </div>
  );
} 