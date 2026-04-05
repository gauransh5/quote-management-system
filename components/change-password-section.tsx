"use client";

/**
 * Wraps the change-password form behind a "Change password" button.
 * Clicking the button reveals the form; user can cancel to hide it.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import ChangePasswordForm from "@/components/change-password-form";

export default function ChangePasswordSection() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <Button
        variant={showForm ? "outline" : "default"}
        onClick={() => setShowForm((prev) => !prev)}
      >
        {showForm ? "Cancel" : "Change password"}
      </Button>
      {showForm && (
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      )}
    </div>
  );
}
