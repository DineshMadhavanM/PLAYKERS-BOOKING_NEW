import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Match } from "@shared/schema";
import { Undo2, Save, Trophy, Clock, Users } from "lucide-react";

interface FootballScorerProps {
  match: Match;
  onScoreUpdate: (scoreData: any) => void;
  isLive: boolean;
  rosterPlayers?: any[];
}

interface PlayerStats {
  name: string;
  position: string;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  tackles: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  saves: number; // For goalkeepers
  minutesPlayed: number;
  isSubstituted: boolean;
}

interface MatchEvent {
  minute: number;
  eventType: 'goal' | 'yellow-card' | 'red-card' | 'substitution' | 'half-time' | 'full-time';
  team: string;
  player?: string;
  details?: string;
}

interface Substitution {
  minute: number;
  team: string;
  playerOut: string;
  playerIn: string;
}

export default function FootballScorer({ match, onScoreUpdate, isLive, rosterPlayers = [] }: FootballScorerProps) {
  const { toast } = useToast();
  
  // Match state
  const [team1Goals, setTeam1Goals] = useState(0);
  const [team2Goals, setTeam2Goals] = useState(0);
  const [currentHalf, setCurrentHalf] = useState(1);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [injuryTime, setInjuryTime] = useState(0);
  const [isHalfTime, setIsHalfTime] = useState(false);
  const [isMatchCompleted, setIsMatchCompleted] = useState(false);
  const [matchResult, setMatchResult] = useState("");
  
  // Player management
  const [team1Players, setTeam1Players] = useState<PlayerStats[]>([]);
  const [team2Players, setTeam2Players] = useState<PlayerStats[]>([]);
  const [team1Substitutions, setTeam1Substitutions] = useState<Substitution[]>([]);
  const [team2Substitutions, setTeam2Substitutions] = useState<Substitution[]>([]);
  
  // Match events
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  
  // Dialog states
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [showSubDialog, setShowSubDialog] = useState(false);
  const [showManOfMatchDialog, setShowManOfMatchDialog] = useState(false);
  const [showStartingXIDialog, setShowStartingXIDialog] = useState(true);
  
  // Dialog selections
  const [selectedTeam, setSelectedTeam] = useState<1 | 2>(1);
  const [selectedScorer, setSelectedScorer] = useState("");
  const [selectedAssist, setSelectedAssist] = useState("");
  const [goalType, setGoalType] = useState<'regular' | 'penalty' | 'own-goal'>('regular');
  const [cardType, setCardType] = useState<'yellow' | 'red'>('yellow');
  const [selectedCardPlayer, setSelectedCardPlayer] = useState("");
  const [selectedPlayerOut, setSelectedPlayerOut] = useState("");
  const [selectedPlayerIn, setSelectedPlayerIn] = useState("");
  const [selectedManOfMatch, setSelectedManOfMatch] = useState("");
  
  // Flash effects
  const [showGoalFlash, setShowGoalFlash] = useState(false);
  const [showCardFlash, setShowCardFlash] = useState(false);
  
  // State history for undo
  const [stateHistory, setStateHistory] = useState<any[]>([]);
  
  // Match saving
  const [isSavingMatch, setIsSavingMatch] = useState(false);

  // Initialize starting XI
  useEffect(() => {
    if (rosterPlayers && rosterPlayers.length > 0 && team1Players.length === 0 && team2Players.length === 0) {
      const team1Roster = rosterPlayers.filter((p: any) => p.team === 'team1');
      const team2Roster = rosterPlayers.filter((p: any) => p.team === 'team2');
      
      if (team1Roster.length > 0 && team2Roster.length > 0) {
        setShowStartingXIDialog(true);
      }
    }
  }, [rosterPlayers, team1Players.length, team2Players.length]);

  // Broadcast score updates when state changes
  useEffect(() => {
    if (isLive && (team1Players.length > 0 || team2Players.length > 0)) {
      const scoreData = {
        team1Score: { goals: team1Goals },
        team2Score: { goals: team2Goals },
        matchData: {
          currentHalf,
          currentMinute,
          injuryTime,
          matchEvents,
          team1Substitutions,
          team2Substitutions,
        },
      };
      onScoreUpdate(scoreData);
    }
  }, [team1Goals, team2Goals, currentHalf, currentMinute, injuryTime, matchEvents, team1Substitutions, team2Substitutions, isLive, team1Players.length, team2Players.length, onScoreUpdate]);

  // Save state for undo
  const saveStateSnapshot = () => {
    const snapshot = {
      team1Goals,
      team2Goals,
      currentHalf,
      currentMinute,
      injuryTime,
      team1Players: JSON.parse(JSON.stringify(team1Players)),
      team2Players: JSON.parse(JSON.stringify(team2Players)),
      matchEvents: [...matchEvents],
      team1Substitutions: [...team1Substitutions],
      team2Substitutions: [...team2Substitutions],
    };
    setStateHistory(prev => [...prev.slice(-9), snapshot]);
  };

  // Undo last action
  const undoLastAction = () => {
    if (stateHistory.length === 0) {
      toast({
        title: "No Actions to Undo",
        description: "There are no previous actions to undo.",
        variant: "destructive",
      });
      return;
    }

    const lastState = stateHistory[stateHistory.length - 1];
    setTeam1Goals(lastState.team1Goals);
    setTeam2Goals(lastState.team2Goals);
    setCurrentHalf(lastState.currentHalf);
    setCurrentMinute(lastState.currentMinute);
    setInjuryTime(lastState.injuryTime);
    setTeam1Players(lastState.team1Players);
    setTeam2Players(lastState.team2Players);
    setMatchEvents(lastState.matchEvents);
    setTeam1Substitutions(lastState.team1Substitutions);
    setTeam2Substitutions(lastState.team2Substitutions);
    setStateHistory(prev => prev.slice(0, -1));

    toast({
      title: "✓ Action Undone",
      description: "Last action has been reverted",
      duration: 2000,
    });
  };

  // Get player roster by team
  const getTeamRoster = (team: 1 | 2) => {
    return rosterPlayers.filter((p: any) => p.team === `team${team}`);
  };

  // Get active players (not substituted)
  const getActivePlayers = (team: 1 | 2) => {
    const players = team === 1 ? team1Players : team2Players;
    return players.filter(p => !p.isSubstituted);
  };

  // Get substitute players
  const getSubstitutePlayers = (team: 1 | 2) => {
    const roster = getTeamRoster(team);
    const activePlayers = team === 1 ? team1Players : team2Players;
    const activeNames = activePlayers.map(p => p.name);
    return roster.filter((p: any) => !activeNames.includes(p.playerName || p.name));
  };

  // Update player stats
  const updatePlayerStats = (team: 1 | 2, playerName: string, statsUpdate: Partial<PlayerStats>) => {
    const setPlayers = team === 1 ? setTeam1Players : setTeam2Players;
    const players = team === 1 ? team1Players : team2Players;
    
    setPlayers(prev => prev.map(p => {
      if (p.name === playerName) {
        // Calculate new values based on current player state
        const currentPlayer = players.find(pl => pl.name === playerName);
        if (!currentPlayer) return p;
        
        // Merge updates with current values
        const updates: Partial<PlayerStats> = {};
        if (statsUpdate.goals !== undefined) updates.goals = statsUpdate.goals;
        if (statsUpdate.assists !== undefined) updates.assists = statsUpdate.assists;
        if (statsUpdate.yellowCards !== undefined) updates.yellowCards = statsUpdate.yellowCards;
        if (statsUpdate.redCards !== undefined) updates.redCards = statsUpdate.redCards;
        if (statsUpdate.fouls !== undefined) updates.fouls = statsUpdate.fouls;
        if (statsUpdate.isSubstituted !== undefined) updates.isSubstituted = statsUpdate.isSubstituted;
        if (statsUpdate.minutesPlayed !== undefined) updates.minutesPlayed = statsUpdate.minutesPlayed;
        
        return { ...p, ...updates };
      }
      return p;
    }));
  };

  // Add goal
  const openGoalDialog = (team: 1 | 2) => {
    if (!isLive || isMatchCompleted) return;
    saveStateSnapshot();
    setSelectedTeam(team);
    setSelectedScorer("");
    setSelectedAssist("");
    setGoalType('regular');
    setShowGoalDialog(true);
  };

  const addGoal = () => {
    if (!selectedScorer) {
      toast({
        title: "Scorer Required",
        description: "Please select the goal scorer",
        variant: "destructive",
      });
      return;
    }

    // Update score
    if (goalType === 'own-goal') {
      // Own goal goes to opposite team
      if (selectedTeam === 1) {
        setTeam2Goals(prev => prev + 1);
      } else {
        setTeam1Goals(prev => prev + 1);
      }
    } else {
      if (selectedTeam === 1) {
        setTeam1Goals(prev => prev + 1);
      } else {
        setTeam2Goals(prev => prev + 1);
      }
    }

    // Update player stats
    if (goalType !== 'own-goal') {
      updatePlayerStats(selectedTeam, selectedScorer, {
        goals: (team1Players.find(p => p.name === selectedScorer)?.goals || 0) + 1
      });
      
      if (selectedAssist) {
        updatePlayerStats(selectedTeam, selectedAssist, {
          assists: (team1Players.find(p => p.name === selectedAssist)?.assists || 0) + 1
        });
      }
    }

    // Add event
    const eventDetails = goalType === 'penalty' ? '(Penalty)' : goalType === 'own-goal' ? '(Own Goal)' : '';
    const assistText = selectedAssist && goalType !== 'own-goal' ? `, assist: ${selectedAssist}` : '';
    const event: MatchEvent = {
      minute: currentMinute + (injuryTime > 0 ? injuryTime : 0),
      eventType: 'goal',
      team: selectedTeam === 1 ? (match.team1Name || 'Team 1') : (match.team2Name || 'Team 2'),
      player: selectedScorer,
      details: `⚽ Goal ${eventDetails}${assistText}`,
    };
    setMatchEvents(prev => [...prev, event]);

    // Flash effect
    setShowGoalFlash(true);
    setTimeout(() => setShowGoalFlash(false), 1500);

    toast({
      title: "⚽ GOAL!",
      description: `${selectedScorer} scores for ${event.team}!`,
      duration: 3000,
    });

    setShowGoalDialog(false);
  };

  // Add card
  const openCardDialog = (team: 1 | 2, type: 'yellow' | 'red') => {
    if (!isLive || isMatchCompleted) return;
    saveStateSnapshot();
    setSelectedTeam(team);
    setCardType(type);
    setSelectedCardPlayer("");
    setShowCardDialog(true);
  };

  const addCard = () => {
    if (!selectedCardPlayer) {
      toast({
        title: "Player Required",
        description: "Please select a player",
        variant: "destructive",
      });
      return;
    }

    const players = selectedTeam === 1 ? team1Players : team2Players;
    const player = players.find(p => p.name === selectedCardPlayer);

    if (cardType === 'yellow') {
      updatePlayerStats(selectedTeam, selectedCardPlayer, {
        yellowCards: (player?.yellowCards || 0) + 1,
        fouls: (player?.fouls || 0) + 1,
      });
    } else {
      updatePlayerStats(selectedTeam, selectedCardPlayer, {
        redCards: (player?.redCards || 0) + 1,
      });
    }

    // Add event
    const event: MatchEvent = {
      minute: currentMinute + (injuryTime > 0 ? injuryTime : 0),
      eventType: cardType === 'yellow' ? 'yellow-card' : 'red-card',
      team: selectedTeam === 1 ? (match.team1Name || 'Team 1') : (match.team2Name || 'Team 2'),
      player: selectedCardPlayer,
      details: cardType === 'yellow' ? '🟨 Yellow Card' : '🟥 Red Card',
    };
    setMatchEvents(prev => [...prev, event]);

    // Flash effect
    setShowCardFlash(true);
    setTimeout(() => setShowCardFlash(false), 1000);

    toast({
      title: cardType === 'yellow' ? "🟨 Yellow Card" : "🟥 Red Card",
      description: `${selectedCardPlayer} receives a ${cardType} card`,
      variant: cardType === 'red' ? 'destructive' : 'default',
    });

    setShowCardDialog(false);
  };

  // Substitution
  const openSubDialog = (team: 1 | 2) => {
    if (!isLive || isMatchCompleted) return;
    const subs = team === 1 ? team1Substitutions : team2Substitutions;
    if (subs.length >= 5) {
      toast({
        title: "Substitution Limit Reached",
        description: "Maximum 5 substitutions allowed per team",
        variant: "destructive",
      });
      return;
    }
    saveStateSnapshot();
    setSelectedTeam(team);
    setSelectedPlayerOut("");
    setSelectedPlayerIn("");
    setShowSubDialog(true);
  };

  const addSubstitution = () => {
    if (!selectedPlayerOut || !selectedPlayerIn) {
      toast({
        title: "Players Required",
        description: "Please select both players",
        variant: "destructive",
      });
      return;
    }

    const sub: Substitution = {
      minute: currentMinute + (injuryTime > 0 ? injuryTime : 0),
      team: selectedTeam === 1 ? (match.team1Name || 'Team 1') : (match.team2Name || 'Team 2'),
      playerOut: selectedPlayerOut,
      playerIn: selectedPlayerIn,
    };

    // Update substitutions list
    if (selectedTeam === 1) {
      setTeam1Substitutions(prev => [...prev, sub]);
    } else {
      setTeam2Substitutions(prev => [...prev, sub]);
    }

    // Mark player as substituted
    updatePlayerStats(selectedTeam, selectedPlayerOut, {
      isSubstituted: true,
      minutesPlayed: currentMinute,
    });

    // Add new player to active roster
    const roster = getTeamRoster(selectedTeam);
    const newPlayer = roster.find((p: any) => (p.playerName || p.name) === selectedPlayerIn);
    if (newPlayer) {
      const playerStat: PlayerStats = {
        name: newPlayer.playerName || newPlayer.name,
        position: newPlayer.position || 'SUB',
        goals: 0,
        assists: 0,
        shots: 0,
        shotsOnTarget: 0,
        passes: 0,
        tackles: 0,
        fouls: 0,
        yellowCards: 0,
        redCards: 0,
        saves: 0,
        minutesPlayed: 0,
        isSubstituted: false,
      };

      if (selectedTeam === 1) {
        setTeam1Players(prev => [...prev, playerStat]);
      } else {
        setTeam2Players(prev => [...prev, playerStat]);
      }
    }

    // Add event
    const event: MatchEvent = {
      minute: currentMinute + (injuryTime > 0 ? injuryTime : 0),
      eventType: 'substitution',
      team: sub.team,
      details: `🔄 ${selectedPlayerIn} ↔ ${selectedPlayerOut}`,
    };
    setMatchEvents(prev => [...prev, event]);

    toast({
      title: "🔄 Substitution",
      description: `${selectedPlayerIn} replaces ${selectedPlayerOut}`,
    });

    setShowSubDialog(false);
  };

  // Half time controls
  const endFirstHalf = () => {
    if (!isLive) return;
    saveStateSnapshot();
    setIsHalfTime(true);
    
    const event: MatchEvent = {
      minute: 45 + (injuryTime > 0 ? injuryTime : 0),
      eventType: 'half-time',
      team: '',
      details: '⏸️ Half Time',
    };
    setMatchEvents(prev => [...prev, event]);

    toast({
      title: "⏸️ Half Time",
      description: `Score: ${match.team1Name || 'Team 1'} ${team1Goals} - ${team2Goals} ${match.team2Name || 'Team 2'}`,
      duration: 5000,
    });
  };

  const startSecondHalf = () => {
    if (!isLive) return;
    setCurrentHalf(2);
    setCurrentMinute(45);
    setInjuryTime(0);
    setIsHalfTime(false);

    toast({
      title: "▶️ Second Half Started",
      description: "Match resumed",
    });
  };

  const completeMatch = () => {
    if (!isLive) return;
    saveStateSnapshot();
    setIsMatchCompleted(true);

    // Determine result
    let result = "";
    if (team1Goals > team2Goals) {
      result = `${match.team1Name || 'Team 1'} wins ${team1Goals}-${team2Goals}`;
    } else if (team2Goals > team1Goals) {
      result = `${match.team2Name || 'Team 2'} wins ${team2Goals}-${team1Goals}`;
    } else {
      result = `Match drawn ${team1Goals}-${team1Goals}`;
    }
    setMatchResult(result);

    const event: MatchEvent = {
      minute: 90 + (injuryTime > 0 ? injuryTime : 0),
      eventType: 'full-time',
      team: '',
      details: '🏁 Full Time',
    };
    setMatchEvents(prev => [...prev, event]);

    toast({
      title: "🏁 Full Time",
      description: result,
      duration: 8000,
    });

    setShowManOfMatchDialog(true);
  };

  // Update score and broadcast
  const updateScore = () => {
    const scoreData = {
      team1Score: { goals: team1Goals },
      team2Score: { goals: team2Goals },
      matchData: {
        currentHalf,
        currentMinute,
        injuryTime,
        matchEvents,
        team1Substitutions,
        team2Substitutions,
      },
    };
    onScoreUpdate(scoreData);
  };

  // Save match
  const handleSaveMatch = async () => {
    if (!isMatchCompleted) {
      toast({
        title: "Match Not Complete",
        description: "Please complete the match before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSavingMatch(true);
    try {
      // Build match data
      const matchData = match.matchData as any || {};
      
      const updatedMatch = {
        status: 'completed',
        team1Score: { goals: team1Goals },
        team2Score: { goals: team2Goals },
        matchData: {
          ...matchData,
          team1Id: matchData.team1Id,
          team2Id: matchData.team2Id,
          currentHalf,
          finalMinute: 90 + injuryTime,
          matchEvents,
          team1Substitutions,
          team2Substitutions,
          team1Players: team1Players.map(p => ({
            playerId: rosterPlayers.find((rp: any) => (rp.playerName || rp.name) === p.name)?.id || p.name,
            ...p,
          })),
          team2Players: team2Players.map(p => ({
            playerId: rosterPlayers.find((rp: any) => (rp.playerName || rp.name) === p.name)?.id || p.name,
            ...p,
          })),
          manOfTheMatch: selectedManOfMatch,
          result: matchResult,
        },
      };

      await apiRequest('PATCH', `/api/matches/${match.id}`, updatedMatch);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/matches', match.id] });

      toast({
        title: "✓ Match Saved Successfully",
        description: "All match data has been saved to the database",
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: "❌ Save Failed",
        description: error.message || "Failed to save match data",
        variant: "destructive",
      });
    } finally {
      setIsSavingMatch(false);
    }
  };

  // Initialize starting XI dialog
  const initializeStartingXI = () => {
    const team1Roster = rosterPlayers.filter((p: any) => p.team === 'team1').slice(0, 11);
    const team2Roster = rosterPlayers.filter((p: any) => p.team === 'team2').slice(0, 11);

    const createPlayerStats = (player: any): PlayerStats => ({
      name: player.playerName || player.name,
      position: player.position || 'FW',
      goals: 0,
      assists: 0,
      shots: 0,
      shotsOnTarget: 0,
      passes: 0,
      tackles: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      saves: 0,
      minutesPlayed: 0,
      isSubstituted: false,
    });

    setTeam1Players(team1Roster.map(createPlayerStats));
    setTeam2Players(team2Roster.map(createPlayerStats));
    setShowStartingXIDialog(false);

    toast({
      title: "✓ Starting XI Set",
      description: "Teams are ready to play",
    });
  };

  return (
    <div className="space-y-6" data-testid="football-scorer">
      {/* Flash Effects */}
      {showGoalFlash && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="text-8xl font-bold text-green-500 animate-ping">
            GOAL!
          </div>
        </div>
      )}
      {showCardFlash && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="text-8xl font-bold text-yellow-500 animate-ping">
            CARD!
          </div>
        </div>
      )}

      {/* Current Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Football Scorer</span>
            <div className="flex gap-2">
              <Badge variant={currentHalf === 1 ? "default" : "secondary"}>
                {currentHalf === 1 ? '1st Half' : '2nd Half'}
              </Badge>
              <Badge variant="outline" data-testid="text-current-time">
                {currentMinute}'{injuryTime > 0 && `+${injuryTime}`}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl dark:from-blue-900/20 dark:to-blue-800/20">
              <h3 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-200">
                {match.team1Name || "Team 1"}
              </h3>
              <div className="text-5xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-team1-football-score">
                {team1Goals}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground mb-2">VS</div>
                {isMatchCompleted && (
                  <Badge variant="secondary" className="text-xs">Full Time</Badge>
                )}
                {isHalfTime && (
                  <Badge variant="default" className="text-xs">Half Time</Badge>
                )}
              </div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl dark:from-red-900/20 dark:to-red-800/20">
              <h3 className="text-lg font-semibold mb-2 text-red-800 dark:text-red-200">
                {match.team2Name || "Team 2"}
              </h3>
              <div className="text-5xl font-bold text-red-600 dark:text-red-400" data-testid="text-team2-football-score">
                {team2Goals}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Controls */}
      {isLive && !isMatchCompleted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Match Controls</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undoLastAction}
                  disabled={stateHistory.length === 0}
                  data-testid="button-undo"
                >
                  <Undo2 className="h-4 w-4 mr-1" />
                  Undo
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Time Controls */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="current-minute">Current Minute</Label>
                  <Input
                    id="current-minute"
                    type="number"
                    value={currentMinute}
                    onChange={(e) => setCurrentMinute(parseInt(e.target.value) || 0)}
                    className="w-full"
                    data-testid="input-current-minute"
                  />
                </div>
                <div>
                  <Label htmlFor="injury-time">Injury Time</Label>
                  <Input
                    id="injury-time"
                    type="number"
                    value={injuryTime}
                    onChange={(e) => setInjuryTime(parseInt(e.target.value) || 0)}
                    className="w-full"
                    data-testid="input-injury-time"
                  />
                </div>
                <div className="flex items-end">
                  {currentHalf === 1 && !isHalfTime && (
                    <Button
                      onClick={endFirstHalf}
                      variant="secondary"
                      className="w-full"
                      data-testid="button-half-time"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Half Time
                    </Button>
                  )}
                  {isHalfTime && (
                    <Button
                      onClick={startSecondHalf}
                      className="w-full"
                      data-testid="button-start-second-half"
                    >
                      Start 2nd Half
                    </Button>
                  )}
                  {currentHalf === 2 && !isHalfTime && (
                    <Button
                      onClick={completeMatch}
                      variant="default"
                      className="w-full"
                      data-testid="button-complete-match"
                    >
                      Full Time
                    </Button>
                  )}
                </div>
              </div>

              {/* Scoring Actions */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">{match.team1Name || "Team 1"}</h4>
                  <div className="space-y-2">
                    <Button
                      onClick={() => openGoalDialog(1)}
                      className="w-full"
                      data-testid="button-goal-team1"
                    >
                      ⚽ Goal
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => openCardDialog(1, 'yellow')}
                        variant="outline"
                        className="flex-1"
                        data-testid="button-yellow-card-team1"
                      >
                        🟨
                      </Button>
                      <Button
                        onClick={() => openCardDialog(1, 'red')}
                        variant="destructive"
                        className="flex-1"
                        data-testid="button-red-card-team1"
                      >
                        🟥
                      </Button>
                    </div>
                    <Button
                      onClick={() => openSubDialog(1)}
                      variant="secondary"
                      className="w-full"
                      data-testid="button-sub-team1"
                    >
                      🔄 Substitution ({team1Substitutions.length}/5)
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">{match.team2Name || "Team 2"}</h4>
                  <div className="space-y-2">
                    <Button
                      onClick={() => openGoalDialog(2)}
                      className="w-full"
                      data-testid="button-goal-team2"
                    >
                      ⚽ Goal
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => openCardDialog(2, 'yellow')}
                        variant="outline"
                        className="flex-1"
                        data-testid="button-yellow-card-team2"
                      >
                        🟨
                      </Button>
                      <Button
                        onClick={() => openCardDialog(2, 'red')}
                        variant="destructive"
                        className="flex-1"
                        data-testid="button-red-card-team2"
                      >
                        🟥
                      </Button>
                    </div>
                    <Button
                      onClick={() => openSubDialog(2)}
                      variant="secondary"
                      className="w-full"
                      data-testid="button-sub-team2"
                    >
                      🔄 Substitution ({team2Substitutions.length}/5)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Player Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="team1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="team1">{match.team1Name || "Team 1"}</TabsTrigger>
              <TabsTrigger value="team2">{match.team2Name || "Team 2"}</TabsTrigger>
            </TabsList>
            <TabsContent value="team1" className="space-y-2">
              {team1Players.map((player, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">{player.name}</p>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span>{player.position}</span>
                      {player.isSubstituted && <Badge variant="outline" className="text-xs">OUT</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    {player.goals > 0 && <span className="text-green-600 dark:text-green-400">⚽ {player.goals}</span>}
                    {player.assists > 0 && <span className="text-blue-600 dark:text-blue-400">🎯 {player.assists}</span>}
                    {player.yellowCards > 0 && <span>🟨 {player.yellowCards}</span>}
                    {player.redCards > 0 && <span>🟥 {player.redCards}</span>}
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="team2" className="space-y-2">
              {team2Players.map((player, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">{player.name}</p>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span>{player.position}</span>
                      {player.isSubstituted && <Badge variant="outline" className="text-xs">OUT</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    {player.goals > 0 && <span className="text-green-600 dark:text-green-400">⚽ {player.goals}</span>}
                    {player.assists > 0 && <span className="text-blue-600 dark:text-blue-400">🎯 {player.assists}</span>}
                    {player.yellowCards > 0 && <span>🟨 {player.yellowCards}</span>}
                    {player.redCards > 0 && <span>🟥 {player.redCards}</span>}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Match Events */}
      {matchEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Match Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matchEvents.slice().reverse().map((event, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 border-l-4 border-primary pl-3">
                  <div>
                    <p className="text-sm font-medium">{event.details}</p>
                    {event.player && <p className="text-xs text-muted-foreground">{event.player}</p>}
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">{event.minute}'</Badge>
                    {event.team && <p className="text-xs text-muted-foreground mt-1">{event.team}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Match */}
      {isMatchCompleted && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Match Complete</h3>
                <p className="text-sm text-muted-foreground">{matchResult}</p>
              </div>
              <Button
                onClick={handleSaveMatch}
                disabled={isSavingMatch}
                size="lg"
                data-testid="button-save-match"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSavingMatch ? "Saving..." : "Save Match"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Starting XI Dialog */}
      <Dialog open={showStartingXIDialog} onOpenChange={setShowStartingXIDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initialize Starting XI</DialogTitle>
            <DialogDescription>
              The first 11 players from each team roster will be set as starting XI
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={initializeStartingXI} data-testid="button-init-xi">
              <Users className="h-4 w-4 mr-2" />
              Set Starting XI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚽ Goal for {selectedTeam === 1 ? (match.team1Name || 'Team 1') : (match.team2Name || 'Team 2')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Goal Type</Label>
              <Select value={goalType} onValueChange={(v: any) => setGoalType(v)}>
                <SelectTrigger data-testid="select-goal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Goal</SelectItem>
                  <SelectItem value="penalty">Penalty</SelectItem>
                  <SelectItem value="own-goal">Own Goal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scorer *</Label>
              <Select value={selectedScorer} onValueChange={setSelectedScorer}>
                <SelectTrigger data-testid="select-scorer">
                  <SelectValue placeholder="Select scorer" />
                </SelectTrigger>
                <SelectContent>
                  {getActivePlayers(selectedTeam).map((p) => (
                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {goalType !== 'own-goal' && (
              <div>
                <Label>Assist (Optional)</Label>
                <Select value={selectedAssist} onValueChange={setSelectedAssist}>
                  <SelectTrigger data-testid="select-assist">
                    <SelectValue placeholder="Select assist" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Assist</SelectItem>
                    {getActivePlayers(selectedTeam)
                      .filter(p => p.name !== selectedScorer)
                      .map((p) => (
                        <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoalDialog(false)}>Cancel</Button>
            <Button onClick={addGoal} data-testid="button-confirm-goal">Add Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Dialog */}
      <Dialog open={showCardDialog} onOpenChange={setShowCardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cardType === 'yellow' ? '🟨 Yellow Card' : '🟥 Red Card'} for {selectedTeam === 1 ? (match.team1Name || 'Team 1') : (match.team2Name || 'Team 2')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Player *</Label>
            <Select value={selectedCardPlayer} onValueChange={setSelectedCardPlayer}>
              <SelectTrigger data-testid="select-card-player">
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {getActivePlayers(selectedTeam).map((p) => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCardDialog(false)}>Cancel</Button>
            <Button onClick={addCard} data-testid="button-confirm-card">Add Card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Substitution Dialog */}
      <Dialog open={showSubDialog} onOpenChange={setShowSubDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔄 Substitution for {selectedTeam === 1 ? (match.team1Name || 'Team 1') : (match.team2Name || 'Team 2')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Player Out *</Label>
              <Select value={selectedPlayerOut} onValueChange={setSelectedPlayerOut}>
                <SelectTrigger data-testid="select-player-out">
                  <SelectValue placeholder="Select player to substitute" />
                </SelectTrigger>
                <SelectContent>
                  {getActivePlayers(selectedTeam).map((p) => (
                    <SelectItem key={p.name} value={p.name}>{p.name} ({p.position})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Player In *</Label>
              <Select value={selectedPlayerIn} onValueChange={setSelectedPlayerIn}>
                <SelectTrigger data-testid="select-player-in">
                  <SelectValue placeholder="Select substitute" />
                </SelectTrigger>
                <SelectContent>
                  {getSubstitutePlayers(selectedTeam).map((p: any) => (
                    <SelectItem key={p.id} value={p.playerName || p.name}>
                      {p.playerName || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubDialog(false)}>Cancel</Button>
            <Button onClick={addSubstitution} data-testid="button-confirm-sub">Confirm Substitution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Man of the Match Dialog */}
      <Dialog open={showManOfMatchDialog} onOpenChange={setShowManOfMatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🏆 Man of the Match</DialogTitle>
            <DialogDescription>Select the best player of the match</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Player</Label>
            <Select value={selectedManOfMatch} onValueChange={setSelectedManOfMatch}>
              <SelectTrigger data-testid="select-man-of-match">
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                <optgroup label={match.team1Name || "Team 1"}>
                  {team1Players.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name} - {p.goals}G {p.assists}A
                    </SelectItem>
                  ))}
                </optgroup>
                <optgroup label={match.team2Name || "Team 2"}>
                  {team2Players.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name} - {p.goals}G {p.assists}A
                    </SelectItem>
                  ))}
                </optgroup>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManOfMatchDialog(false)}>Skip</Button>
            <Button onClick={() => setShowManOfMatchDialog(false)} disabled={!selectedManOfMatch} data-testid="button-confirm-motm">
              <Trophy className="h-4 w-4 mr-2" />
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
