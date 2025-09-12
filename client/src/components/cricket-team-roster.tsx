import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Users, Crown, Shield, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface Player {
  id: string;
  name: string;
  email: string;
  role: "captain" | "vice-captain" | "wicket-keeper" | "player";
  position: number;
}

interface CricketTeamRosterProps {
  teamName: string;
  teamNumber: 1 | 2;
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
}

export default function CricketTeamRoster({ 
  teamName, 
  teamNumber, 
  players, 
  onPlayersChange 
}: CricketTeamRosterProps) {
  const { toast } = useToast();
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");

  const addPlayer = () => {
    if (!newPlayerName.trim()) {
      toast({
        title: "Player name required",
        description: "Please enter a player name",
        variant: "destructive",
      });
      return;
    }

    if (players.length >= 15) {
      toast({
        title: "Team full",
        description: "Maximum 15 players allowed per team",
        variant: "destructive",
      });
      return;
    }

    const newPlayer: Player = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newPlayerName.trim(),
      email: newPlayerEmail.trim(),
      role: "player",
      position: players.length + 1,
    };

    onPlayersChange([...players, newPlayer]);
    setNewPlayerName("");
    setNewPlayerEmail("");
    
    toast({
      title: "Player added",
      description: `${newPlayer.name} has been added to ${teamName}`,
    });
  };

  const removePlayer = (playerId: string) => {
    const updatedPlayers = players
      .filter(p => p.id !== playerId)
      .map((p, index) => ({ ...p, position: index + 1 }));
    
    onPlayersChange(updatedPlayers);
    
    toast({
      title: "Player removed",
      description: "Player has been removed from the team",
    });
  };

  const updatePlayerRole = (playerId: string, newRole: Player["role"]) => {
    // Check if role is already taken (except for regular player)
    if (newRole !== "player") {
      const roleExists = players.some(p => p.id !== playerId && p.role === newRole);
      if (roleExists) {
        toast({
          title: "Role already assigned",
          description: `This team already has a ${newRole.replace("-", " ")}`,
          variant: "destructive",
        });
        return;
      }
    }

    const updatedPlayers = players.map(p => 
      p.id === playerId ? { ...p, role: newRole } : p
    );
    
    onPlayersChange(updatedPlayers);
  };

  const updatePlayerInfo = (playerId: string, field: "name" | "email", value: string) => {
    if (field === "name" && !value.trim()) {
      toast({
        title: "Invalid name",
        description: "Player name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    const updatedPlayers = players.map(p => 
      p.id === playerId ? { ...p, [field]: value } : p
    );
    
    onPlayersChange(updatedPlayers);
  };

  const getRoleIcon = (role: Player["role"]) => {
    switch (role) {
      case "captain": return <Crown className="h-4 w-4 text-yellow-600" />;
      case "vice-captain": return <Shield className="h-4 w-4 text-blue-600" />;
      case "wicket-keeper": return <Target className="h-4 w-4 text-green-600" />;
      default: return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeVariant = (role: Player["role"]) => {
    switch (role) {
      case "captain": return "default";
      case "vice-captain": return "secondary";
      case "wicket-keeper": return "outline";
      default: return "outline";
    }
  };

  const teamStyles = teamNumber === 1 
    ? {
        card: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-800",
        title: "text-blue-800 dark:text-blue-200",
        section: "bg-white dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700",
        button: "bg-blue-600 hover:bg-blue-700",
        text: "text-blue-600 dark:text-blue-400",
        textAlt: "text-blue-800 dark:text-blue-200"
      }
    : {
        card: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-800",
        title: "text-green-800 dark:text-green-200",
        section: "bg-white dark:bg-green-900/10 border border-green-200 dark:border-green-700",
        button: "bg-green-600 hover:bg-green-700",
        text: "text-green-600 dark:text-green-400",
        textAlt: "text-green-800 dark:text-green-200"
      };

  return (
    <Card className={teamStyles.card}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${teamStyles.title}`}>
          <Users className="h-5 w-5" />
          {teamName} Squad ({players.length}/15)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Player */}
        <div className={`${teamStyles.section} p-4 rounded-lg`}>
          <h4 className={`font-semibold mb-3 ${teamStyles.textAlt}`}>Add New Player</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor={`name-${teamNumber}`} className="text-sm font-medium">
                Player Name *
              </Label>
              <Input
                id={`name-${teamNumber}`}
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Enter player name"
                data-testid={`input-player-name-team${teamNumber}`}
                onKeyPress={(e) => e.key === "Enter" && addPlayer()}
              />
            </div>
            <div>
              <Label htmlFor={`email-${teamNumber}`} className="text-sm font-medium">
                Email (Optional)
              </Label>
              <Input
                id={`email-${teamNumber}`}
                type="email"
                value={newPlayerEmail}
                onChange={(e) => setNewPlayerEmail(e.target.value)}
                placeholder="Enter email (optional)"
                data-testid={`input-player-email-team${teamNumber}`}
                onKeyPress={(e) => e.key === "Enter" && addPlayer()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={addPlayer}
                disabled={players.length >= 15 || !newPlayerName.trim()}
                className={`w-full ${teamStyles.button}`}
                data-testid={`button-add-player-team${teamNumber}`}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </div>
          </div>
        </div>

        {/* Players List */}
        {players.length > 0 ? (
          <div className="space-y-3">
            <h4 className={`font-semibold ${teamStyles.textAlt}`}>Team Roster</h4>
            <div className="space-y-2">
              {players.map((player, index) => (
                <div 
                  key={player.id}
                  className={`${teamStyles.section} p-3 rounded-lg flex items-center gap-3`}
                  data-testid={`player-card-team${teamNumber}-${index}`}
                >
                  <div className="text-sm font-medium text-gray-500 min-w-[2rem]">
                    #{player.position}
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Input
                        value={player.name}
                        onChange={(e) => updatePlayerInfo(player.id, "name", e.target.value)}
                        className="text-sm"
                        data-testid={`input-edit-name-team${teamNumber}-${index}`}
                      />
                    </div>
                    <div>
                      <Input
                        type="email"
                        value={player.email}
                        onChange={(e) => updatePlayerInfo(player.id, "email", e.target.value)}
                        placeholder="Email (optional)"
                        className="text-sm"
                        data-testid={`input-edit-email-team${teamNumber}-${index}`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={player.role}
                        onValueChange={(value) => updatePlayerRole(player.id, value as Player["role"])}
                      >
                        <SelectTrigger className="text-sm" data-testid={`select-role-team${teamNumber}-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="player">Player</SelectItem>
                          <SelectItem value="captain">Captain</SelectItem>
                          <SelectItem value="vice-captain">Vice Captain</SelectItem>
                          <SelectItem value="wicket-keeper">Wicket Keeper</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={getRoleBadgeVariant(player.role)}
                      className="flex items-center gap-1 text-xs"
                    >
                      {getRoleIcon(player.role)}
                      {player.role.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePlayer(player.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`button-remove-player-team${teamNumber}-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`text-center py-8 ${teamStyles.text}`}>
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No players added yet</p>
            <p className="text-xs text-gray-500">Add players to build your team roster</p>
          </div>
        )}

        {/* Team Summary */}
        {players.length > 0 && (
          <div className={`${teamStyles.section} p-3 rounded-lg`}>
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">Team Summary:</span>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <Crown className="h-3 w-3 text-yellow-600" />
                  Captain: {players.find(p => p.role === "captain")?.name || "Not assigned"}
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-blue-600" />
                  Vice Captain: {players.find(p => p.role === "vice-captain")?.name || "Not assigned"}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-green-600" />
                  Wicket Keeper: {players.find(p => p.role === "wicket-keeper")?.name || "Not assigned"}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}