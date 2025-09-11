import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FootballScorerProps {
  match: any;
  onScoreUpdate: (scoreData: any) => void;
  isLive: boolean;
}

export default function FootballScorer({ match, onScoreUpdate, isLive }: FootballScorerProps) {
  const [team1Goals, setTeam1Goals] = useState(0);
  const [team2Goals, setTeam2Goals] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [team1YellowCards, setTeam1YellowCards] = useState(0);
  const [team1RedCards, setTeam1RedCards] = useState(0);
  const [team2YellowCards, setTeam2YellowCards] = useState(0);
  const [team2RedCards, setTeam2RedCards] = useState(0);
  const [events, setEvents] = useState<Array<{time: number, event: string, team: string}>>([]);
  const [playerName, setPlayerName] = useState("");

  const addGoal = (team: 1 | 2) => {
    if (!isLive) return;

    if (team === 1) {
      setTeam1Goals(prev => prev + 1);
    } else {
      setTeam2Goals(prev => prev + 1);
    }

    const event = {
      time: currentTime,
      event: `Goal${playerName ? ` by ${playerName}` : ''}`,
      team: team === 1 ? match.team1Name || "Team 1" : match.team2Name || "Team 2",
    };

    setEvents(prev => [...prev, event]);
    setPlayerName("");
    updateScore();
  };

  const addCard = (team: 1 | 2, cardType: 'yellow' | 'red') => {
    if (!isLive) return;

    if (team === 1) {
      if (cardType === 'yellow') {
        setTeam1YellowCards(prev => prev + 1);
      } else {
        setTeam1RedCards(prev => prev + 1);
      }
    } else {
      if (cardType === 'yellow') {
        setTeam2YellowCards(prev => prev + 1);
      } else {
        setTeam2RedCards(prev => prev + 1);
      }
    }

    const event = {
      time: currentTime,
      event: `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} Card${playerName ? ` to ${playerName}` : ''}`,
      team: team === 1 ? match.team1Name || "Team 1" : match.team2Name || "Team 2",
    };

    setEvents(prev => [...prev, event]);
    setPlayerName("");
    updateScore();
  };

  const updateScore = () => {
    const scoreData = {
      team1Score: {
        goals: team1Goals,
        yellowCards: team1YellowCards,
        redCards: team1RedCards,
      },
      team2Score: {
        goals: team2Goals,
        yellowCards: team2YellowCards,
        redCards: team2RedCards,
      },
      matchData: {
        currentTime,
        events,
        lastEvent: events[events.length - 1],
      },
    };
    onScoreUpdate(scoreData);
  };

  return (
    <div className="space-y-6" data-testid="football-scorer">
      {/* Current Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Football Scorer</span>
            <Badge variant="outline" data-testid="text-current-time">
              {currentTime}'
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{match.team1Name || "Team 1"}</h3>
              <div className="text-4xl font-bold text-primary" data-testid="text-team1-football-score">
                {team1Goals}
              </div>
              <div className="flex justify-center gap-2 mt-2">
                <Badge variant="secondary">
                  🟨 {team1YellowCards}
                </Badge>
                <Badge variant="destructive">
                  🟥 {team1RedCards}
                </Badge>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{match.team2Name || "Team 2"}</h3>
              <div className="text-4xl font-bold text-primary" data-testid="text-team2-football-score">
                {team2Goals}
              </div>
              <div className="flex justify-center gap-2 mt-2">
                <Badge variant="secondary">
                  🟨 {team2YellowCards}
                </Badge>
                <Badge variant="destructive">
                  🟥 {team2RedCards}
                </Badge>
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
              {/* Time Update */}
              <div>
                <Label htmlFor="current-time">Current Time (minutes)</Label>
                <Input
                  id="current-time"
                  type="number"
                  value={currentTime}
                  onChange={(e) => setCurrentTime(parseInt(e.target.value) || 0)}
                  className="w-32"
                  data-testid="input-current-time"
                />
              </div>

              {/* Player Name */}
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

              {/* Goals */}
              <div>
                <h4 className="font-semibold mb-3">Goals</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    onClick={() => addGoal(1)}
                    className="w-full"
                    data-testid="button-goal-team1"
                  >
                    Goal for {match.team1Name || "Team 1"}
                  </Button>
                  <Button 
                    onClick={() => addGoal(2)}
                    className="w-full"
                    data-testid="button-goal-team2"
                  >
                    Goal for {match.team2Name || "Team 2"}
                  </Button>
                </div>
              </div>

              {/* Cards */}
              <div>
                <h4 className="font-semibold mb-3">Cards</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{match.team1Name || "Team 1"}</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => addCard(1, 'yellow')}
                        data-testid="button-yellow-card-team1"
                      >
                        🟨 Yellow
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => addCard(1, 'red')}
                        data-testid="button-red-card-team1"
                      >
                        🟥 Red
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{match.team2Name || "Team 2"}</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => addCard(2, 'yellow')}
                        data-testid="button-yellow-card-team2"
                      >
                        🟨 Yellow
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => addCard(2, 'red')}
                        data-testid="button-red-card-team2"
                      >
                        🟥 Red
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
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
              {events.slice().reverse().map((event, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <span>{event.time}' - {event.event}</span>
                  <Badge variant="outline">{event.team}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
