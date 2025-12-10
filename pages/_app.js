// pages/_app.js
import "../styles/globals.css";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

export default function MyApp({
  Component,
  pageProps: { session, ...pageProps },
}) {
  useEffect(() => {
    // Load Google Translate script ONCE globally
    const script = document.createElement("script");
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    // Callback Google uses after loading the script
    window.googleTranslateElementInit = () => {
      if (!window.google?.translate) return;

      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };
  }, []);

  return (
    <SessionProvider session={session}>
      {/* Must exist globally so Google can mount its widget/iframe */}
      <div id="google_translate_element" style={{ display: "none" }} />

      <Component {...pageProps} />
    </SessionProvider>
  );
}
