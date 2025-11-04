import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Users, Edit, UserPlus, Trophy, Target, Calendar, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Team, Player, Match } from "@shared/schema";
import PlayerManagement from "@/components/player-management";
import MatchCard from "@/components/match-card";

export default function TeamDetail() {
  const params = useParams();
  const teamId = params.id!;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch team data
  const { data: team, isLoading: teamLoading, error: teamError } = useQuery({
    queryKey: ['/api/teams', teamId],
    queryFn: async (): Promise<Team> => {
      const response = await fetch(`/api/teams/${teamId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch team');
      }
      return response.json();
    },
  });

  // Fetch team players
  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ['/api/players', { teamId }],
    queryFn: async (): Promise<Player[]> => {
      const response = await fetch(`/api/players?teamId=${teamId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch players');
      }
      return response.json();
    },
    enabled: !!teamId,
  });

  // Fetch team match history
  const { data: teamMatches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['/api/teams', teamId, 'matches'],
    queryFn: async (): Promise<Match[]> => {
      const response = await fetch(`/api/teams/${teamId}/matches`);
      if (!response.ok) {
        throw new Error('Failed to fetch team matches');
      }
      return response.json();
    },
    enabled: !!teamId,
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await apiRequest('DELETE', `/api/teams/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Team deleted",
        description: "The team has been successfully deleted.",
      });
      navigate('/teams');
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting team",
        description: error.message || "Failed to delete team. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (teamLoading) {
    return <TeamDetailSkeleton />;
  }

  if (teamError || !team) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Team not found
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            The team you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate('/teams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }


  // Calculate comprehensive cricket team statistics from real match results
  const calculateTeamStats = () => {
    // Filter for cricket matches only to ensure accurate cricket-specific statistics
    const completedCricketMatches = teamMatches.filter(match => 
      match.status === 'completed' && match.sport === 'cricket'
    );
    
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalRunsScored = 0;
    let totalWicketsTaken = 0;
    let totalRunsConceded = 0;
    let totalWicketsLost = 0;
    let totalBallsFaced = 0;
    let totalBallsBowled = 0;
    
    completedCricketMatches.forEach(match => {
      const resultSummary = (match.matchData as any)?.resultSummary;
      const matchData = match.matchData as any;
      const scorecard = matchData?.scorecard;
      
      // Determine if current team participated in this match
      const isTeam1 = matchData?.team1Id === teamId;
      const isTeam2 = matchData?.team2Id === teamId;
      const isParticipant = isTeam1 || isTeam2;
      
      // Only count matches where the current team participated
      if (!isParticipant) {
        return;
      }
      
      // Process match result for wins/losses/draws (cricket matches only)
      let hasRealResult = false;
      if (resultSummary?.resultType === 'tied') {
        draws++;
        hasRealResult = true;
      } else if (resultSummary?.winnerId) {
        // Check if current team won by comparing winnerId with current teamId
        if (resultSummary.winnerId === teamId) {
          wins++;
        } else {
          losses++;
        }
        hasRealResult = true;
      } else if (resultSummary?.resultType === 'no-result' || resultSummary?.resultType === 'abandoned') {
        // Don't count no-result or abandoned matches in stats
        return;
      } else {
        // Only count matches with proper result data - ignore matches without results
        // This ensures we only show real-time statistics from actual completed matches
        return;
      }

      // Only process scorecard data for matches with real results (aligned with runs/wickets accumulation)
      if (hasRealResult && scorecard) {
        // Process ALL innings in the match correctly
        // Check team1Innings
        if (scorecard.team1Innings) {
          scorecard.team1Innings.forEach((innings: any) => {
            if (innings.battingTeamId === teamId) {
              // Current team was batting
              totalRunsScored += innings.totalRuns || 0;
              totalWicketsLost += innings.totalWickets || 0;
              
              // Convert overs to balls for accurate NRR calculation
              if (innings.totalOvers) {
                const overs = parseFloat(innings.totalOvers.toString());
                const wholeOvers = Math.floor(overs);
                const remainingBalls = Math.round((overs - wholeOvers) * 10); // 0.4 becomes 4 balls
                const ballsThisInnings = (wholeOvers * 6) + remainingBalls;
                totalBallsFaced += ballsThisInnings;
              }
            } else {
              // Current team was bowling
              totalWicketsTaken += innings.totalWickets || 0;
              totalRunsConceded += innings.totalRuns || 0;
              
              // Convert overs to balls for accurate NRR calculation
              if (innings.totalOvers) {
                const overs = parseFloat(innings.totalOvers.toString());
                const wholeOvers = Math.floor(overs);
                const remainingBalls = Math.round((overs - wholeOvers) * 10); // 0.4 becomes 4 balls
                const ballsThisInnings = (wholeOvers * 6) + remainingBalls;
                totalBallsBowled += ballsThisInnings;
              }
            }
          });
        }
        
        // Check team2Innings
        if (scorecard.team2Innings) {
          scorecard.team2Innings.forEach((innings: any) => {
            if (innings.battingTeamId === teamId) {
              // Current team was batting
              totalRunsScored += innings.totalRuns || 0;
              totalWicketsLost += innings.totalWickets || 0;
              
              // Convert overs to balls for accurate NRR calculation
              if (innings.totalOvers) {
                const overs = parseFloat(innings.totalOvers.toString());
                const wholeOvers = Math.floor(overs);
                const remainingBalls = Math.round((overs - wholeOvers) * 10); // 0.4 becomes 4 balls
                const ballsThisInnings = (wholeOvers * 6) + remainingBalls;
                totalBallsFaced += ballsThisInnings;
              }
            } else {
              // Current team was bowling
              totalWicketsTaken += innings.totalWickets || 0;
              totalRunsConceded += innings.totalRuns || 0;
              
              // Convert overs to balls for accurate NRR calculation
              if (innings.totalOvers) {
                const overs = parseFloat(innings.totalOvers.toString());
                const wholeOvers = Math.floor(overs);
                const remainingBalls = Math.round((overs - wholeOvers) * 10); // 0.4 becomes 4 balls
                const ballsThisInnings = (wholeOvers * 6) + remainingBalls;
                totalBallsBowled += ballsThisInnings;
              }
            }
          });
        }
      }
    });
    
    // Only count matches with real results for statistics
    const totalMatches = wins + losses + draws;
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
    
    // Calculate tournament points (2 points for win, 1 for draw, 0 for loss)
    const tournamentPoints = (wins * 2) + (draws * 1);
    
    // Calculate NRR using proper ball-based formula (balls already calculated in the loop above)
    let netRunRate = 0;
    let hasNRRData = false;
    
    if (totalBallsFaced > 0 && totalBallsBowled > 0) {
      const oversFaced = totalBallsFaced / 6;
      const oversBowled = totalBallsBowled / 6;
      const runsPerOverScored = totalRunsScored / oversFaced;
      const runsPerOverConceded = totalRunsConceded / oversBowled;
      netRunRate = runsPerOverScored - runsPerOverConceded;
      hasNRRData = true;
    }
    
    return {
      totalMatches, // This is wins + losses + draws (matches with real results only)
      matchesWon: wins,
      matchesLost: losses,
      matchesDrawn: draws,
      winRate,
      tournamentPoints,
      totalRunsScored,
      totalWicketsTaken,
      totalRunsConceded,
      totalWicketsLost,
      netRunRate,
      hasNRRData,
      // Use totalMatches for averages (only counts matches with real results)
      matchesWithResults: totalMatches,
      totalCricketMatches: completedCricketMatches.length // All cricket matches including no-result
    };
  };

  const teamStats = calculateTeamStats();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/teams')}
            className="flex items-center gap-2"
            data-testid="button-back-to-teams"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid={`text-team-name-${team.id}`}>
                {team.name}
              </h1>
              {team.shortName && (
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {team.shortName}
                </Badge>
              )}
            </div>
            {team.description && (
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
                {team.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/teams/${teamId}/edit`)}
            className="flex items-center gap-2"
            data-testid="button-edit-team"
          >
            <Edit className="h-4 w-4" />
            Edit Team
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Team</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{team.name}"? This action cannot be undone.
                  All team data and statistics will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteTeamMutation.mutate()}
                >
                  Delete Team
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Team Stats Cards - Real-time Cricket Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8" data-testid="team-stats-cards">
        <Card data-testid="card-wins">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600" data-testid="stat-wins">
              {teamStats.matchesWon}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Wins</div>
            <div className="text-xs text-muted-foreground mt-1">Real Victories</div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-losses">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600" data-testid="stat-losses">
              {teamStats.matchesLost}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Losses</div>
            <div className="text-xs text-muted-foreground mt-1">Actual Defeats</div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-draws">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-draws">
              {teamStats.matchesDrawn}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Draws</div>
            <div className="text-xs text-muted-foreground mt-1">Tied Matches</div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-total">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600" data-testid="stat-total">
              {teamStats.totalMatches}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
            <div className="text-xs text-muted-foreground mt-1">Completed</div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-win-rate">
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${teamStats.winRate >= 50 ? 'text-green-600' : teamStats.winRate >= 30 ? 'text-orange-600' : 'text-red-600'}`} data-testid="stat-win-rate">
              {teamStats.winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
            <div className="text-xs text-muted-foreground mt-1">Success %</div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-tournament-points">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600" data-testid="stat-tournament-points">
              {teamStats.tournamentPoints}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Points</div>
            <div className="text-xs text-muted-foreground mt-1">Tournament</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="players" className="space-y-6">
        <TabsList>
          <TabsTrigger value="players" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Players ({players.length})
          </TabsTrigger>
          <TabsTrigger value="matches" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Match History
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <PlayerManagement 
            teamId={teamId} 
            teamName={team.name}
            teamSport={team.sport}
            players={players}
            isLoading={playersLoading}
          />
        </TabsContent>

        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Match History ({teamMatches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matchesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : teamMatches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No matches found</p>
                  <p className="text-sm mt-1">This team hasn't played any matches yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamMatches.map((match) => (
                    <MatchCard 
                      key={match.id} 
                      match={match} 
                      showActions={false}
                      teamStats={teamStats}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cricket Performance Overview</CardTitle>
                <p className="text-sm text-muted-foreground">Real-time statistics from completed matches</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Runs Scored:</span>
                    <span className="font-semibold text-green-600" data-testid="stats-runs-scored">
                      {teamStats.totalRunsScored.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Wickets Taken:</span>
                    <span className="font-semibold text-blue-600" data-testid="stats-wickets-taken">
                      {teamStats.totalWicketsTaken}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Runs Conceded:</span>
                    <span className="font-semibold text-red-600" data-testid="stats-runs-conceded">
                      {teamStats.totalRunsConceded.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Wickets Lost:</span>
                    <span className="font-semibold text-orange-600" data-testid="stats-wickets-lost">
                      {teamStats.totalWicketsLost}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net Run Rate:</span>
                    <span className={`font-semibold ${teamStats.hasNRRData ? (teamStats.netRunRate >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-500'}`} data-testid="stats-net-run-rate">
                      {teamStats.hasNRRData ? 
                        `${teamStats.netRunRate >= 0 ? '+' : ''}${teamStats.netRunRate.toFixed(3)}` : 
                        'No data available'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tournament Points:</span>
                    <span className="font-semibold text-yellow-600" data-testid="stats-tournament-points">
                      {teamStats.tournamentPoints}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Score Per Match:</span>
                    <span className="font-semibold text-purple-600" data-testid="stats-avg-score">
                      {teamStats.matchesWithResults > 0 ? Math.round(teamStats.totalRunsScored / teamStats.matchesWithResults) : 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wickets Per Match:</span>
                    <span className="font-semibold text-indigo-600" data-testid="stats-wickets-per-match">
                      {teamStats.matchesWithResults > 0 ? (teamStats.totalWicketsTaken / teamStats.matchesWithResults).toFixed(1) : '0.0'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Squad Size:</span>
                    <span className="font-semibold">{players.length} players</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-semibold">
                      {new Date(team.createdAt!).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Updated:</span>
                    <span className="font-semibold">
                      {new Date(team.updatedAt!).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Loading skeleton component
function TeamDetailSkeleton() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-16" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-2" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}