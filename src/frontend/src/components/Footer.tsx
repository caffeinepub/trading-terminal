import { Heart } from "lucide-react";
import { SiGithub, SiX } from "react-icons/si";

export function Footer() {
  const year = new Date().getFullYear();
  const utmLink = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`;

  return (
    <footer
      className="mt-8 py-6 px-6"
      style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Links */}
          <div className="flex items-center gap-5">
            {["About", "Support", "Disclaimer", "API Docs"].map((link) => (
              <button
                key={link}
                type="button"
                className="text-[12px] transition-colors"
                style={{ color: "oklch(0.450 0.012 240)" }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color =
                    "oklch(0.700 0.015 240)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color =
                    "oklch(0.450 0.012 240)";
                }}
              >
                {link}
              </button>
            ))}
          </div>

          {/* Social */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            >
              <SiGithub
                className="w-4 h-4"
                style={{ color: "oklch(0.500 0.015 240)" }}
              />
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
              className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            >
              <SiX
                className="w-4 h-4"
                style={{ color: "oklch(0.500 0.015 240)" }}
              />
            </a>
          </div>

          {/* Copyright */}
          <div
            className="text-[12px]"
            style={{ color: "oklch(0.400 0.010 240)" }}
          >
            &copy; {year}. Built with{" "}
            <Heart
              className="inline w-3 h-3 mx-0.5"
              style={{ color: "oklch(0.637 0.220 25)" }}
            />{" "}
            using{" "}
            <a
              href={utmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: "oklch(0.785 0.135 200)" }}
            >
              caffeine.ai
            </a>
          </div>
        </div>
      </div>

      {/* Help button */}
      <button
        type="button"
        data-ocid="footer.button"
        className="fixed bottom-6 right-6 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-transform hover:scale-110"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.785 0.135 200), oklch(0.620 0.170 260))",
          color: "oklch(0.112 0.012 240)",
          boxShadow: "0 4px 16px oklch(0.785 0.135 200 / 0.3)",
        }}
        aria-label="Help"
      >
        ?
      </button>
    </footer>
  );
}
