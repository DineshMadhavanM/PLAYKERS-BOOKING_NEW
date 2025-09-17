import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, User, Calendar, MapPin, Trophy, Target, BarChart3, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Player, Match, Team } from "@shared/schema";
import MatchCard from "@/components/match-card";

export default function PlayerProfile() {
  const params = useParams();
  const playerId = params.id!;
  const [, navigate] = useLocation();

  // Fetch player data
  const { data: player, isLoading: playerLoading, error: playerError } = useQuery({
    queryKey: ['/api/players', playerId],
    queryFn: async (): Promise<Player> => {
      const response = await fetch(`/api/players/${playerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch player');
      }
      return response.json();
    },
  });

  // Fetch player's team data
  const { data: team } = useQuery({
    queryKey: ['/api/teams', player?.teamId],
    queryFn: async (): Promise<Team> => {
      const response = await fetch(`/api/teams/${player?.teamId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch team');
      }
      return response.json();
    },
    enabled: !!player?.teamId,
  });

  // Fetch player match history
  const { data: playerMatches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['/api/players', playerId, 'matches'],
    queryFn: async (): Promise<Match[]> => {
      const response = await fetch(`/api/players/${playerId}/matches`);
      if (!response.ok) {
        throw new Error('Failed to fetch player matches');
      }
      return response.json();
    },
    enabled: !!playerId,
  });

  if (playerLoading) {
    return <PlayerProfileSkeleton />;
  }

  if (playerError || !player) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Player not found
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            The player you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate('/teams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

  const careerStats = player.careerStats || {};
  const battingAverage = careerStats.totalRuns && careerStats.totalMatches 
    ? (careerStats.totalRuns / careerStats.totalMatches).toFixed(2)
    : '0.00';
  const bowlingAverage = careerStats.totalWickets && careerStats.totalRunsGiven 
    ? (careerStats.totalRunsGiven / careerStats.totalWickets).toFixed(2)
    : '0.00';
  const strikeRate = careerStats.totalRuns && careerStats.totalBallsFaced 
    ? ((careerStats.totalRuns / careerStats.totalBallsFaced) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/teams')}
            className="flex items-center gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Player Info Card */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl">
                {player.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid={`text-player-name-${player.id}`}>
                  {player.name}
                </h1>
                {player.jerseyNumber && (
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    #{player.jerseyNumber}
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                {player.role && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span className="capitalize">{player.role.replace('-', ' ')}</span>
                  </div>
                )}
                
                {team && (
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    <Button
                      variant="link"
                      className="h-auto p-0 text-blue-600 hover:text-blue-800"
                      onClick={() => navigate(`/teams/${team.id}`)}
                      data-testid={`link-team-${team.id}`}
                    >
                      {team.name}
                    </Button>
                  </div>
                )}
                
                {player.battingStyle && (
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    <span className="capitalize">{player.battingStyle.replace('-', ' ')}</span>
                  </div>
                )}
                
                {player.bowlingStyle && (
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    <span className="capitalize">{player.bowlingStyle.replace('-', ' ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Career Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{careerStats.totalMatches || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Matches</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{careerStats.matchesWon || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Wins</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{careerStats.totalRuns || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Runs</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{careerStats.totalWickets || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Wickets</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{battingAverage}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Bat Avg</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{strikeRate}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Strike Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Detailed Statistics
          </TabsTrigger>
          <TabsTrigger value="matches" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Match History ({playerMatches.length})
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Batting Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Batting Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Runs:</span>
                    <span className="font-semibold">{careerStats.totalRuns || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Highest Score:</span>
                    <span className="font-semibold">{careerStats.highestScore || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Batting Average:</span>
                    <span className="font-semibold">{battingAverage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Strike Rate:</span>
                    <span className="font-semibold">{strikeRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Centuries:</span>
                    <span className="font-semibold text-green-600">{careerStats.centuries || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Half Centuries:</span>
                    <span className="font-semibold text-blue-600">{careerStats.halfCenturies || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fours:</span>
                    <span className="font-semibold">{careerStats.totalFours || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sixes:</span>
                    <span className="font-semibold">{careerStats.totalSixes || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bowling Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Bowling Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Wickets:</span>
                    <span className="font-semibold">{careerStats.totalWickets || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bowling Average:</span>
                    <span className="font-semibold">{bowlingAverage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Economy Rate:</span>
                    <span className="font-semibold">{(careerStats.totalRunsGiven && careerStats.totalOvers 
                      ? (careerStats.totalRunsGiven / careerStats.totalOvers).toFixed(2) 
                      : '0.00')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>5-wicket Hauls:</span>
                    <span className="font-semibold text-red-600">{careerStats.fiveWicketHauls || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Overs:</span>
                    <span className="font-semibold">{careerStats.totalOvers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maidens:</span>
                    <span className="font-semibold">{careerStats.totalMaidens || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Runs Given:</span>
                    <span className="font-semibold">{careerStats.totalRunsGiven || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fielding Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Fielding Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Catches:</span>
                    <span className="font-semibold">{careerStats.catches || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Run Outs:</span>
                    <span className="font-semibold">{careerStats.runOuts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stumpings:</span>
                    <span className="font-semibold">{careerStats.stumpings || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Awards & Recognition */}
            <Card>
              <CardHeader>
                <CardTitle>Awards & Recognition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Man of the Match:</span>
                    <span className="font-semibold text-yellow-600">{careerStats.manOfTheMatchAwards || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Best Batsman:</span>
                    <span className="font-semibold text-green-600">{careerStats.bestBatsmanAwards || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Best Bowler:</span>
                    <span className="font-semibold text-red-600">{careerStats.bestBowlerAwards || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Best Fielder:</span>
                    <span className="font-semibold text-blue-600">{careerStats.bestFielderAwards || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Match History ({playerMatches.length})
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
              ) : playerMatches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No matches found</p>
                  <p className="text-sm mt-1">This player hasn't played any matches yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {playerMatches.map((match) => (
                    <MatchCard 
                      key={match.id} 
                      match={match} 
                      showActions={false}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Career Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(careerStats.centuries || 0) > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Trophy className="h-6 w-6 text-green-600" />
                    <div>
                      <div className="font-semibold text-green-800 dark:text-green-300">
                        Century Club
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        {careerStats.centuries} centuries scored
                      </div>
                    </div>
                  </div>
                )}
                
                {(careerStats.fiveWicketHauls || 0) > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <Target className="h-6 w-6 text-red-600" />
                    <div>
                      <div className="font-semibold text-red-800 dark:text-red-300">
                        Bowling Master
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-400">
                        {careerStats.fiveWicketHauls} five-wicket hauls
                      </div>
                    </div>
                  </div>
                )}
                
                {(careerStats.manOfTheMatchAwards || 0) > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <Star className="h-6 w-6 text-yellow-600" />
                    <div>
                      <div className="font-semibold text-yellow-800 dark:text-yellow-300">
                        Star Performer
                      </div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">
                        {careerStats.manOfTheMatchAwards} Man of the Match awards
                      </div>
                    </div>
                  </div>
                )}
                
                {careerStats.totalMatches && careerStats.totalMatches >= 50 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                    <div>
                      <div className="font-semibold text-blue-800 dark:text-blue-300">
                        Veteran Player
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        {careerStats.totalMatches} matches played
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {!(careerStats.centuries || careerStats.fiveWicketHauls || careerStats.manOfTheMatchAwards || (careerStats.totalMatches && careerStats.totalMatches >= 50)) && (
                <div className="text-center py-8 text-gray-500">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No special achievements yet</p>
                  <p className="text-sm mt-1">Keep playing to unlock achievements!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Loading skeleton component
function PlayerProfileSkeleton() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <Skeleton className="h-8 w-16" />
      </div>

      {/* Player Info Card Skeleton */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-8 w-64 mb-2" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards Skeleton */}
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