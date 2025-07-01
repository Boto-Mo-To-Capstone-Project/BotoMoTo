import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <Link href="/">Home</Link> | <Link href="/admin">Admin</Link> | <Link href="/user">User</Link>
    </nav>
  );
}