"use client";

/**
 * Product catalog management — admin only.
 *
 * Table of products with create, edit, and soft-delete actions.
 * Follows the same pattern as user-management.tsx.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  defaultPrice: number | null;
  unit: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const UNIT_OPTIONS = [
  { value: "unit", label: "Unit" },
  { value: "hour", label: "Hour" },
  { value: "month", label: "Month" },
  { value: "day", label: "Day" },
];

export default function ProductManagement({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Create form state
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [unit, setUnit] = useState("unit");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDefaultPrice, setEditDefaultPrice] = useState("");
  const [editUnit, setEditUnit] = useState("unit");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  function resetCreateForm() {
    setName("");
    setSku("");
    setDescription("");
    setCategory("");
    setDefaultPrice("");
    setUnit("unit");
    setCreateError("");
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditName(product.name);
    setEditSku(product.sku ?? "");
    setEditDescription(product.description ?? "");
    setEditCategory(product.category ?? "");
    setEditDefaultPrice(product.defaultPrice?.toString() ?? "");
    setEditUnit(product.unit);
    setEditError("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sku: sku || undefined,
        description: description || undefined,
        category: category || undefined,
        defaultPrice: defaultPrice ? parseFloat(defaultPrice) : undefined,
        unit,
      }),
    });

    setCreateLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setCreateError(data.error || "Failed to create product");
      return;
    }

    resetCreateForm();
    setShowCreate(false);
    router.refresh();
    const data = await res.json();
    setProducts((prev) => [...prev, data.data]);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditError("");
    setEditLoading(true);

    const res = await fetch(`/api/products/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        sku: editSku || null,
        description: editDescription || null,
        category: editCategory || null,
        defaultPrice: editDefaultPrice ? parseFloat(editDefaultPrice) : null,
        unit: editUnit,
      }),
    });

    setEditLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setEditError(data.error || "Failed to update product");
      return;
    }

    setEditingId(null);
    router.refresh();
    const data = await res.json();
    setProducts((prev) =>
      prev.map((p) => (p.id === editingId ? { ...p, ...data.data } : p))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this product? It will no longer appear in the quote builder.")) return;

    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: false } : p))
      );
      router.refresh();
    }
  }

  async function handleReactivate(id: string) {
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: true } : p))
      );
      router.refresh();
    }
  }

  const visibleProducts = showInactive
    ? products
    : products.filter((p) => p.active);

  const inactiveCount = products.filter((p) => !p.active).length;

  return (
    <div className="mt-6 space-y-4">
      {/* Actions bar */}
      <div className="flex items-center gap-3">
        <Button onClick={() => { setShowCreate(!showCreate); if (showCreate) resetCreateForm(); }}>
          {showCreate ? "Cancel" : "Add Product"}
        </Button>
        {inactiveCount > 0 && (
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showInactive ? "Hide inactive" : `Show ${inactiveCount} inactive`}
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Product</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prod-name">Name *</Label>
                  <Input
                    id="prod-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Static Guard Services"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prod-sku">SKU</Label>
                  <Input
                    id="prod-sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. SGS-001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-desc">Description</Label>
                <Input
                  id="prod-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prod-category">Category</Label>
                  <Input
                    id="prod-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Security"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prod-price">Default Price</Label>
                  <Input
                    id="prod-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prod-unit">Unit</Label>
                  <select
                    id="prod-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full h-9 rounded-md border px-3 text-sm"
                  >
                    {UNIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Creating..." : "Create Product"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Products table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">SKU</th>
              <th className="text-left px-4 py-2 font-medium">Category</th>
              <th className="text-right px-4 py-2 font-medium">Default Price</th>
              <th className="text-left px-4 py-2 font-medium">Unit</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No products yet. Add your first product above.
                </td>
              </tr>
            ) : (
              visibleProducts.map((product) =>
                editingId === product.id ? (
                  <tr key={product.id} className="border-b bg-gray-50">
                    <td colSpan={6} className="px-4 py-3">
                      <form onSubmit={handleEdit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Name *</Label>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">SKU</Label>
                            <Input
                              value={editSku}
                              onChange={(e) => setEditSku(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Category</Label>
                            <Input
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Default Price</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editDefaultPrice}
                              onChange={(e) => setEditDefaultPrice(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Unit</Label>
                            <select
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              className="w-full h-9 rounded-md border px-3 text-sm"
                            >
                              {UNIT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {editError && <p className="text-sm text-red-600">{editError}</p>}
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={editLoading}>
                            {editLoading ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={product.id}
                    className={`border-b hover:bg-gray-50 transition-colors ${!product.active ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-2">
                      <div className="font-medium">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {product.sku ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {product.category ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {product.defaultPrice != null
                        ? `$${product.defaultPrice.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {UNIT_OPTIONS.find((o) => o.value === product.unit)?.label ?? product.unit}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {product.active ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => startEdit(product)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(product.id)}
                            >
                              Deactivate
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleReactivate(product.id)}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
