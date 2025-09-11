import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import MatchCard from "@/components/match-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function Matches() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedSport, setSelectedSport] = useState("");

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

  const { data: allMatches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["/api/matches", { sport: selectedSport }],
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

  const sports = ["cricket", "football", "volleyball", "tennis", "kabaddi"];
  
  const upcomingMatches = allMatches.filter((match: any) => match.status === "upcoming");
  const liveMatches = allMatches.filter((match: any) => match.status === "live");
  const completedMatches = allMatches.filter((match: any) => match.status === "completed");

  const MatchesGrid = ({ matches, emptyMessage }: { matches: any[]; emptyMessage: string }) => (
    <>
      {matchesLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading matches...</p>
          </div>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12" data-testid="empty-matches">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold mb-2">No matches found</h3>
          <p className="text-muted-foreground mb-4">{emptyMessage}</p>
          <Link href="/create-match">
            <Button data-testid="button-create-first-match">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Match
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {matches.map((match: any) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background" data-testid="matches-page">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Matches</h1>
          <Link href="/create-match">
            <Button data-testid="button-create-match-header">
              <Plus className="h-4 w-4 mr-2" />
              Create Match
            </Button>
          </Link>
        </div>

        {/* Sport Filter */}
        <div className="mb-8">
          <Select value={selectedSport} onValueChange={setSelectedSport}>
            <SelectTrigger className="w-[180px]" data-testid="select-sport-filter">
              <SelectValue placeholder="All Sports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Sports</SelectItem>
              {sports.map((sport) => (
                <SelectItem key={sport} value={sport}>
                  {sport.charAt(0).toUpperCase() + sport.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Matches Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="all" data-testid="tab-all-matches">
              All ({allMatches.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming-matches">
              Upcoming ({upcomingMatches.length})
            </TabsTrigger>
            <TabsTrigger value="live" data-testid="tab-live-matches">
              Live ({liveMatches.length})
            </TabsTrigger>
            <TabsTrigger value="my-matches" data-testid="tab-my-matches">
              My Matches ({userMatches.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" data-testid="content-all-matches">
            <MatchesGrid 
              matches={allMatches} 
              emptyMessage="No matches available. Create one to get started!" 
            />
          </TabsContent>

          <TabsContent value="upcoming" data-testid="content-upcoming-matches">
            <MatchesGrid 
              matches={upcomingMatches} 
              emptyMessage="No upcoming matches. Create one or check back later!" 
            />
          </TabsContent>

          <TabsContent value="live" data-testid="content-live-matches">
            <MatchesGrid 
              matches={liveMatches} 
              emptyMessage="No live matches right now. Check back during match times!" 
            />
          </TabsContent>

          <TabsContent value="my-matches" data-testid="content-my-matches">
            <MatchesGrid 
              matches={userMatches} 
              emptyMessage="You haven't joined any matches yet. Find matches to join!" 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
