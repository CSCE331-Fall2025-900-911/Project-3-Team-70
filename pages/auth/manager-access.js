// pages/auth/manager-access.js
import { useState } from "react";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

export default function ManagerAccessPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!session?.user?.email) {
      setError("Please sign in with Google first.");
      return;
    }

    setLoading(true);
    try {
      // 1) Verify manager password
      const res = await fetch("/api/staff/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "manager", password }),
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("Failed to parse JSON from /api/verify-password:", jsonErr);
        setError("Server returned an invalid response.");
        setLoading(false);
        return;
      }

      if (!res.ok || !data.ok) {
        setError(data?.error || "Incorrect manager password.");
        setLoading(false);
        return;
      }

      // 2) Update role in DB
      const roleRes = await fetch("/api/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "manager" }),
      });

      let roleData;
      try {
        roleData = await roleRes.json();
      } catch (jsonErr) {
        console.error("Failed to parse JSON from /api/role:", jsonErr);
        setError("Server returned an invalid response.");
        setLoading(false);
        return;
      }

      if (!roleRes.ok || !roleData?.success) {
        setError(roleData?.error || "Could not set manager role.");
        setLoading(false);
        return;
      }

      // 3) Go to manager dashboard
      router.push("/manager");
    } catch (err) {
      console.error("Unexpected error in manager-access:", err);
      setError("Unexpected error. Please try again.");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <p style={{ padding: "20px" }}>Loading session…</p>;
  }

  if (!session) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Manager Access</h1>
        <p>You must sign in with Google before entering the manager area.</p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/auth/manager-access" })}
          style={{
            padding: "12px 24px",
            backgroundColor: "#500000",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Sign in with Google
        </button>
        <p style={{ marginTop: "10px" }}>
          <Link href="/">Back to home</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Manager Access</h1>
      <p>Signed in as {session.user.email}</p>
      <p>Enter the manager password to access the Manager dashboard.</p>

      <form onSubmit={handleSubmit} style={{ maxWidth: "320px" }}>
        <input
          type="password"
          placeholder="Manager password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            margin: "10px 0",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#500000",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {loading ? "Checking..." : "Enter Manager Area"}
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: "10px" }}>
          {error}
        </p>
      )}

      <p style={{ marginTop: "10px" }}>
        <Link href="/">Back to home</Link>
      </p>
    </div>
  );
}
