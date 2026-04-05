/**
 * Profile page — authenticated portal users.
 *
 * Displays all profile details (name, email, title, role, photo).
 * Change password is behind a button that reveals the form.
 * Access: any logged-in user (layout already enforces auth).
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ChangePasswordSection from "@/components/change-password-section";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, title: true, role: true, photoUrl: true },
  });

  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="text-muted-foreground mt-1">
        Your account details and password
      </p>

      <div className="mt-6 space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.photoUrl && (
              <div className="flex items-center gap-4">
                <div className="relative size-16 rounded-full overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.photoUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
              </div>
            )}
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                <dd className="mt-0.5 text-sm">{user.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                <dd className="mt-0.5 text-sm">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Title</dt>
                <dd className="mt-0.5 text-sm">{user.title ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                <dd className="mt-0.5 text-sm">{user.role}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Change your password. You will use the new password the next time you sign in.
            </p>
          </CardHeader>
          <CardContent>
            <ChangePasswordSection />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
