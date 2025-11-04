import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, User, Trophy, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface Player {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  userId: string | null;
  teamId: string | null;
  teamName: string | null;
  role: string | null;
  battingStyle: string | null;
  bowlingStyle: string | null;
  jerseyNumber: number | null;
  careerStats: {
    totalMatches: number;
    totalRuns: number;
    totalWickets: number;
    battingAverage: number;
    strikeRate: number;
    economy: number;
  };
}

interface SearchPlayerDialogProps {
  trigger?: React.ReactNode;
}

export default function SearchPlayerDialog({ trigger }: SearchPlayerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const queryUrl = searchQuery 
    ? `/api/players?search=${encodeURIComponent(searchQuery)}`
    : "/api/players";

  const { data: players = [], isLoading } = useQuery<Player[]>({
    queryKey: [queryUrl],
    enabled: isOpen,
  });

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : name.substring(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" data-testid="button-search-player">
            <Search className="h-4 w-4 mr-2" />
            Search Player
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" data-testid="dialog-search-player">
        <DialogHeader>
          <DialogTitle>Search Players</DialogTitle>
          <DialogDescription>
            Search for players by name, team, or role
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-player"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-players">
              {searchQuery
                ? "No players found matching your search"
                : "No players available"}
            </div>
          ) : (
            players.map((player) => (
              <Card
                key={player.id}
                className="hover:bg-accent/50 transition-colors cursor-pointer"
                data-testid={`card-player-${player.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={undefined} alt={player.name} />
                        <AvatarFallback>{getInitials(player.name)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate" data-testid={`text-player-name-${player.id}`}>
                            {player.name}
                          </h3>
                          {player.jerseyNumber && (
                            <Badge variant="outline" className="text-xs">
                              #{player.jerseyNumber}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-2">
                          {player.teamName && (
                            <Badge variant="secondary" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
                              {player.teamName}
                            </Badge>
                          )}
                          {player.role && (
                            <Badge variant="outline" className="text-xs">
                              {player.role}
                            </Badge>
                          )}
                        </div>

                        {player.careerStats && player.careerStats.totalMatches > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Trophy className="h-3 w-3" />
                              <span>{player.careerStats.totalMatches} matches</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              <span>{player.careerStats.totalRuns} runs</span>
                            </div>
                            {player.careerStats.battingAverage > 0 && (
                              <div>
                                Avg: {player.careerStats.battingAverage.toFixed(1)}
                              </div>
                            )}
                            {player.careerStats.totalWickets > 0 && (
                              <div>
                                {player.careerStats.totalWickets} wickets
                              </div>
                            )}
                          </div>
                        )}

                        {player.email && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {player.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
