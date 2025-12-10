// pages/auth/manager-access.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

export default function ManagerAccessPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session || !session.user) return;

    const role = session.user.role || "customer";

    if (role === "manager") {
      router.replace("/manager");
    }
  }, [session, router]);

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
        body: JSON.stringify({
          requestedRole: "manager", 
          password,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error(
          "Failed to parse JSON from /api/staff/verify-password:",
          jsonErr
        );
        setError("Server returned an invalid response.");
        setLoading(false);
        return;
      }

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Invalid manager password.");
        setLoading(false);
        return;
      }

      // 2) Upgrade role in DB and redirect via after-login
      router.push("/staff/after-login?role=manager");
    } catch (err) {
      console.error("Unexpected error in manager-access:", err);
      setError("Unexpected error. Please try again.");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <p style={{ padding: "20px" }}>Loading session…</p>;
  }

  // Not signed in with Google yet
  if (!session) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Manager Access</h1>
        <p>You must sign in with Google before entering the manager area.</p>
        <button
          onClick={() =>
            signIn("google", { callbackUrl: "/auth/manager-access" })
          }
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

  // Already manager: useEffect will redirect; this is just a small placeholder
  if (session.user.role === "manager") {
    return (
      <div style={{ padding: "20px" }}>
        <p>Redirecting you to the manager dashboard...</p>
      </div>
    );
  }

  // Everyone else (customer or employee) must enter the manager password
  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
      <h1>Manager Access</h1>
      <p>Enter the manager access password to continue.</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="password">Manager Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>

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
