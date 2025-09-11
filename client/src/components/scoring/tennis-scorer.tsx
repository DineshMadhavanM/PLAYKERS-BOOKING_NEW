import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TennisScorerProps {
  match: any;
  onScoreUpdate: (scoreData: any) => void;
  isLive: boolean;
}

export default function TennisScorer({ match, onScoreUpdate, isLive }: TennisScorerProps) {
  const [player1Sets, setPlayer1Sets] = useState(0);
  const [player2Sets, setPlayer2Sets] = useState(0);
  const [player1Games, setPlayer1Games] = useState(0);
  const [player2Games, setPlayer2Games] = useState(0);
  const [player1Points, setPlayer1Points] = useState(0);
  const [player2Points, setPlayer2Points] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [setHistory, setSetHistory] = useState<Array<{set: number, player1: number, player2: number}>>([]);
  const [isDeuce, setIsDeuce] = useState(false);
  const [advantage, setAdvantage] = useState<1 | 2 | null>(null);

  const pointsDisplay = ["0", "15", "30", "40"];

  const addPoint = (player: 1 | 2) => {
    if (!isLive) return;

    if (player === 1) {
      setPlayer1Points(prev => prev + 1);
    } else {
      setPlayer2Points(prev => prev + 1);
    }

    checkGameWin();
    updateScore();
  };

  const checkGameWin = () => {
    const p1Points = player === 1 ? player1Points + 1 : player1Points;
    const p2Points = player === 1 ? player2Points : player2Points + 1;

    // Check for deuce
    if (p1Points >= 3 && p2Points >= 3) {
      if (p1Points === p2Points) {
        setIsDeuce(true);
        setAdvantage(null);
        return;
      } else if (Math.abs(p1Points - p2Points) === 1) {
        setIsDeuce(false);
        setAdvantage(p1Points > p2Points ? 1 : 2);
        return;
      }
    }

    // Check for game win
    if ((p1Points >= 4 || p2Points >= 4) && Math.abs(p1Points - p2Points) >= 2) {
      const winner = p1Points > p2Points ? 1 : 2;
      winGame(winner);
    }
  };

  const winGame = (winner: 1 | 2) => {
    if (winner === 1) {
      setPlayer1Games(prev => prev + 1);
    } else {
      setPlayer2Games(prev => prev + 1);
    }

    setPlayer1Points(0);
    setPlayer2Points(0);
    setIsDeuce(false);
    setAdvantage(null);

    checkSetWin();
  };

  const checkSetWin = () => {
    const p1Games = winner === 1 ? player1Games + 1 : player1Games;
    const p2Games = winner === 1 ? player2Games : player2Games + 1;

    if ((p1Games >= 6 || p2Games >= 6) && Math.abs(p1Games - p2Games) >= 2) {
      const setWinner = p1Games > p2Games ? 1 : 2;
      winSet(setWinner);
    }
  };

  const winSet = (winner: 1 | 2) => {
    const newSetRecord = {
      set: currentSet,
      player1: winner === 1 ? player1Games + 1 : player1Games,
      player2: winner === 1 ? player2Games : player2Games + 1,
    };

    setSetHistory(prev => [...prev, newSetRecord]);

    if (winner === 1) {
      setPlayer1Sets(prev => prev + 1);
    } else {
      setPlayer2Sets(prev => prev + 1);
    }

    setPlayer1Games(0);
    setPlayer2Games(0);
    setCurrentSet(prev => prev + 1);

    checkMatchWin();
  };

  const checkMatchWin = () => {
    const p1Sets = winner === 1 ? player1Sets + 1 : player1Sets;
    const p2Sets = winner === 1 ? player2Sets : player2Sets + 1;

    // Best of 3 sets
    if (p1Sets >= 2 || p2Sets >= 2) {
      // Match completed
      updateScore();
    }
  };

  const getPointDisplay = (points: number, opponentPoints: number) => {
    if (points >= 3 && opponentPoints >= 3) {
      if (isDeuce) return "40";
      if (advantage === 1 && points > opponentPoints) return "Ad";
      if (advantage === 2 && opponentPoints > points) return "Ad";
      return "40";
    }
    return pointsDisplay[Math.min(points, 3)];
  };

  const updateScore = () => {
    const scoreData = {
      team1Score: {
        sets: player1Sets,
        games: player1Games,
        points: getPointDisplay(player1Points, player2Points),
      },
      team2Score: {
        sets: player2Sets,
        games: player2Games,
        points: getPointDisplay(player2Points, player1Points),
      },
      matchData: {
        currentSet,
        setHistory,
        isDeuce,
        advantage,
      },
    };
    onScoreUpdate(scoreData);
  };

  return (
    <div className="space-y-6" data-testid="tennis-scorer">
      {/* Current Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tennis Scorer</span>
            <Badge variant="outline" data-testid="text-current-set">
              Set {currentSet}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{match.team1Name || "Player 1"}</h3>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary" data-testid="text-player1-sets">
                  {player1Sets}
                </div>
                <div className="text-sm text-muted-foreground">Sets</div>
                <div className="text-2xl font-semibold" data-testid="text-player1-games">
                  {player1Games}
                </div>
                <div className="text-sm text-muted-foreground">Games</div>
                <div className="text-xl font-semibold" data-testid="text-player1-points">
                  {getPointDisplay(player1Points, player2Points)}
                </div>
                <div className="text-sm text-muted-foreground">Points</div>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{match.team2Name || "Player 2"}</h3>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary" data-testid="text-player2-sets">
                  {player2Sets}
                </div>
                <div className="text-sm text-muted-foreground">Sets</div>
                <div className="text-2xl font-semibold" data-testid="text-player2-games">
                  {player2Games}
                </div>
                <div className="text-sm text-muted-foreground">Games</div>
                <div className="text-xl font-semibold" data-testid="text-player2-points">
                  {getPointDisplay(player2Points, player1Points)}
                </div>
                <div className="text-sm text-muted-foreground">Points</div>
              </div>
            </div>
          </div>

          {/* Game Status */}
          {(isDeuce || advantage) && (
            <div className="text-center mt-4">
              <Badge variant="secondary" data-testid="badge-game-status">
                {isDeuce ? "Deuce" : `Advantage ${advantage === 1 ? match.team1Name || "Player 1" : match.team2Name || "Player 2"}`}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scoring Controls */}
      {isLive && (
        <Card>
          <CardHeader>
            <CardTitle>Scoring Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h4 className="font-semibold">Award Point</h4>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => addPoint(1)}
                  className="w-full"
                  data-testid="button-point-player1"
                >
                  Point for {match.team1Name || "Player 1"}
                </Button>
                <Button 
                  onClick={() => addPoint(2)}
                  className="w-full"
                  data-testid="button-point-player2"
                >
                  Point for {match.team2Name || "Player 2"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Set History */}
      {setHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Set History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2" data-testid="set-history">
              {setHistory.map((set, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <span>Set {set.set}</span>
                  <div className="flex gap-4">
                    <span>{match.team1Name || "Player 1"}: {set.player1}</span>
                    <span>{match.team2Name || "Player 2"}: {set.player2}</span>
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
