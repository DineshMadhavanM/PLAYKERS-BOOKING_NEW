import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, MapPin, Users, Play, Pause, Square, Trophy } from "lucide-react";
import type { Match, MatchParticipant } from "@shared/schema";

interface CricketScore {
  runs: number;
  wickets: number;
  overs: string;
  ballByBall?: string[];
}

export default function MatchScorer() {
  const [, params] = useRoute("/match/:id/score");
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [matchStatus, setMatchStatus] = useState<'upcoming' | 'live' | 'completed'>('upcoming');

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

  const { data: match, isLoading: matchLoading } = useQuery<Match>({
    queryKey: ["/api/matches", params?.id],
    enabled: isAuthenticated && !!params?.id,
  });

  const { data: participants = [] } = useQuery<MatchParticipant[]>({
    queryKey: ["/api/matches", params?.id, "participants"],
    enabled: isAuthenticated && !!params?.id,
  });

  const updateMatchMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", `/api/matches/${params?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", params?.id] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update match. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (match?.status) {
      setMatchStatus(match.status as 'upcoming' | 'live' | 'completed');
    }
  }, [match?.status]);

  if (isLoading || matchLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading match...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !match) {
    return null;
  }

  const handleStartMatch = () => {
    updateMatchMutation.mutate({ status: 'live' });
    setMatchStatus('live');
    toast({
      title: "Match Started",
      description: "The match is now live!",
    });
  };

  const handlePauseMatch = () => {
    updateMatchMutation.mutate({ status: 'paused' });
    toast({
      title: "Match Paused",
      description: "The match has been paused.",
    });
  };

  const handleEndMatch = () => {
    updateMatchMutation.mutate({ status: 'completed' });
    setMatchStatus('completed');
    toast({
      title: "Match Completed",
      description: "The match has been completed!",
    });
  };

  const handleScoreUpdate = (scoreData: any) => {
    updateMatchMutation.mutate({
      team1Score: scoreData.team1Score,
      team2Score: scoreData.team2Score,
      matchData: scoreData.matchData,
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCricketScore = (score: any) => {
    if (!score || typeof score !== 'object') return "0/0 (0.0)"; 
    
    const runs = score.runs || 0;
    const wickets = score.wickets || 0;
    const overs = score.overs || "0.0";
    
    return `${runs}/${wickets} (${overs})`;
  };

  const formatDisplayScore = (score: any, sport: string) => {
    if (sport === 'cricket') {
      return formatCricketScore(score);
    }
    return score ? JSON.stringify(score) : "0";
  };

  const renderScorer = () => {
    const scorerProps = {
      match,
      onScoreUpdate: handleScoreUpdate,
      isLive: matchStatus === 'live',
    };

    switch (match.sport) {
      case 'cricket':
        return <CricketScorer {...scorerProps} />;
      case 'football':
        return <FootballScorer {...scorerProps} />;
      case 'tennis':
        return <TennisScorer {...scorerProps} />;
      case 'volleyball':
        return <VolleyballScorer {...scorerProps} />;
      case 'kabaddi':
        return <KabaddiScorer {...scorerProps} />;
      default:
        return (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-xl font-semibold mb-2">Scorer Not Available</h3>
              <p className="text-muted-foreground">
                Scoring system for {match.sport} is not yet implemented.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="match-scorer-page">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Match Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2" data-testid="text-match-title">
                  {match.title}
                </CardTitle>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(match.scheduledAt)}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Venue ID: {match.venueId}
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {participants.length} players
                  </div>
                </div>
              </div>
              <Badge 
                variant={matchStatus === 'live' ? 'default' : 'secondary'}
                className="text-lg px-4 py-2"
                data-testid="badge-match-status"
              >
                {matchStatus === 'live' ? 'LIVE' : matchStatus.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {matchStatus === 'upcoming' && (
                <Button 
                  onClick={handleStartMatch}
                  disabled={updateMatchMutation.isPending}
                  data-testid="button-start-match"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Match
                </Button>
              )}
              {matchStatus === 'live' && (
                <>
                  <Button 
                    variant="outline"
                    onClick={handlePauseMatch}
                    disabled={updateMatchMutation.isPending}
                    data-testid="button-pause-match"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleEndMatch}
                    disabled={updateMatchMutation.isPending}
                    data-testid="button-end-match"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    End Match
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Teams Display */}
        {match.team1Name && match.team2Name && (
          <Card className="mb-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20 border-2 border-slate-200 dark:border-slate-700">
            <CardContent className="p-8">
              <div className="grid grid-cols-3 gap-6 items-center">
                {/* Team 1 */}
                <div className="text-center">
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl border-2 border-blue-200 dark:border-blue-700 shadow-lg">
                    <Trophy className="h-8 w-8 mx-auto mb-3 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-2xl font-bold mb-4 text-blue-800 dark:text-blue-200" data-testid="text-team1-name">
                      {match.team1Name}
                    </h3>
                    <div className="space-y-2">
                      <div className="text-4xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-team1-score">
                        {formatDisplayScore(match.team1Score, match.sport)}
                      </div>
                      {match.sport === 'cricket' && match.team1Score && (
                        <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                          Overs: {match.team1Score.overs || "0.0"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* VS Section */}
                <div className="flex items-center justify-center">
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text mb-2">
                      VS
                    </div>
                    <Badge 
                      variant={matchStatus === 'live' ? 'default' : 'secondary'}
                      className={`text-sm px-3 py-1 ${
                        matchStatus === 'live' 
                          ? 'bg-red-600 text-white animate-pulse border-red-700' 
                          : ''
                      }`}
                    >
                      {matchStatus === 'live' ? '🔴 LIVE' : matchStatus.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                {/* Team 2 */}
                <div className="text-center">
                  <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl border-2 border-green-200 dark:border-green-700 shadow-lg">
                    <Trophy className="h-8 w-8 mx-auto mb-3 text-green-600 dark:text-green-400" />
                    <h3 className="text-2xl font-bold mb-4 text-green-800 dark:text-green-200" data-testid="text-team2-name">
                      {match.team2Name}
                    </h3>
                    <div className="space-y-2">
                      <div className="text-4xl font-bold text-green-600 dark:text-green-400" data-testid="text-team2-score">
                        {formatDisplayScore(match.team2Score, match.sport)}
                      </div>
                      {match.sport === 'cricket' && match.team2Score && (
                        <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                          Overs: {match.team2Score.overs || "0.0"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Match Info Footer */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-center items-center gap-6 text-sm text-muted-foreground">
                  <span className="font-medium capitalize">{match.sport} Match</span>
                  <span>•</span>
                  <span>{formatDate(match.scheduledAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sport-Specific Scorer */}
        {renderScorer()}
      </div>
    </div>
  );
}
