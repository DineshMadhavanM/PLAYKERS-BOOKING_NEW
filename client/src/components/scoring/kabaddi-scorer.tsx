import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface KabaddiScorerProps {
  match: any;
  onScoreUpdate: (scoreData: any) => void;
  isLive: boolean;
}

export default function KabaddiScorer({ match, onScoreUpdate, isLive }: KabaddiScorerProps) {
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [currentHalf, setCurrentHalf] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [team1Raids, setTeam1Raids] = useState(0);
  const [team2Raids, setTeam2Raids] = useState(0);
  const [team1Tackles, setTeam1Tackles] = useState(0);
  const [team2Tackles, setTeam2Tackles] = useState(0);
  const [raidingTeam, setRaidingTeam] = useState<1 | 2>(1);
  const [events, setEvents] = useState<Array<{time: number, event: string, team: string, points: number}>>([]);
  const [playerName, setPlayerName] = useState("");

  // Update score whenever state changes
  useEffect(() => {
    const scoreData = {
      team1Score: {
        points: team1Score,
        raids: team1Raids,
        tackles: team1Tackles,
        isRaiding: raidingTeam === 1,
      },
      team2Score: {
        points: team2Score,
        raids: team2Raids,
        tackles: team2Tackles,
        isRaiding: raidingTeam === 2,
      },
      matchData: {
        currentHalf,
        currentTime,
        raidingTeam,
        events,
        lastEvent: events[events.length - 1],
      },
    };
    onScoreUpdate(scoreData);
  }, [team1Score, team2Score, team1Raids, team2Raids, team1Tackles, team2Tackles, raidingTeam, currentHalf, currentTime, events, onScoreUpdate]);

  const addRaidPoint = (team: 1 | 2, points: number = 1) => {
    if (!isLive) return;

    if (team === 1) {
      setTeam1Score(prev => prev + points);
      setTeam1Raids(prev => prev + 1);
    } else {
      setTeam2Score(prev => prev + points);
      setTeam2Raids(prev => prev + 1);
    }

    const event = {
      time: currentTime,
      event: `Successful Raid${playerName ? ` by ${playerName}` : ''} (+${points})`,
      team: team === 1 ? match.team1Name || "Team 1" : match.team2Name || "Team 2",
      points,
    };

    setEvents(prev => [...prev, event]);
    setPlayerName("");
    
    // Switch raiding team
    setRaidingTeam(team === 1 ? 2 : 1);
  };

  const addTacklePoint = (team: 1 | 2, points: number = 1) => {
    if (!isLive) return;

    if (team === 1) {
      setTeam1Score(prev => prev + points);
      setTeam1Tackles(prev => prev + 1);
    } else {
      setTeam2Score(prev => prev + points);
      setTeam2Tackles(prev => prev + 1);
    }

    const event = {
      time: currentTime,
      event: `Successful Tackle${playerName ? ` by ${playerName}` : ''} (+${points})`,
      team: team === 1 ? match.team1Name || "Team 1" : match.team2Name || "Team 2",
      points,
    };

    setEvents(prev => [...prev, event]);
    setPlayerName("");
    // Switch raiding team after successful tackle - tackling team raids next
    setRaidingTeam(team);
  };

  const addBonusPoint = (team: 1 | 2) => {
    if (!isLive) return;

    if (team === 1) {
      setTeam1Score(prev => prev + 1);
    } else {
      setTeam2Score(prev => prev + 1);
    }

    const event = {
      time: currentTime,
      event: `Bonus Point${playerName ? ` by ${playerName}` : ''}`,
      team: team === 1 ? match.team1Name || "Team 1" : match.team2Name || "Team 2",
      points: 1,
    };

    setEvents(prev => [...prev, event]);
    setPlayerName("");
  };

  const addAllOut = (team: 1 | 2) => {
    if (!isLive) return;

    if (team === 1) {
      setTeam1Score(prev => prev + 2);
    } else {
      setTeam2Score(prev => prev + 2);
    }

    const event = {
      time: currentTime,
      event: "All Out (+2)",
      team: team === 1 ? match.team1Name || "Team 1" : match.team2Name || "Team 2",
      points: 2,
    };

    setEvents(prev => [...prev, event]);
    // Switch raiding team after all out
    setRaidingTeam(team === 1 ? 2 : 1);
  };

  const switchHalf = () => {
    if (!isLive) return;
    setCurrentHalf(2);
    setCurrentTime(0);
    setRaidingTeam(2); // Switch raiding team for second half
  };


  return (
    <div className="space-y-6" data-testid="kabaddi-scorer">
      {/* Current Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Kabaddi Scorer</span>
            <div className="flex gap-2">
              <Badge variant="outline" data-testid="text-current-half">
                Half {currentHalf}
              </Badge>
              <Badge variant="outline" data-testid="text-current-time">
                {currentTime}'
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                {match.team1Name || "Team 1"}
                {raidingTeam === 1 && <Badge variant="secondary">Raiding</Badge>}
              </h3>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary" data-testid="text-team1-kabaddi-score">
                  {team1Score}
                </div>
                <div className="text-sm text-muted-foreground">Points</div>
                <div className="flex justify-center gap-4 text-sm">
                  <span>Raids: {team1Raids}</span>
                  <span>Tackles: {team1Tackles}</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                {match.team2Name || "Team 2"}
                {raidingTeam === 2 && <Badge variant="secondary">Raiding</Badge>}
              </h3>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary" data-testid="text-team2-kabaddi-score">
                  {team2Score}
                </div>
                <div className="text-sm text-muted-foreground">Points</div>
                <div className="flex justify-center gap-4 text-sm">
                  <span>Raids: {team2Raids}</span>
                  <span>Tackles: {team2Tackles}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scoring Controls */}
      {isLive && (
        <Card>
          <CardHeader>
            <CardTitle>Scoring Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Time and Player */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="current-time">Current Time (minutes)</Label>
                  <Input
                    id="current-time"
                    type="number"
                    value={currentTime}
                    onChange={(e) => setCurrentTime(parseInt(e.target.value) || 0)}
                    data-testid="input-current-time"
                  />
                </div>
                <div>
                  <Label htmlFor="player-name">Player Name (Optional)</Label>
                  <Input
                    id="player-name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter player name"
                    data-testid="input-player-name"
                  />
                </div>
              </div>

              {/* Raid Points */}
              <div>
                <h4 className="font-semibold mb-3">Raid Points</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{match.team1Name || "Team 1"}</p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => addRaidPoint(1, 1)}
                        variant={raidingTeam === 1 ? "default" : "outline"}
                        data-testid="button-raid-1-team1"
                      >
                        +1
                      </Button>
                      <Button 
                        onClick={() => addRaidPoint(1, 2)}
                        variant={raidingTeam === 1 ? "default" : "outline"}
                        data-testid="button-raid-2-team1"
                      >
                        +2
                      </Button>
                      <Button 
                        onClick={() => addRaidPoint(1, 3)}
                        variant={raidingTeam === 1 ? "default" : "outline"}
                        data-testid="button-raid-3-team1"
                      >
                        +3
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{match.team2Name || "Team 2"}</p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => addRaidPoint(2, 1)}
                        variant={raidingTeam === 2 ? "default" : "outline"}
                        data-testid="button-raid-1-team2"
                      >
                        +1
                      </Button>
                      <Button 
                        onClick={() => addRaidPoint(2, 2)}
                        variant={raidingTeam === 2 ? "default" : "outline"}
                        data-testid="button-raid-2-team2"
                      >
                        +2
                      </Button>
                      <Button 
                        onClick={() => addRaidPoint(2, 3)}
                        variant={raidingTeam === 2 ? "default" : "outline"}
                        data-testid="button-raid-3-team2"
                      >
                        +3
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tackle Points */}
              <div>
                <h4 className="font-semibold mb-3">Tackle Points</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    onClick={() => addTacklePoint(1)}
                    className="w-full"
                    data-testid="button-tackle-team1"
                  >
                    Tackle for {match.team1Name || "Team 1"}
                  </Button>
                  <Button 
                    onClick={() => addTacklePoint(2)}
                    className="w-full"
                    data-testid="button-tackle-team2"
                  >
                    Tackle for {match.team2Name || "Team 2"}
                  </Button>
                </div>
              </div>

              {/* Bonus Points */}
              <div>
                <h4 className="font-semibold mb-3">Bonus Points</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline"
                    onClick={() => addBonusPoint(1)}
                    data-testid="button-bonus-team1"
                  >
                    Bonus for {match.team1Name || "Team 1"}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => addBonusPoint(2)}
                    data-testid="button-bonus-team2"
                  >
                    Bonus for {match.team2Name || "Team 2"}
                  </Button>
                </div>
              </div>

              {/* All Out */}
              <div>
                <h4 className="font-semibold mb-3">All Out (+2 Points)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="destructive"
                    onClick={() => addAllOut(1)}
                    data-testid="button-allout-team1"
                  >
                    All Out for {match.team1Name || "Team 1"}
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => addAllOut(2)}
                    data-testid="button-allout-team2"
                  >
                    All Out for {match.team2Name || "Team 2"}
                  </Button>
                </div>
              </div>

              {/* Raiding Team Control */}
              <div>
                <h4 className="font-semibold mb-3">Change Raiding Team</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline"
                    onClick={() => setRaidingTeam(1)}
                    data-testid="button-raid-team1"
                  >
                    {match.team1Name || "Team 1"} Raids
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setRaidingTeam(2)}
                    data-testid="button-raid-team2"
                  >
                    {match.team2Name || "Team 2"} Raids
                  </Button>
                </div>
              </div>

              {/* Half Control */}
              {currentHalf === 1 && (
                <div>
                  <Button 
                    onClick={switchHalf}
                    className="w-full"
                    data-testid="button-switch-half"
                  >
                    Start Second Half
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match Events */}
      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Match Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2" data-testid="match-events">
              {events.slice().reverse().slice(0, 10).map((event, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <span>{event.time}' - {event.event}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{event.team}</Badge>
                    <Badge variant="secondary">+{event.points}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
