import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VolleyballScorerProps {
  match: any;
  onScoreUpdate: (scoreData: any) => void;
  isLive: boolean;
}

export default function VolleyballScorer({ match, onScoreUpdate, isLive }: VolleyballScorerProps) {
  const [team1Sets, setTeam1Sets] = useState(0);
  const [team2Sets, setTeam2Sets] = useState(0);
  const [team1Points, setTeam1Points] = useState(0);
  const [team2Points, setTeam2Points] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [servingTeam, setServingTeam] = useState<1 | 2>(1);
  const [setHistory, setSetHistory] = useState<Array<{set: number, team1: number, team2: number}>>([]);
  const [rallies, setRallies] = useState<Array<{set: number, point: string, team: string}>>([]);

  const addPoint = (team: 1 | 2) => {
    if (!isLive) return;

    if (team === 1) {
      setTeam1Points(prev => prev + 1);
    } else {
      setTeam2Points(prev => prev + 1);
    }

    // Change serving team
    setServingTeam(team);

    // Add to rally history
    const rally = {
      set: currentSet,
      point: `Point ${(team === 1 ? team1Points : team2Points) + 1}`,
      team: team === 1 ? match.team1Name || "Team 1" : match.team2Name || "Team 2",
    };
    setRallies(prev => [...prev, rally]);

    checkSetWin(team);
    updateScore();
  };

  const checkSetWin = (team: 1 | 2) => {
    const t1Points = team === 1 ? team1Points + 1 : team1Points;
    const t2Points = team === 1 ? team2Points : team2Points + 1;

    // Standard volleyball scoring: first to 25 points, must win by 2
    const isSetWin = (t1Points >= 25 || t2Points >= 25) && Math.abs(t1Points - t2Points) >= 2;
    
    // Fifth set (if applicable): first to 15 points, must win by 2
    const isFinalSetWin = currentSet === 5 && (t1Points >= 15 || t2Points >= 15) && Math.abs(t1Points - t2Points) >= 2;

    if (isSetWin || isFinalSetWin) {
      const winner = t1Points > t2Points ? 1 : 2;
      winSet(winner);
    }
  };

  const winSet = (winner: 1 | 2) => {
    const newSetRecord = {
      set: currentSet,
      team1: winner === 1 ? team1Points + 1 : team1Points,
      team2: winner === 1 ? team2Points : team2Points + 1,
    };

    setSetHistory(prev => [...prev, newSetRecord]);

    if (winner === 1) {
      setTeam1Sets(prev => prev + 1);
    } else {
      setTeam2Sets(prev => prev + 1);
    }

    setTeam1Points(0);
    setTeam2Points(0);
    setCurrentSet(prev => prev + 1);
    setServingTeam(1); // Reset serving

    checkMatchWin(winner);
  };

  const checkMatchWin = (winner: 1 | 2) => {
    const t1Sets = winner === 1 ? team1Sets + 1 : team1Sets;
    const t2Sets = winner === 1 ? team2Sets : team2Sets + 1;

    // Best of 5 sets - first to win 3 sets
    if (t1Sets >= 3 || t2Sets >= 3) {
      // Match completed
      updateScore();
    }
  };

  const updateScore = () => {
    const scoreData = {
      team1Score: {
        sets: team1Sets,
        points: team1Points,
        serving: servingTeam === 1,
      },
      team2Score: {
        sets: team2Sets,
        points: team2Points,
        serving: servingTeam === 2,
      },
      matchData: {
        currentSet,
        setHistory,
        rallies,
        servingTeam,
      },
    };
    onScoreUpdate(scoreData);
  };

  return (
    <div className="space-y-6" data-testid="volleyball-scorer">
      {/* Current Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Volleyball Scorer</span>
            <Badge variant="outline" data-testid="text-current-set">
              Set {currentSet}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                {match.team1Name || "Team 1"}
                {servingTeam === 1 && <Badge variant="secondary">Serving</Badge>}
              </h3>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary" data-testid="text-team1-sets">
                  {team1Sets}
                </div>
                <div className="text-sm text-muted-foreground">Sets</div>
                <div className="text-2xl font-semibold" data-testid="text-team1-points">
                  {team1Points}
                </div>
                <div className="text-sm text-muted-foreground">Points</div>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                {match.team2Name || "Team 2"}
                {servingTeam === 2 && <Badge variant="secondary">Serving</Badge>}
              </h3>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary" data-testid="text-team2-sets">
                  {team2Sets}
                </div>
                <div className="text-sm text-muted-foreground">Sets</div>
                <div className="text-2xl font-semibold" data-testid="text-team2-points">
                  {team2Points}
                </div>
                <div className="text-sm text-muted-foreground">Points</div>
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
            <div className="space-y-4">
              <h4 className="font-semibold">Award Point</h4>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => addPoint(1)}
                  className="w-full"
                  variant={servingTeam === 1 ? "default" : "outline"}
                  data-testid="button-point-team1"
                >
                  Point for {match.team1Name || "Team 1"}
                  {servingTeam === 1 && " (Serving)"}
                </Button>
                <Button 
                  onClick={() => addPoint(2)}
                  className="w-full"
                  variant={servingTeam === 2 ? "default" : "outline"}
                  data-testid="button-point-team2"
                >
                  Point for {match.team2Name || "Team 2"}
                  {servingTeam === 2 && " (Serving)"}
                </Button>
              </div>

              <div className="text-center">
                <h4 className="font-semibold mb-2">Change Serving Team</h4>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setServingTeam(1)}
                    data-testid="button-serve-team1"
                  >
                    {match.team1Name || "Team 1"} Serves
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setServingTeam(2)}
                    data-testid="button-serve-team2"
                  >
                    {match.team2Name || "Team 2"} Serves
                  </Button>
                </div>
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
                    <span>{match.team1Name || "Team 1"}: {set.team1}</span>
                    <span>{match.team2Name || "Team 2"}: {set.team2}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Rallies */}
      {rallies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Rallies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2" data-testid="recent-rallies">
              {rallies.slice(-10).reverse().map((rally, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <span>Set {rally.set} - {rally.point}</span>
                  <Badge variant="outline">{rally.team}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
