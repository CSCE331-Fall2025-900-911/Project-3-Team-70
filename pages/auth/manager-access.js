import { useState } from "react";
import { signIn } from "next-auth/react";

export default function ManagerAccess() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    const res = await fetch("/api/staff/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: pw,
        requestedRole: "manager",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || "Invalid password");
      return;
    }

    await signIn("google", {
      callbackUrl: "/manager",
    });
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Manager Access</h1>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 260 }}>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Manager Password"
        />
        <button type="submit">Continue with Google</button>
      </form>
      {err && <p style={{ color: "red", marginTop: 10 }}>{err}</p>}
    </div>
  );
}
