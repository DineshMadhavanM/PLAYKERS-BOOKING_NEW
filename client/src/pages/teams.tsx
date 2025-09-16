import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Search, Users, Trophy, Target, Calendar, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Team } from "@shared/schema";

interface TeamsResponse {
  teams: Team[];
}

export default function Teams() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch teams from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/teams', searchQuery],
    queryFn: async (): Promise<Team[]> => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      const response = await fetch(`/api/teams?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      return response.json();
    },
  });

  const teams = data || [];

  if (error) {
    toast({
      title: "Error loading teams",
      description: "Failed to load teams. Please try again.",
      variant: "destructive",
    });
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-8 w-8" />
            Teams
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your teams, players, and track performance
          </p>
        </div>
        
        <Button 
          onClick={() => navigate('/teams/create')} 
          className="flex items-center gap-2"
          data-testid="button-create-team"
        >
          <Plus className="h-4 w-4" />
          Create Team
        </Button>
      </div>

      {/* Search Section */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-teams"
          />
        </div>
      </div>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="h-64">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery ? 'No teams found' : 'No teams yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'Create your first team to get started with team management'
            }
          </p>
          {!searchQuery && (
            <Button 
              onClick={() => navigate('/teams/create')}
              data-testid="button-create-first-team"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Team
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}

      {/* Teams Stats Summary */}
      {teams.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{teams.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Teams</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {teams.reduce((acc, team) => acc + (team.matchesWon || 0), 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Matches Won</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {teams.reduce((acc, team) => acc + (team.matchesLost || 0), 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Matches Lost</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {teams.reduce((acc, team) => acc + (team.tournamentPoints || 0), 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Points</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Team Card Component
function TeamCard({ team }: { team: Team }) {
  const [, navigate] = useLocation();

  const winPercentage = team.totalMatches 
    ? Math.round(((team.matchesWon || 0) / team.totalMatches) * 100)
    : 0;

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/teams/${team.id}`)}
      data-testid={`card-team-${team.id}`}
    >
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

          {/* Tournament Points */}
          {team.tournamentPoints !== null && team.tournamentPoints > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Trophy className="h-3 w-3" />
                Points:
              </span>
              <span className="font-semibold text-yellow-600">
                {team.tournamentPoints}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <div className="flex items-center justify-between w-full text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Created {new Date(team.createdAt!).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {team.totalMatches || 0} matches
          </div>
        </div>
        
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            navigate('/matches?mode=opponent-selection&team=' + team.id);
          }}
          className="w-full flex items-center gap-2"
          variant="default"
          size="sm"
          data-testid={`button-start-match-${team.id}`}
        >
          <Play className="h-4 w-4" />
          Start a Match
        </Button>
      </CardFooter>
    </Card>
  );
}