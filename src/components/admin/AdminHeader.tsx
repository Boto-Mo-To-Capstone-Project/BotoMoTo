import { useState } from 'react';
import { Menu } from 'lucide-react';

export default function AdminHeader() {
  return (
    <header className="flex flex-col items-center justify-center px-4 pt-0 pb-1 md:pt-2 md:pb-2 bg-white sticky top-0 z-10 border-b md:static md:border-none">
      <h1 className="text-xl md:text-2xl font-bold leading-tight">Hi, Administrator!</h1>
      <p className="text-xs md:text-base text-gray-600 mt-1">Polytechnic University of the Philippines (PUP) Provident Fund</p>
    </header>
  );
} 