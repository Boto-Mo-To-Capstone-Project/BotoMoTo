import { MdSearch } from 'react-icons/md';

interface SearchBarProps {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search for Election' }: SearchBarProps) {
  return (
    <div className="relative flex items-center w-full max-w-[380px] h-[44px] md:w-[400px] md:h-10 mx-auto md:mx-0">
      <MdSearch className="absolute left-3 text-gray-400" size={20} />
      <input
        type="text"
        placeholder={placeholder}
        className="w-full h-[44px] md:h-10 pl-10 pr-4 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-primary"
        value={value}
        onChange={onChange}
      />
    </div>
  );
} 