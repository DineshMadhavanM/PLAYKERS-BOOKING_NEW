import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import MatchCard from "@/components/match-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Users, Play, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import type { Team } from "@shared/schema";

export default function Matches() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedSport, setSelectedSport] = useState("all");
  
  // URL parameters for different modes
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'matches'; // 'matches', 'team-selection', 'opponent-selection'
  const selectedTeamId = urlParams.get('team');
  
  // Team search state
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [citySearchQuery, setCitySearchQuery] = useState("");

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
    queryKey: ["/api/matches", selectedSport],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSport && selectedSport !== "all") params.set("sport", selectedSport);
      
      const response = await fetch(`/api/matches?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: userMatches = [] } = useQuery({
    queryKey: ["/api/user/matches"],
    queryFn: async () => {
      const response = await fetch("/api/user/matches");
      if (!response.ok) throw new Error("Failed to fetch user matches");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Teams query for team selection mode
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['/api/teams', teamSearchQuery, citySearchQuery],
    queryFn: async (): Promise<Team[]> => {
      const params = new URLSearchParams();
      if (teamSearchQuery.trim()) {
        params.set('search', teamSearchQuery.trim());
      }
      if (citySearchQuery.trim()) {
        params.set('city', citySearchQuery.trim());
      }
      const response = await fetch(`/api/teams?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      return response.json();
    },
    enabled: isAuthenticated && (mode === 'team-selection' || mode === 'opponent-selection'),
  });

  // Get selected team details for opponent selection mode
  const { data: selectedTeam } = useQuery({
    queryKey: ['/api/teams', selectedTeamId],
    queryFn: async (): Promise<Team> => {
      const response = await fetch(`/api/teams/${selectedTeamId}`);
      if (!response.ok) throw new Error('Failed to fetch selected team');
      return response.json();
    },
    enabled: isAuthenticated && mode === 'opponent-selection' && !!selectedTeamId,
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

  // Function to handle team selection for starting a match
  const handleStartMatch = (team: Team) => {
    if (mode === 'team-selection') {
      // First team selected, now select opponent
      navigate(`/matches?mode=opponent-selection&team=${team.id}`);
    } else if (mode === 'opponent-selection') {
      // Opponent selected, redirect to create match with pre-filled data
      navigate(`/create-match?sport=cricket&team1=${selectedTeamId}&team2=${team.id}`);
    }
  };

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
          <Link href={selectedTeamId ? `/create-match?sport=cricket&team1=${selectedTeamId}` : '/create-match'}>
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

  // Render team selection interface
  const renderTeamSelection = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/matches')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Matches
        </Button>
        <div>
          <h2 className="text-2xl font-bold">
            {mode === 'team-selection' ? 'Select Your Team' : 'Select Opponent Team'}
          </h2>
          <p className="text-muted-foreground">
            {mode === 'team-selection' 
              ? 'Choose your team to start a match'
              : `Select an opponent for ${selectedTeam?.name || 'your team'}`
            }
          </p>
        </div>
      </div>

      {/* Search Interface */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search teams by name..."
            value={teamSearchQuery}
            onChange={(e) => setTeamSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-teams"
          />
        </div>
        <div className="relative">
          <Input
            placeholder="Search by city..."
            value={citySearchQuery}
            onChange={(e) => setCitySearchQuery(e.target.value)}
            className="w-full sm:w-64"
            data-testid="input-search-city"
          />
        </div>
      </div>

      {/* Teams Grid */}
      {teamsLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading teams...</p>
          </div>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {teamSearchQuery || citySearchQuery ? 'No teams found' : 'No teams available'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {teamSearchQuery || citySearchQuery 
              ? 'Try adjusting your search terms'
              : 'Create teams first to start matches'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teams
            .filter(team => mode === 'team-selection' || team.id !== selectedTeamId)
            .map((team) => (
              <TeamCard 
                key={team.id} 
                team={team} 
                onStartMatch={() => handleStartMatch(team)}
                mode={mode}
              />
            ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background" data-testid="matches-page">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Render different modes */}
        {mode === 'team-selection' || mode === 'opponent-selection' ? (
          renderTeamSelection()
        ) : (
          <>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Matches</h1>
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate('/matches?mode=team-selection')}
              variant="default"
              data-testid="button-start-match-flow"
            >
              <Users className="h-4 w-4 mr-2" />
              Start Match (Select Teams)
            </Button>
            <Link href={selectedTeamId ? `/create-match?sport=cricket&team1=${selectedTeamId}` : '/create-match'}>
              <Button variant="outline" data-testid="button-create-match-header">
                <Plus className="h-4 w-4 mr-2" />
                Create Match
              </Button>
            </Link>
          </div>
        </div>

        {/* Sport Filter */}
        <div className="mb-8">
          <Select value={selectedSport} onValueChange={setSelectedSport}>
            <SelectTrigger className="w-[180px]" data-testid="select-sport-filter">
              <SelectValue placeholder="All Sports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
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
          </>
        )}
      </div>
    </div>
  );
}

// Team Card Component for Team Selection
interface TeamCardProps {
  team: Team;
  onStartMatch: () => void;
  mode: string;
}

function TeamCard({ team, onStartMatch, mode }: TeamCardProps) {
  const winPercentage = team.totalMatches 
    ? Math.round(((team.matchesWon || 0) / team.totalMatches) * 100)
    : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold truncate" data-testid={`text-team-name-${team.id}`}>
              {team.name}
            </CardTitle>
            {team.shortName && (
              <Badge variant="outline" className="mt-1">
                {team.shortName}
              </Badge>
            )}
          </div>
        </div>
        {team.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {team.description}
          </p>
        )}
        {team.city && (
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            📍 {team.city}
          </p>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {/* Team Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-sm font-semibold text-green-600">
                {team.matchesWon || 0}
              </div>
              <div className="text-xs text-gray-500">Won</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-red-600">
                {team.matchesLost || 0}
              </div>
              <div className="text-xs text-gray-500">Lost</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-blue-600">
                {team.matchesDrawn || 0}
              </div>
              <div className="text-xs text-gray-500">Drawn</div>
            </div>
          </div>

          {/* Win Rate */}
          {team.totalMatches && team.totalMatches > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Win Rate:</span>
              <span className={`font-semibold ${winPercentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {winPercentage}%
              </span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          onClick={onStartMatch}
          className="w-full flex items-center gap-2"
          variant="default"
          size="sm"
          data-testid={`button-start-match-${team.id}`}
        >
          <Play className="h-4 w-4" />
          {mode === 'team-selection' ? 'Select Team' : 'Select as Opponent'}
        </Button>
      </CardFooter>
    </Card>
  );
}
