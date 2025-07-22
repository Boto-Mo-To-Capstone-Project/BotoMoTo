// Folder: your-project/app/admin/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
    const session = await auth();

    if (!session) {
        redirect("/api/auth/signin");
    }

    return (
        <div>
            <h1>Admin Dashboard</h1>
            <p>Welcome, {session.user?.name}</p>
        </div>
    );
}
