import { getSession, signIn } from "next-auth/react";

export async function getServerSideProps(context) {
  const session = await getSession(context);

  // If user is already logged in → send to homepage
  if (session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return { props: {} };
}

export default function LoginPage() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "#f4f4f4"
    }}>
      
      <h1 style={{ marginBottom: "40px", fontSize: "32px", color: "#500000" }}>
        Welcome — Please Sign In
      </h1>

      <button
        onClick={() => signIn("google")}
        style={{
          padding: "12px 24px",
          fontSize: "18px",
          borderRadius: "8px",
          backgroundColor: "#4285F4",
          color: "white",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}
      >
        <img 
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google Logo"
          style={{ width: "24px", height: "24px" }}
        />
        Sign in with Google
      </button>

    </div>
  );
}
