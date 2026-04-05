import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import UserManagement from "./user-management";

/**
 * User management page — admin only.
 *
 * Server component that fetches users, passes to client component for
 * create-user form and list rendering.
 *
 * Access control: redirects non-admin users to /dashboard.
 */
export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      title: true,
      role: true,
      photoUrl: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <p className="text-muted-foreground mt-1">
        Manage sales team and admin accounts
      </p>
      <UserManagement initialUsers={users} currentUserId={session.user.id} />
    </div>
  );
}
