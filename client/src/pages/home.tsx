import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import VenueCard from "@/components/venue-card";
import MatchCard from "@/components/match-card";
import ProductCard from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Plus, MapPin, Users, Calendar, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: venues = [] } = useQuery({
    queryKey: ["/api/venues"],
    enabled: isAuthenticated,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["/api/matches"],
    enabled: isAuthenticated,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    enabled: isAuthenticated,
  });

  const { data: userStats = [] } = useQuery({
    queryKey: ["/api/user/stats"],
    enabled: isAuthenticated,
  });

  const { data: userMatches = [] } = useQuery({
    queryKey: ["/api/user/matches"],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  const featuredVenues = venues.slice(0, 3);
  const upcomingMatches = matches.filter((match: any) => match.status === "upcoming").slice(0, 2);
  const featuredProducts = products.slice(0, 4);

  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      <Navigation />

      {/* Welcome Section */}
      <section className="bg-gradient-to-br from-primary/10 to-accent/10 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Ready to play? Book venues, join matches, or organize your own games.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/venues">
                <Button size="lg" data-testid="button-browse-venues">
                  <MapPin className="h-5 w-5 mr-2" />
                  Browse Venues
                </Button>
              </Link>
              <Link href="/create-match">
                <Button variant="outline" size="lg" data-testid="button-create-match">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Match
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card data-testid="stat-matches-played">
              <CardContent className="p-6 text-center">
                <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {userStats.reduce((sum: number, stat: any) => sum + (stat.matchesPlayed || 0), 0)}
                </div>
                <p className="text-muted-foreground text-sm">Matches Played</p>
              </CardContent>
            </Card>
            <Card data-testid="stat-matches-won">
              <CardContent className="p-6 text-center">
                <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {userStats.reduce((sum: number, stat: any) => sum + (stat.matchesWon || 0), 0)}
                </div>
                <p className="text-muted-foreground text-sm">Matches Won</p>
              </CardContent>
            </Card>
            <Card data-testid="stat-upcoming-matches">
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{upcomingMatches.length}</div>
                <p className="text-muted-foreground text-sm">Upcoming</p>
              </CardContent>
            </Card>
            <Card data-testid="stat-venues-nearby">
              <CardContent className="p-6 text-center">
                <MapPin className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{venues.length}</div>
                <p className="text-muted-foreground text-sm">Venues Nearby</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Sports Categories */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Choose Your Sport</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { name: "Cricket", emoji: "🏏", path: "/venues?sport=cricket" },
              { name: "Football", emoji: "⚽", path: "/venues?sport=football" },
              { name: "Volleyball", emoji: "🏐", path: "/venues?sport=volleyball" },
              { name: "Tennis", emoji: "🎾", path: "/venues?sport=tennis" },
              { name: "Kabaddi", emoji: "🤼", path: "/venues?sport=kabaddi" },
            ].map((sport) => (
              <Link key={sport.name} href={sport.path}>
                <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer" data-testid={`card-sport-${sport.name.toLowerCase()}`}>
                  <CardContent className="p-6">
                    <div className="text-4xl mb-4">{sport.emoji}</div>
                    <h3 className="font-semibold text-lg">{sport.name}</h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Venues */}
      {featuredVenues.length > 0 && (
        <section className="py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-3xl font-bold">Popular Venues Near You</h2>
              <Link href="/venues">
                <Button variant="outline" data-testid="button-view-all-venues">View All</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredVenues.map((venue: any) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-3xl font-bold">Upcoming Matches</h2>
              <Link href="/matches">
                <Button variant="outline" data-testid="button-view-all-matches">View All</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {upcomingMatches.map((match: any) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sports Equipment */}
      {featuredProducts.length > 0 && (
        <section className="py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-3xl font-bold">Sports Equipment</h2>
              <Link href="/shop">
                <Button variant="outline" data-testid="button-view-all-products">View All</Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {featuredProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {userMatches.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-3xl font-bold">Your Recent Matches</h2>
              <Link href="/profile">
                <Button variant="outline" data-testid="button-view-profile">View Profile</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {userMatches.slice(0, 4).map((match: any) => (
                <MatchCard key={match.id} match={match} showActions={false} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
