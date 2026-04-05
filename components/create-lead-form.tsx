"use client";

/**
 * Modal-style form to manually create a lead for offline sources
 * (phone call, referral, walk-in, email, etc.)
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { LEAD_SOURCE_OPTIONS, SERVICES, CITIES } from "@/lib/constants";

export default function CreateLeadForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [leadSource, setLeadSource] = useState("phone");

  function toggleCity(city: string) {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/quote-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone: phone || undefined,
        service: service || undefined,
        cities: selectedCities.length > 0 ? selectedCities : undefined,
        message: message || undefined,
        leadSource,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create lead");
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Create Lead Manually</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-name">Name *</Label>
              <Input
                id="lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-email">Email *</Label>
              <Input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="customer@company.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="204-555-1234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-source">Lead Source *</Label>
              <select
                id="lead-source"
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="w-full h-9 rounded-md border px-3 text-sm"
              >
                {LEAD_SOURCE_OPTIONS.map((src) => (
                  <option key={src.value} value={src.value}>
                    {src.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-service">Service</Label>
            <select
              id="lead-service"
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full h-9 rounded-md border px-3 text-sm"
            >
              <option value="">Select a service...</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Cities</Label>
            <div className="flex flex-wrap gap-2">
              {CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => toggleCity(city)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    selectedCities.includes(city)
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-message">Notes / Message</Label>
            <textarea
              id="lead-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full min-h-[60px] p-3 border rounded-md text-sm resize-y"
              placeholder="Details from the call, referral context, etc."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Lead"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
