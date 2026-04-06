import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Bell,
  Calendar,
  ChevronDown,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  Star,
  User,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Dashboard" },
  { label: "Markets" },
  { label: "Analysis" },
  { label: "Statistics" },
  { label: "Tools" },
  { label: "Volume" },
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
  const [traderOpen, setTraderOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  function handleMobileNavClick(label: string) {
    onViewChange(label);
    setMobileMenuOpen(false);
  }

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
      <div className="flex items-center h-14 sm:h-16 px-3 sm:px-6 gap-2 sm:gap-4 md:gap-8">
        {/* Hamburger — mobile only */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              data-ocid="nav.button"
              className="md:hidden p-2 rounded-lg transition-colors hover:bg-white/5 shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu
                className="w-5 h-5"
                style={{ color: "oklch(0.612 0.020 240)" }}
              />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[260px] p-0 overflow-hidden"
            style={{
              background: "oklch(0.130 0.016 240)",
              border: "1px solid oklch(1 0 0 / 0.10)",
            }}
          >
            <SheetHeader className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.785 0.135 200), oklch(0.620 0.170 260))",
                      color: "oklch(0.112 0.012 240)",
                    }}
                  >
                    T
                  </div>
                  <span
                    className="font-bold text-base tracking-tight"
                    style={{ color: "oklch(0.910 0.015 240)" }}
                  >
                    Trading Terminal
                  </span>
                </SheetTitle>
              </div>
            </SheetHeader>

            <div
              className="h-px mx-0"
              style={{ background: "oklch(1 0 0 / 0.07)" }}
            />

            {/* Mobile search */}
            <div className="px-4 py-3">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "oklch(0.612 0.020 240)" }}
                />
                <Input
                  data-ocid="nav.search_input"
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-9 h-9 rounded-full text-sm"
                  style={{
                    background: "oklch(1 0 0 / 0.05)",
                    border: "1px solid oklch(1 0 0 / 0.10)",
                    color: "oklch(0.910 0.015 240)",
                  }}
                />
              </div>
            </div>

            <div
              className="h-px mx-0"
              style={{ background: "oklch(1 0 0 / 0.07)" }}
            />

            {/* Mobile nav links */}
            <nav className="py-2 px-2" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => {
                const isActive = activeView === link.label;
                return (
                  <button
                    key={link.label}
                    type="button"
                    data-ocid="nav.link"
                    onClick={() => handleMobileNavClick(link.label)}
                    className="relative w-full flex items-center px-4 py-3 text-sm font-medium transition-colors rounded-lg"
                    style={{
                      color: isActive
                        ? "oklch(0.910 0.015 240)"
                        : "oklch(0.612 0.020 240)",
                      background: isActive
                        ? "oklch(1 0 0 / 0.06)"
                        : "transparent",
                    }}
                  >
                    {isActive && (
                      <span
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
                        style={{
                          background:
                            "linear-gradient(180deg, oklch(0.785 0.135 200), oklch(0.620 0.170 260))",
                        }}
                      />
                    )}
                    <span className={isActive ? "ml-2" : ""}>{link.label}</span>
                  </button>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.785 0.135 200), oklch(0.620 0.170 260))",
              color: "oklch(0.112 0.012 240)",
            }}
          >
            T
          </div>
          <span
            className="hidden sm:inline font-bold text-base sm:text-lg tracking-tight"
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            Trading Terminal
          </span>
        </div>

        {/* Nav Links — desktop only */}
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
                className="relative px-3 lg:px-4 py-2 text-sm font-medium transition-colors rounded-lg"
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

        {/* Search — desktop */}
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
            className="w-48 xl:w-56 pl-9 h-9 rounded-full text-sm"
            style={{
              background: "oklch(1 0 0 / 0.05)",
              border: "1px solid oklch(1 0 0 / 0.10)",
              color: "oklch(0.910 0.015 240)",
            }}
          />
        </div>

        {/* Mobile search toggle — shown between sm and lg */}
        {mobileSearchOpen ? (
          <div className="flex items-center gap-2 lg:hidden">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: "oklch(0.612 0.020 240)" }}
              />
              <Input
                data-ocid="nav.search_input"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-36 sm:w-48 pl-8 h-8 rounded-full text-sm"
                autoFocus
                style={{
                  background: "oklch(1 0 0 / 0.05)",
                  border: "1px solid oklch(1 0 0 / 0.10)",
                  color: "oklch(0.910 0.015 240)",
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Close search"
            >
              <X
                className="w-4 h-4"
                style={{ color: "oklch(0.612 0.020 240)" }}
              />
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-ocid="nav.button"
            onClick={() => setMobileSearchOpen(true)}
            className="lg:hidden p-2 rounded-lg transition-colors hover:bg-white/5"
            aria-label="Search"
          >
            <Search
              className="w-4 h-4"
              style={{ color: "oklch(0.612 0.020 240)" }}
            />
          </button>
        )}

        {/* Bell */}
        <button
          type="button"
          data-ocid="nav.button"
          className="relative p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-white/5"
          aria-label="Notifications"
        >
          <Bell
            className="w-4 h-4 sm:w-5 sm:h-5"
            style={{ color: "oklch(0.612 0.020 240)" }}
          />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: "oklch(0.637 0.220 25)" }}
          />
        </button>

        {/* Trader Dropdown */}
        <Popover open={traderOpen} onOpenChange={setTraderOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/5 transition-colors"
              style={{ border: "1px solid oklch(1 0 0 / 0.08)" }}
              data-ocid="nav.open_modal_button"
            >
              <Avatar className="w-6 h-6 sm:w-7 sm:h-7">
                <AvatarFallback
                  className="text-[10px] sm:text-xs font-semibold"
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
                className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-200"
                style={{
                  color: "oklch(0.612 0.020 240)",
                  transform: traderOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[260px] p-0 overflow-hidden"
            style={{
              background: "oklch(0.155 0.020 240)",
              border: "1px solid oklch(1 0 0 / 0.10)",
              boxShadow: "0 16px 40px oklch(0 0 0 / 0.50)",
            }}
            data-ocid="nav.modal"
          >
            {/* Top: Avatar + Name + Badge */}
            <div className="flex flex-col items-center gap-2 pt-5 pb-4 px-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback
                  className="text-base font-bold"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.785 0.135 200), oklch(0.620 0.170 260))",
                    color: "oklch(0.112 0.012 240)",
                  }}
                >
                  TR
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center gap-1">
                <span
                  className="text-sm font-semibold"
                  style={{ color: "oklch(0.910 0.015 240)" }}
                >
                  Trader
                </span>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: "oklch(0.723 0.185 150 / 0.15)",
                    color: "oklch(0.723 0.185 150)",
                    border: "1px solid oklch(0.723 0.185 150 / 0.30)",
                  }}
                >
                  ● Active
                </span>
              </div>
            </div>

            {/* Divider */}
            <div
              className="mx-0 h-px"
              style={{ background: "oklch(1 0 0 / 0.07)" }}
            />

            {/* Account Detail Rows */}
            <div className="py-2 px-3">
              {[
                { icon: User, label: "Account ID", value: "#TRD-00142" },
                { icon: Shield, label: "Status", value: "Verified" },
                { icon: Calendar, label: "Member Since", value: "Jan 2024" },
                { icon: Star, label: "Plan", value: "Pro" },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 py-1.5 px-1"
                >
                  <Icon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: "oklch(0.612 0.020 240)" }}
                  />
                  <span
                    className="text-xs flex-1"
                    style={{ color: "oklch(0.612 0.020 240)" }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "oklch(0.820 0.015 240)" }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div
              className="mx-0 h-px"
              style={{ background: "oklch(1 0 0 / 0.07)" }}
            />

            {/* Action Rows */}
            <div className="py-2 px-2">
              {[
                {
                  icon: Settings,
                  label: "Profile Settings",
                  ocid: "nav.button",
                },
                { icon: Bell, label: "Notifications", ocid: "nav.button" },
                {
                  icon: HelpCircle,
                  label: "Help & Support",
                  ocid: "nav.button",
                },
              ].map(({ icon: Icon, label, ocid }) => (
                <button
                  key={label}
                  type="button"
                  data-ocid={ocid}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-xs font-medium transition-colors hover:bg-white/5"
                  style={{ color: "oklch(0.820 0.015 240)" }}
                >
                  <Icon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: "oklch(0.612 0.020 240)" }}
                  />
                  {label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div
              className="mx-0 h-px"
              style={{ background: "oklch(1 0 0 / 0.07)" }}
            />

            {/* Logout */}
            <div className="py-2 px-2">
              <button
                type="button"
                data-ocid="nav.button"
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-xs font-medium transition-colors hover:bg-red-500/10"
                style={{ color: "oklch(0.637 0.220 25)" }}
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                Log Out
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
