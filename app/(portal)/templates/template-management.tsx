"use client";

/**
 * Template management — admin only.
 *
 * Shows a table of templates. Admin can:
 * - Create a new template (name + line items)
 * - Edit an existing template (name + line items)
 * - Delete a template
 *
 * Each template has items: description, quantity, unit price, item type.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TemplateItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  itemType: "standard" | "hourly";
  sortOrder: number;
}

interface Template {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: TemplateItem[];
}

interface Props {
  initialTemplates: Template[];
}

const EMPTY_ITEM = (): TemplateItem => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
  itemType: "standard",
  sortOrder: 0,
});

export default function TemplateManagement({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [items, setItems] = useState<TemplateItem[]>([EMPTY_ITEM()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditId(null);
    setName("");
    setItems([EMPTY_ITEM()]);
    setError("");
    setShowForm(true);
  }

  function openEdit(template: Template) {
    setEditId(template.id);
    setName(template.name);
    setItems(
      template.items.length > 0
        ? template.items.map((i) => ({ ...i }))
        : [EMPTY_ITEM()]
    );
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setError("");
  }

  function updateItem(idx: number, field: keyof TemplateItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      )
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM(), sortOrder: prev.length }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError("");
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setError("At least one item with a description is required.");
      return;
    }
    setSaving(true);

    const payload = {
      name: name.trim(),
      items: validItems.map((item, idx) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        itemType: item.itemType,
        sortOrder: idx,
      })),
    };

    const url = editId ? `/api/templates/${editId}` : "/api/templates";
    const method = editId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save template");
      return;
    }

    const { data: saved } = await res.json();
    const mapped: Template = {
      ...saved,
      items: saved.items.map((i: { quantity: string | number; unitPrice: string | number; [key: string]: unknown }) => ({
        ...i,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      })),
    };

    if (editId) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === editId ? mapped : t))
      );
    } else {
      setTemplates((prev) => [...prev, mapped].sort((a, b) => a.name.localeCompare(b.name)));
    }

    closeForm();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setDeletingId(id);
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="mt-6 space-y-6 max-w-3xl">
      <div className="flex justify-end">
        <Button onClick={openCreate}>New Template</Button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editId ? "Edit Template" : "New Template"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Security Package"
              />
            </div>

            <div>
              <Label className="mb-2 block">Line Items</Label>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_100px_110px_32px] gap-2 items-start">
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      placeholder="Description"
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                      placeholder="Qty"
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                      placeholder="Unit price"
                    />
                    <select
                      value={item.itemType}
                      onChange={(e) => updateItem(idx, "itemType", e.target.value as "standard" | "hourly")}
                      className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="standard">Standard</option>
                      <option value="hourly">Hourly</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="h-9 w-8 flex items-center justify-center rounded text-gray-400 hover:text-red-500 disabled:opacity-30"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={addItem}
              >
                + Add Item
              </Button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editId ? "Save Changes" : "Create Template"}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates table */}
      {templates.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No templates yet. Create one to speed up quote building.
        </p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Items</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.items.length} item{t.items.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(t)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        {deletingId === t.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
