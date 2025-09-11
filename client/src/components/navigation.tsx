import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bell, Plus, User, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Navigation() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const navItems = [
    { href: "/", label: "Home", active: location === "/" },
    { href: "/venues", label: "Venues", active: location === "/venues" },
    { href: "/matches", label: "Matches", active: location === "/matches" },
    { href: "/shop", label: "Shop", active: location === "/shop" },
  ];

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} data-testid={`link-nav-${item.label.toLowerCase()}`}>
          <Button
            variant={item.active ? "default" : "ghost"}
            className={mobile ? "w-full justify-start" : ""}
          >
            {item.label}
          </Button>
        </Link>
      ))}
      <Link href="/create-match" data-testid="link-create-match">
        <Button className={mobile ? "w-full justify-start" : ""}>
          <Plus className="h-4 w-4 mr-2" />
          Create Match
        </Button>
      </Link>
    </>
  );

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50" data-testid="navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" data-testid="link-logo">
              <h1 className="text-2xl font-bold text-primary">Playkers</h1>
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <NavItems />
              </div>
            </div>
          </div>

          {isAuthenticated && (
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6 space-x-4">
                <Button variant="ghost" size="icon" data-testid="button-notifications">
                  <Bell className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-profile-menu">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.profileImageUrl} alt="Profile" />
                        <AvatarFallback>
                          {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <Link href="/profile" data-testid="link-profile">
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem onClick={() => window.location.href = '/api/logout'} data-testid="button-logout">
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col space-y-4 mt-6">
                  <NavItems mobile />
                  {isAuthenticated && (
                    <>
                      <Link href="/profile" data-testid="link-profile-mobile">
                        <Button variant="ghost" className="w-full justify-start">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={() => window.location.href = '/api/logout'}
                        data-testid="button-logout-mobile"
                      >
                        Logout
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
