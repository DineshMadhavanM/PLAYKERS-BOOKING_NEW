import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Share } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Match } from "@shared/schema";

interface MatchCardProps {
  match: Match;
  showActions?: boolean;
}

const sportEmojis: Record<string, string> = {
  cricket: "🏏",
  football: "⚽",
  volleyball: "🏐",
  tennis: "🎾",
  kabaddi: "🤼",
};

export default function MatchCard({ match, showActions = true }: MatchCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const joinMatchMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/matches/${match.id}/join`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "You have joined the match!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
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
        description: "Failed to join match. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const canJoinMatch = match.isPublic && match.status === 'upcoming' && 
    (match.currentPlayers || 0) < (match.maxPlayers || 0);

  return (
    <Card className="hover:shadow-lg transition-shadow" data-testid={`card-match-${match.id}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{sportEmojis[match.sport] || "🏃"}</div>
            <div>
              <h3 className="font-semibold text-lg" data-testid={`text-match-title-${match.id}`}>
                {match.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {match.matchType} • {match.isPublic ? "Public Match" : "Private Match"}
              </p>
            </div>
          </div>
          <Badge 
            variant={match.status === 'upcoming' ? "default" : "secondary"}
            data-testid={`badge-match-status-${match.id}`}
          >
            {match.status === 'upcoming' ? (match.isPublic ? "Open" : "Invite Only") : match.status}
          </Badge>
        </div>

        {match.team1Name && match.team2Name ? (
          <div className="flex justify-between items-center mb-4">
            <div className="text-center">
              <p className="font-semibold" data-testid={`text-team1-${match.id}`}>{match.team1Name}</p>
              <p className="text-muted-foreground text-sm">Team 1</p>
            </div>
            <div className="text-center text-muted-foreground font-medium">VS</div>
            <div className="text-center">
              <p className="font-semibold" data-testid={`text-team2-${match.id}`}>{match.team2Name}</p>
              <p className="text-muted-foreground text-sm">Team 2</p>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-center text-muted-foreground">
              <Users className="h-4 w-4 inline mr-1" />
              {match.currentPlayers || 0}/{match.maxPlayers} players joined
            </p>
          </div>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            <span data-testid={`text-match-date-${match.id}`}>
              {formatDate(match.scheduledAt)}
            </span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2" />
            <span data-testid={`text-match-venue-${match.id}`}>
              Venue ID: {match.venueId}
            </span>
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2">
            {canJoinMatch ? (
              <Button 
                className="flex-1" 
                onClick={() => joinMatchMutation.mutate()}
                disabled={joinMatchMutation.isPending}
                data-testid={`button-join-match-${match.id}`}
              >
                {joinMatchMutation.isPending ? "Joining..." : "Join Match"}
              </Button>
            ) : (
              <Button 
                className="flex-1" 
                variant="outline" 
                disabled
                data-testid={`button-match-full-${match.id}`}
              >
                {match.isPublic ? "Match Full" : "Private Match"}
              </Button>
            )}
            <Button variant="outline" size="icon" data-testid={`button-share-match-${match.id}`}>
              <Share className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
