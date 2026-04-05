import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Bell, ChevronDown, Search } from "lucide-react";

const NAV_LINKS = [
  { label: "Dashboard" },
  { label: "Markets" },
  { label: "Analysis" },
  { label: "Tools" },
  { label: "Volume" },
  { label: "Account" },
];

interface TopNavProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeView: string;
  onViewChange: (view: string) => void;
}

export function TopNav({
  searchQuery,
  onSearchChange,
  activeView,
  onViewChange,
}: TopNavProps) {
  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.130 0.016 240 / 0.98) 0%, oklch(0.112 0.012 240 / 0.95) 100%)",
        borderBottom: "1px solid oklch(1 0 0 / 0.07)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center h-16 px-6 gap-8">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.785 0.135 200), oklch(0.620 0.170 260))",
              color: "oklch(0.112 0.012 240)",
            }}
          >
            T
          </div>
          <span
            className="font-bold text-lg tracking-tight"
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            Trading Terminal
          </span>
        </div>

        {/* Nav Links */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link) => {
            const isActive = activeView === link.label;
            return (
              <button
                key={link.label}
                type="button"
                data-ocid="nav.link"
                onClick={() => onViewChange(link.label)}
                className="relative px-4 py-2 text-sm font-medium transition-colors rounded-lg"
                style={{
                  color: isActive
                    ? "oklch(0.910 0.015 240)"
                    : "oklch(0.612 0.020 240)",
                  background: isActive ? "oklch(1 0 0 / 0.06)" : "transparent",
                }}
              >
                {link.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, oklch(0.785 0.135 200), oklch(0.620 0.170 260))",
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative hidden lg:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "oklch(0.612 0.020 240)" }}
          />
          <Input
            data-ocid="nav.search_input"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-56 pl-9 h-9 rounded-full text-sm"
            style={{
              background: "oklch(1 0 0 / 0.05)",
              border: "1px solid oklch(1 0 0 / 0.10)",
              color: "oklch(0.910 0.015 240)",
            }}
          />
        </div>

        {/* Bell */}
        <button
          type="button"
          data-ocid="nav.button"
          className="relative p-2 rounded-lg transition-colors hover:bg-white/5"
          aria-label="Notifications"
        >
          <Bell
            className="w-5 h-5"
            style={{ color: "oklch(0.612 0.020 240)" }}
          />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "oklch(0.637 0.220 25)" }}
          />
        </button>

        {/* User chip */}
        <button
          type="button"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/5 transition-colors"
          style={{ border: "1px solid oklch(1 0 0 / 0.08)" }}
          data-ocid="nav.button"
        >
          <Avatar className="w-7 h-7">
            <AvatarFallback
              className="text-xs font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.785 0.135 200), oklch(0.620 0.170 260))",
                color: "oklch(0.112 0.012 240)",
              }}
            >
              TR
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col leading-none">
            <span
              className="text-xs font-medium"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              Trader
            </span>
            <div className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse-slow"
                style={{ background: "oklch(0.723 0.185 150)" }}
              />
              <span
                className="text-[10px]"
                style={{ color: "oklch(0.723 0.185 150)" }}
              >
                Active
              </span>
            </div>
          </div>
          <ChevronDown
            className="w-3.5 h-3.5"
            style={{ color: "oklch(0.612 0.020 240)" }}
          />
        </button>
      </div>
    </header>
  );
}
