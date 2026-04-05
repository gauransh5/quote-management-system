import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TemplateManagement from "./template-management";

/**
 * Templates page — admin only.
 *
 * Server component that fetches all templates (with items), passes to client
 * component for CRUD rendering.
 */
export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const templates = await prisma.quoteTemplate.findMany({
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { name: "asc" },
  });

  const serialized = templates.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    items: t.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      itemType: item.itemType as "standard" | "hourly",
    })),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Quote Templates</h1>
      <p className="text-muted-foreground mt-1">
        Manage reusable line-item sets that can be loaded into any quote
      </p>
      <TemplateManagement initialTemplates={serialized} />
    </div>
  );
}
