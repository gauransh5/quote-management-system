import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import ProductManagement from "./product-management";

/**
 * Products page — admin only.
 *
 * Server component that fetches products, passes to client component
 * for CRUD rendering.
 */
export default async function ProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const serialized = products.map((p) => ({
    ...p,
    defaultPrice: p.defaultPrice ? Number(p.defaultPrice) : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Products</h1>
      <p className="text-muted-foreground mt-1">
        Manage your product and service catalog
      </p>
      <ProductManagement initialProducts={serialized} />
    </div>
  );
}
