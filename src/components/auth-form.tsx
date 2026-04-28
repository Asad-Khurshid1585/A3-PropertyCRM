"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const payload =
      mode === "login" ? { email, password } : { name, email, password };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    if (!response.ok || !body.success) {
      setError(body.error || "Request failed");
      setLoading(false);
      return;
    }

    const role = body.data?.user?.role;
    router.replace(role === "admin" ? "/dashboard/admin" : "/dashboard/agent");
    router.refresh();
  };

  return (
    <form className="crm-card w-full max-w-md space-y-4 p-6" onSubmit={handleSubmit}>
      <h1 className="text-2xl font-bold">
        {mode === "login" ? "Login to CRM" : "Create CRM account"}
      </h1>

      {mode === "signup" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            className="crm-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          className="crm-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Password</label>
        <input
          className="crm-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <button className="crm-button w-full" disabled={loading} type="submit">
        {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
      </button>
    </form>
  );
}
