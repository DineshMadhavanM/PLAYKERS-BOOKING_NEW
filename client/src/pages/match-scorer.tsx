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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, MapPin, Users, Play, Pause, Square } from "lucide-react";
import type { Match, MatchParticipant } from "@shared/schema";


export default function MatchScorer() {
  const [, params] = useRoute("/match/:id/score");
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [matchStatus, setMatchStatus] = useState<'upcoming' | 'live' | 'completed'>('upcoming');
  const [showTossDialog, setShowTossDialog] = useState(false);
  const [showPlayerSelectionDialog, setShowPlayerSelectionDialog] = useState(false);
  const [tossWinner, setTossWinner] = useState<string>('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | ''>('');
  const [striker, setStriker] = useState<string>('');
  const [nonStriker, setNonStriker] = useState<string>('');
  const [bowler, setBowler] = useState<string>('');

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

  const { data: rosterPlayers = [] } = useQuery<any[]>({
    queryKey: ["/api/matches", params?.id, "roster"],
    enabled: isAuthenticated && !!params?.id && match?.sport === 'cricket',
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
    // For cricket matches, show toss dialog first
    if (match?.sport === 'cricket') {
      setShowTossDialog(true);
      return;
    }
    
    // For non-cricket matches, start immediately
    startMatchAfterToss();
  };

  const startMatchAfterToss = () => {
    const matchData: any = { status: 'live' };
    
    // Include toss and player information for cricket matches
    if (match?.sport === 'cricket' && tossWinner && tossDecision) {
      matchData.matchData = {
        ...match.matchData,
        toss: {
          winner: tossWinner,
          decision: tossDecision,
          timestamp: new Date().toISOString()
        },
        currentPlayers: {
          striker: striker,
          nonStriker: nonStriker,
          bowler: bowler
        }
      };
    }
    
    updateMatchMutation.mutate(matchData);
    setMatchStatus('live');
    setShowTossDialog(false);
    setShowPlayerSelectionDialog(false);
    
    const description = match?.sport === 'cricket' 
      ? `${tossWinner} won the toss and chose to ${tossDecision} first. ${striker} and ${nonStriker} are opening the batting, ${bowler} will bowl first. Match is now live!`
      : "The match is now live!";
    
    toast({
      title: "Match Started",
      description: description,
    });
  };

  const handleTossSubmit = () => {
    if (!tossWinner || !tossDecision) {
      toast({
        title: "Incomplete Toss Information",
        description: "Please select both toss winner and decision.",
        variant: "destructive",
      });
      return;
    }
    
    // After toss, show player selection dialog
    setShowTossDialog(false);
    setShowPlayerSelectionDialog(true);
  };

  const handlePlayerSelectionSubmit = () => {
    if (!striker || !nonStriker || !bowler) {
      toast({
        title: "Incomplete Player Selection",
        description: "Please select striker, non-striker, and bowler.",
        variant: "destructive",
      });
      return;
    }

    if (striker === nonStriker) {
      toast({
        title: "Invalid Selection",
        description: "Striker and non-striker must be different players.",
        variant: "destructive",
      });
      return;
    }
    
    startMatchAfterToss();
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


        {/* Sport-Specific Scorer */}
        {renderScorer()}
      </div>

      {/* Toss Dialog for Cricket Matches */}
      <Dialog open={showTossDialog} onOpenChange={setShowTossDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🏏 Cricket Toss
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="toss-winner">Which team won the toss?</Label>
              <Select value={tossWinner} onValueChange={setTossWinner}>
                <SelectTrigger id="toss-winner" data-testid="select-toss-winner">
                  <SelectValue placeholder="Select team that won the toss" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={match?.team1Name || "Team 1"}>
                    {match?.team1Name || "Team 1"}
                  </SelectItem>
                  <SelectItem value={match?.team2Name || "Team 2"}>
                    {match?.team2Name || "Team 2"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toss-decision">What did they choose?</Label>
              <Select value={tossDecision} onValueChange={(value) => setTossDecision(value as 'bat' | 'bowl')}>
                <SelectTrigger id="toss-decision" data-testid="select-toss-decision">
                  <SelectValue placeholder="Select batting or bowling first" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bat">🏏 Bat First</SelectItem>
                  <SelectItem value="bowl">⚾ Bowl First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTossDialog(false);
                  setTossWinner('');
                  setTossDecision('');
                }}
                className="flex-1"
                data-testid="button-cancel-toss"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleTossSubmit}
                disabled={!tossWinner || !tossDecision || updateMatchMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-toss"
              >
                Continue to Player Selection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Player Selection Dialog for Cricket Matches */}
      <Dialog open={showPlayerSelectionDialog} onOpenChange={setShowPlayerSelectionDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              👥 Select Opening Players
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {(() => {
              // Determine batting and bowling teams based on toss
              const tossWinnerIsTeam1 = tossWinner === (match?.team1Name || "Team 1");
              let battingTeam, bowlingTeam, battingTeamName, bowlingTeamName;
              
              if (tossDecision === 'bat') {
                // Toss winner chose to bat
                battingTeam = tossWinnerIsTeam1 ? 'team1' : 'team2';
                bowlingTeam = tossWinnerIsTeam1 ? 'team2' : 'team1';
                battingTeamName = tossWinner;
                bowlingTeamName = tossWinnerIsTeam1 ? (match?.team2Name || "Team 2") : (match?.team1Name || "Team 1");
              } else {
                // Toss winner chose to bowl
                battingTeam = tossWinnerIsTeam1 ? 'team2' : 'team1';
                bowlingTeam = tossWinnerIsTeam1 ? 'team1' : 'team2';
                battingTeamName = tossWinnerIsTeam1 ? (match?.team2Name || "Team 2") : (match?.team1Name || "Team 1");
                bowlingTeamName = tossWinner;
              }

              const battingPlayers = rosterPlayers.filter(p => p.team === battingTeam);
              const bowlingPlayers = rosterPlayers.filter(p => p.team === bowlingTeam);
              

              return (
                <>
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      🏏 {battingTeamName} - Opening Batsmen
                    </h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="striker">Striker</Label>
                      <Select value={striker} onValueChange={setStriker}>
                        <SelectTrigger id="striker" data-testid="select-striker">
                          <SelectValue placeholder="Select striker" />
                        </SelectTrigger>
                        <SelectContent>
                          {battingPlayers.map((player: any) => (
                            <SelectItem key={player.id} value={player.name}>
                              {player.name} {player.role === 'captain' ? '(C)' : ''} {player.role === 'wicket-keeper' ? '(WK)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="non-striker">Non-Striker</Label>
                      <Select value={nonStriker} onValueChange={setNonStriker}>
                        <SelectTrigger id="non-striker" data-testid="select-non-striker">
                          <SelectValue placeholder="Select non-striker" />
                        </SelectTrigger>
                        <SelectContent>
                          {battingPlayers.map((player: any) => (
                            <SelectItem key={player.id} value={player.name}>
                              {player.name} {player.role === 'captain' ? '(C)' : ''} {player.role === 'wicket-keeper' ? '(WK)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      ⚾ {bowlingTeamName} - Opening Bowler
                    </h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bowler">Opening Bowler</Label>
                      <Select value={bowler} onValueChange={setBowler}>
                        <SelectTrigger id="bowler" data-testid="select-bowler">
                          <SelectValue placeholder="Select opening bowler" />
                        </SelectTrigger>
                        <SelectContent>
                          {bowlingPlayers.map((player: any) => (
                            <SelectItem key={player.id} value={player.name}>
                              {player.name} {player.role === 'captain' ? '(C)' : ''} {player.role === 'wicket-keeper' ? '(WK)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPlayerSelectionDialog(false);
                  setShowTossDialog(true);
                  setStriker('');
                  setNonStriker('');
                  setBowler('');
                }}
                className="flex-1"
                data-testid="button-back-to-toss"
              >
                Back to Toss
              </Button>
              <Button 
                onClick={handlePlayerSelectionSubmit}
                disabled={!striker || !nonStriker || !bowler || updateMatchMutation.isPending}
                className="flex-1"
                data-testid="button-start-match-final"
              >
                Start Match
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
