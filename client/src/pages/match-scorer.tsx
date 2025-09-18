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
    
    // Determine team assignments based on toss
    const tossWinnerIsTeam1 = tossWinner === (match?.team1Name || "Team 1");
    let battingTeam, bowlingTeam;
    
    if (tossDecision === 'bat') {
      battingTeam = tossWinnerIsTeam1 ? 'team1' : 'team2';
      bowlingTeam = tossWinnerIsTeam1 ? 'team2' : 'team1';
    } else {
      battingTeam = tossWinnerIsTeam1 ? 'team2' : 'team1';
      bowlingTeam = tossWinnerIsTeam1 ? 'team1' : 'team2';
    }
    
    // Validate batsmen are from batting team
    const battingPlayers = rosterPlayers.filter(p => p.team === battingTeam);
    const strikerInTeam = battingPlayers.some(p => p.name === striker);
    const nonStrikerInTeam = battingPlayers.some(p => p.name === nonStriker);
    
    if (!strikerInTeam || !nonStrikerInTeam) {
      toast({
        title: "Invalid Team Selection",
        description: "Both batsmen must be from the batting team roster.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate bowler is from bowling team
    const bowlingPlayers = rosterPlayers.filter(p => p.team === bowlingTeam);
    const bowlerInTeam = bowlingPlayers.some(p => p.name === bowler);
    
    if (!bowlerInTeam) {
      toast({
        title: "Invalid Team Selection",
        description: "Bowler must be from the bowling team roster.",
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

  const handleEndMatch = async () => {
    try {
      // For cricket matches, need to call the completion endpoint to update player stats
      if (match?.sport === 'cricket') {
        // Build completion data for cricket matches
        const completionData = {
          finalScorecard: {
            team1Innings: [
              {
                inningsNumber: 1,
                battingTeamId: (match?.matchData as any)?.team1Id || '',
                totalRuns: (match?.team1Score as any)?.runs || 0,
                totalWickets: (match?.team1Score as any)?.wickets || 0,
                totalOvers: parseFloat((match?.team1Score as any)?.overs || '0'),
                runRate: ((match?.team1Score as any)?.runs || 0) / Math.max(parseFloat((match?.team1Score as any)?.overs || '0'), 1),
                extras: {
                  wides: 0,
                  noBalls: 0,
                  byes: 0,
                  legByes: 0,
                  penalties: 0,
                },
                batsmen: [], // Will be populated from match data if available
                bowlers: [], // Will be populated from match data if available
              }
            ],
            team2Innings: [
              {
                inningsNumber: 1,
                battingTeamId: (match?.matchData as any)?.team2Id || '',
                totalRuns: (match?.team2Score as any)?.runs || 0,
                totalWickets: (match?.team2Score as any)?.wickets || 0,
                totalOvers: parseFloat((match?.team2Score as any)?.overs || '0'),
                runRate: ((match?.team2Score as any)?.runs || 0) / Math.max(parseFloat((match?.team2Score as any)?.overs || '0'), 1),
                extras: {
                  wides: 0,
                  noBalls: 0,
                  byes: 0,
                  legByes: 0,
                  penalties: 0,
                },
                batsmen: [], // Will be populated from match data if available
                bowlers: [], // Will be populated from match data if available
              }
            ]
          },
          awards: {
            manOfTheMatch: undefined,
            bestBatsman: undefined,
            bestBowler: undefined,
            bestFielder: undefined,
          },
          resultSummary: {
            winnerId: undefined, // Will be determined based on scores
            resultType: 'won-by-runs' as 'won-by-runs' | 'won-by-wickets' | 'tied' | 'no-result' | 'abandoned',
            marginRuns: 0,
            marginWickets: 0,
          }
        };

        // Determine winner based on scores
        const team1Runs = (match?.team1Score as any)?.runs || 0;
        const team2Runs = (match?.team2Score as any)?.runs || 0;
        
        if (team1Runs > team2Runs) {
          completionData.resultSummary.winnerId = (match?.matchData as any)?.team1Id;
          completionData.resultSummary.resultType = 'won-by-runs';
          completionData.resultSummary.marginRuns = team1Runs - team2Runs;
        } else if (team2Runs > team1Runs) {
          completionData.resultSummary.winnerId = (match?.matchData as any)?.team2Id;
          completionData.resultSummary.resultType = 'won-by-runs';
          completionData.resultSummary.marginRuns = team2Runs - team1Runs;
        } else {
          completionData.resultSummary.resultType = 'tied';
          completionData.resultSummary.marginRuns = 0;
        }

        // Call the completion endpoint which will update player and team statistics
        await apiRequest("POST", `/api/matches/${params?.id}/complete`, completionData);
        
        toast({
          title: "Match Completed",
          description: "The match has been completed and player statistics have been updated!",
        });
      } else {
        // For non-cricket matches, just update status
        updateMatchMutation.mutate({ status: 'completed' });
        toast({
          title: "Match Completed",
          description: "The match has been completed!",
        });
      }
      
      setMatchStatus('completed');
      
      // Invalidate queries to refresh data including player statistics
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      
      // Invalidate user-specific stats and matches
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/matches"] });
      
      // Invalidate specific match-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/matches", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", params?.id, "participants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", params?.id, "roster"] });
      
      // Invalidate team-specific caches for both teams
      const team1Id = (match?.matchData as any)?.team1Id;
      const team2Id = (match?.matchData as any)?.team2Id;
      if (team1Id) {
        queryClient.invalidateQueries({ queryKey: ["/api/teams", team1Id] });
        queryClient.invalidateQueries({ queryKey: ["/api/teams", team1Id, "matches"] });
      }
      if (team2Id) {
        queryClient.invalidateQueries({ queryKey: ["/api/teams", team2Id] });
        queryClient.invalidateQueries({ queryKey: ["/api/teams", team2Id, "matches"] });
      }
      
      // Invalidate player-specific caches for all participants
      if (participants.length > 0) {
        participants.forEach((participant: any) => {
          if (participant.playerId) {
            queryClient.invalidateQueries({ queryKey: ["/api/players", participant.playerId] });
            queryClient.invalidateQueries({ queryKey: ["/api/players", participant.playerId, "matches"] });
          }
        });
      }
      
    } catch (error) {
      console.error("Error completing match:", error);
      toast({
        title: "Error",
        description: "Failed to complete match. Please try again.",
        variant: "destructive",
      });
    }
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
        return <CricketScorer {...scorerProps} rosterPlayers={rosterPlayers} />;
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
