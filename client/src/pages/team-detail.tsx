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


  // Calculate team statistics from matches
  const calculateTeamStats = () => {
    const completed = teamMatches.filter(match => match.status === 'completed');
    
    let wins = 0;
    let losses = 0;
    let draws = 0;
    
    completed.forEach(match => {
      const resultSummary = (match.matchData as any)?.resultSummary;
      const matchData = match.matchData as any;
      
      // Determine if current team participated in this match
      const isTeam1 = matchData?.team1Id === teamId;
      const isTeam2 = matchData?.team2Id === teamId;
      const isParticipant = isTeam1 || isTeam2;
      
      // Only count matches where the current team participated
      if (!isParticipant) {
        return;
      }
      
      // Handle matches with result summaries
      if (resultSummary?.resultType === 'tied') {
        draws++;
      } else if (resultSummary?.winnerId) {
        // Check if current team won by comparing winnerId with current teamId
        if (resultSummary.winnerId === teamId) {
          wins++;
        } else {
          losses++;
        }
      } else if (resultSummary?.resultType === 'no-result' || resultSummary?.resultType === 'abandoned') {
        // Don't count no-result or abandoned matches in stats
        return;
      } else {
        // Only count matches with proper result data - ignore matches without results
        // This ensures we only show real-time statistics from actual completed matches
        return;
      }
    });
    
    const totalMatches = wins + losses + draws;
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
    
    // Calculate tournament points (assume 2 points for win, 1 for draw)
    const tournamentPoints = (wins * 2) + (draws * 1);
    
    return {
      totalMatches,
      matchesWon: wins,
      matchesLost: losses,
      matchesDrawn: draws,
      winRate,
      tournamentPoints
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

      {/* Team Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{teamStats.matchesWon}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Wins</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{teamStats.matchesLost}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Losses</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{teamStats.matchesDrawn}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Draws</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{teamStats.totalMatches}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${teamStats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
              {teamStats.winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{teamStats.tournamentPoints}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Points</div>
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
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Runs Scored:</span>
                    <span className="font-semibold">{team.totalRunsScored || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Wickets Taken:</span>
                    <span className="font-semibold">{team.totalWicketsTaken || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net Run Rate:</span>
                    <span className="font-semibold">
                      {team.netRunRate ? team.netRunRate.toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tournament Points:</span>
                    <span className="font-semibold text-yellow-600">
                      {team.tournamentPoints || 0}
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