"use client";

/**
 * Typed signature form for accepting a quote.
 *
 * Customer enters name + title, checks "I accept", clicks "Accept Quote".
 * Calls POST /api/quotes/[id]/accept.
 */
import { useState } from "react";

export default function AcceptForm({
  quoteId,
  onAccepted,
}: {
  quoteId: string;
  onAccepted: () => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!agreed) {
      setError("Please check the box to accept this quote");
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/quotes/${quoteId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signedBy: name.trim(),
        signedByTitle: title.trim() || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to accept quote");
      return;
    }

    onAccepted();
  }

  return (
    <div className="rounded-lg border-2 border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Accept This Quote</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="accept-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Your Name *
            </label>
            <input
              id="accept-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full h-9 rounded-md border px-3 text-sm"
              required
            />
          </div>
          <div>
            <label
              htmlFor="accept-title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Your Title
            </label>
            <input
              id="accept-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Operations Manager"
              className="w-full h-9 rounded-md border px-3 text-sm"
            />
          </div>
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-gray-700">
            I accept this quote and agree to the terms. I understand that my
            typed name above serves as my electronic signature.
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Accepting..." : "Accept Quote"}
        </button>
      </form>
    </div>
  );
}
