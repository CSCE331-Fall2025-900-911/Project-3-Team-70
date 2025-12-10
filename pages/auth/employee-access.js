// pages/auth/employee-access.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

export default function EmployeeAccessPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session || !session.user) return;

    const role = session.user.role || "customer";

    // Managers should also be allowed into cashier
    if (role === "employee" || role === "manager") {
      router.replace("/cashier");
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
      // 1) Verify employee password against env var
      const res = await fetch("/api/staff/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedRole: "employee", // ✅ important: API expects requestedRole
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
        setError(data?.error || "Invalid employee password.");
        setLoading(false);
        return;
      }

      // 2) Tell the server to upgrade our role and redirect
      // This page will UPDATE app_users.userRole and then redirect
      router.push("/staff/after-login?role=employee");
    } catch (err) {
      console.error("Unexpected error in employee-access:", err);
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
        <h1>Employee Access</h1>
        <p>You must sign in with Google before entering the employee area.</p>
        <button
          onClick={() =>
            signIn("google", { callbackUrl: "/auth/employee-access" })
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

  // If user already has role, the useEffect above will redirect them.
  // We can show a tiny "Redirecting..." just in case.
  if (session.user.role === "employee" || session.user.role === "manager") {
    return (
      <div style={{ padding: "20px" }}>
        <p>Redirecting you to the cashier...</p>
      </div>
    );
  }

  // Otherwise, they're a "customer" and need to enter the employee password
  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
      <h1>Employee Access</h1>
      <p>Enter the employee access password to continue.</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="password">Employee Password</label>
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
          {loading ? "Checking..." : "Enter Employee Area"}
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
