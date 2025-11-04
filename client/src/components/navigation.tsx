import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bell, Plus, User, Menu, Settings, Search, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import SearchPlayerDialog from "@/components/search-player-dialog";
import InvitePlayerDialog from "@/components/invite-player-dialog";
import NotificationsDropdown from "@/components/notifications-dropdown";

export default function Navigation() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      // Refresh the page to clear the authentication state
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { href: "/", label: "Home", active: location === "/" },
    { href: "/venues", label: "Venues", active: location === "/venues" },
    { href: "/matches", label: "Matches", active: location === "/matches" },
    { href: "/teams", label: "Teams", active: location.startsWith("/teams") },
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
              <div className="ml-4 flex items-center md:ml-6 space-x-2">
                <SearchPlayerDialog 
                  trigger={
                    <Button variant="ghost" size="sm" data-testid="button-nav-search-player">
                      <Search className="h-4 w-4 mr-2" />
                      Search Player
                    </Button>
                  }
                />
                <InvitePlayerDialog 
                  trigger={
                    <Button variant="ghost" size="sm" data-testid="button-nav-invite-player">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Player
                    </Button>
                  }
                />
                <NotificationsDropdown />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-profile-menu">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.profileImageUrl || undefined} alt="Profile" />
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
                    <Link href="/admin" data-testid="link-admin">
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
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
                      <SearchPlayerDialog 
                        trigger={
                          <Button variant="ghost" className="w-full justify-start" data-testid="button-nav-search-player-mobile">
                            <Search className="mr-2 h-4 w-4" />
                            Search Player
                          </Button>
                        }
                      />
                      <InvitePlayerDialog 
                        trigger={
                          <Button variant="ghost" className="w-full justify-start" data-testid="button-nav-invite-player-mobile">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Invite Player
                          </Button>
                        }
                      />
                      <Link href="/profile" data-testid="link-profile-mobile">
                        <Button variant="ghost" className="w-full justify-start">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Button>
                      </Link>
                      <Link href="/admin" data-testid="link-admin-mobile">
                        <Button variant="ghost" className="w-full justify-start">
                          <Settings className="mr-2 h-4 w-4" />
                          Admin Panel
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={handleLogout}
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
