// pages/auth/manager-access.js
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
      body: JSON.stringify({ password: pw }),
    });

    if (!res.ok) {
      setErr("Incorrect password.");
      return;
    }

    // After Google login, we’ll handle role assignment in /staff/after-login
    signIn("google", {
      callbackUrl: "/staff/after-login?role=manager",
    });
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Manager Access</h1>
      <form onSubmit={submit}>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Enter staff password"
        />
        <button type="submit">Continue with Google</button>
      </form>
      {err && <p style={{ color: "red" }}>{err}</p>}
    </div>
  );
}
