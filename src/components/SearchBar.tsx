import { MdSearch } from 'react-icons/md';

interface SearchBarProps {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search for Election' }: SearchBarProps) {
  return (
    <div className="relative inline-flex w-full max-w-[380px] md:w-auto rounded-md border border-gray-300 overflow-hidden bg-white items-center">
      <MdSearch className="absolute left-3 text-gray-400" size={20} />
      <input
        type="text"
        placeholder={placeholder}
        className="w-full h-[44px] md:h-10 pl-10 pr-4 rounded-md text-base border-none focus:outline-none"
        value={value}
        onChange={onChange}
      />
    </div>
  );
} 