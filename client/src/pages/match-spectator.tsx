import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import Navigation from "@/components/navigation";
import CricketScorer from "@/components/scoring/cricket-scorer";
import FootballScorer from "@/components/scoring/football-scorer";
import TennisScorer from "@/components/scoring/tennis-scorer";
import VolleyballScorer from "@/components/scoring/volleyball-scorer";
import KabaddiScorer from "@/components/scoring/kabaddi-scorer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Users, Eye, RefreshCw, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { Match, MatchParticipant } from "@shared/schema";

export default function MatchSpectator() {
  const [, params] = useRoute("/match/:id/spectate");
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: match, isLoading: matchLoading, refetch } = useQuery<Match>({
    queryKey: ["/api/matches", params?.id],
    enabled: !!params?.id,
    refetchInterval: autoRefresh ? 5000 : false, // Auto-refresh every 5 seconds
  });

  const { data: participants = [] } = useQuery<MatchParticipant[]>({
    queryKey: ["/api/matches", params?.id, "participants"],
    enabled: !!params?.id,
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const { data: rosterPlayers = [] } = useQuery<any[]>({
    queryKey: ["/api/matches", params?.id, "roster"],
    enabled: !!params?.id && match?.sport === 'cricket',
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // Update last refresh time when data changes
  useEffect(() => {
    if (match) {
      setLastRefresh(new Date());
    }
  }, [match]);

  if (matchLoading) {
    return (
      <div className="min-h-screen bg-background">
        {isAuthenticated && <Navigation />}
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading match...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background">
        {isAuthenticated && <Navigation />}
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-xl text-muted-foreground">Match not found</p>
            <p className="text-sm text-muted-foreground mt-2">Please check the match ID and try again</p>
          </div>
        </div>
      </div>
    );
  }

  const handleManualRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Match data has been updated",
    });
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    toast({
      title: autoRefresh ? "Auto-refresh disabled" : "Auto-refresh enabled",
      description: autoRefresh 
        ? "You'll need to refresh manually" 
        : "Match will update every 5 seconds",
    });
  };

  // Dummy score update handler (not used in spectator mode)
  const handleScoreUpdate = () => {
    // This is a read-only view, so we don't update scores
  };

  const renderScorer = () => {
    const isLive = match.status === 'live';
    const commonProps = {
      match,
      onScoreUpdate: handleScoreUpdate,
      isLive: false, // Always false for spectator mode - disables all scoring controls
    };

    switch (match.sport) {
      case 'cricket':
        return <CricketScorer {...commonProps} rosterPlayers={rosterPlayers} />;
      case 'football':
        return <FootballScorer {...commonProps} rosterPlayers={rosterPlayers} />;
      case 'tennis':
        return <TennisScorer {...commonProps} />;
      case 'volleyball':
        return <VolleyballScorer {...commonProps} />;
      case 'kabaddi':
        return <KabaddiScorer {...commonProps} />;
      default:
        return (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center">
                Spectator view for {match.sport} is not yet available
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated && <Navigation />}
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-6">
          {isAuthenticated && (
            <Link href="/matches">
              <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-matches">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Matches
              </Button>
            </Link>
          )}

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-3xl font-bold" data-testid="text-match-title">{match.title}</h1>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(match.scheduledAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {match.venueId}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {participants.length} participants
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant={match.status === 'live' ? 'default' : match.status === 'completed' ? 'secondary' : 'outline'}
                className={match.status === 'live' ? 'bg-red-500 animate-pulse' : ''}
                data-testid={`badge-status-${match.status}`}
              >
                {match.status === 'live' && '🔴 '}
                {match.status?.toUpperCase() || 'UPCOMING'}
              </Badge>
              <Badge variant="outline" data-testid="text-sport">{match.sport}</Badge>
              <Badge variant="outline" data-testid="text-match-type">{match.matchType}</Badge>
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Last updated: </span>
                  <span className="font-medium" data-testid="text-last-refresh">
                    {lastRefresh.toLocaleTimeString()}
                  </span>
                </div>
                {match.status === 'live' && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                    <RefreshCw className={`h-3 w-3 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                    {autoRefresh ? 'Auto-updating' : 'Paused'}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  data-testid="button-refresh"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                {match.status === 'live' && (
                  <Button
                    variant={autoRefresh ? "default" : "outline"}
                    size="sm"
                    onClick={toggleAutoRefresh}
                    data-testid="button-toggle-auto-refresh"
                  >
                    {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spectator Notice */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Spectator Mode</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You're viewing this match in read-only mode. {match.status === 'live' && 'Scores update automatically every 5 seconds.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teams Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg" data-testid="text-team1-name">{match.team1Name || 'Team 1'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {participants.filter(p => p.team === 'team1').length} players
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg" data-testid="text-team2-name">{match.team2Name || 'Team 2'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {participants.filter(p => p.team === 'team2').length} players
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Match Status Messages */}
        {match.status === 'upcoming' && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                This match hasn't started yet. It is scheduled for {new Date(match.scheduledAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )}

        {match.status === 'completed' && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="font-semibold text-green-900 dark:text-green-100 text-lg mb-2">
                  Match Completed
                </p>
                <p className="text-green-700 dark:text-green-300">
                  Final score is displayed below
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Score Display */}
        {(match.status === 'live' || match.status === 'completed') && (
          <div className="mb-6">
            {renderScorer()}
          </div>
        )}

        {/* Match Description */}
        {match.description && (
          <Card>
            <CardHeader>
              <CardTitle>About this Match</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{match.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
