import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CricketScorerProps {
  match: any;
  onScoreUpdate: (scoreData: any) => void;
  isLive: boolean;
}

export default function CricketScorer({ match, onScoreUpdate, isLive }: CricketScorerProps) {
  const [currentInning, setCurrentInning] = useState(1);
  const [currentOver, setCurrentOver] = useState(0);
  const [currentBall, setCurrentBall] = useState(0);
  const [team1Runs, setTeam1Runs] = useState(0);
  const [team1Wickets, setTeam1Wickets] = useState(0);
  const [team2Runs, setTeam2Runs] = useState(0);
  const [team2Wickets, setTeam2Wickets] = useState(0);
  const [ballByBall, setBallByBall] = useState<string[]>([]);

  const addRuns = (runs: number) => {
    if (!isLive) return;

    if (currentInning === 1) {
      setTeam1Runs(prev => prev + runs);
    } else {
      setTeam2Runs(prev => prev + runs);
    }

    if (runs > 0) {
      nextBall();
    }

    setBallByBall(prev => [...prev, `${runs} run${runs !== 1 ? 's' : ''}`]);
    updateScore();
  };

  const addWicket = () => {
    if (!isLive) return;

    if (currentInning === 1) {
      setTeam1Wickets(prev => prev + 1);
    } else {
      setTeam2Wickets(prev => prev + 1);
    }

    nextBall();
    setBallByBall(prev => [...prev, "Wicket!"]);
    updateScore();
  };

  const addExtra = (type: 'wide' | 'no-ball' | 'bye' | 'leg-bye', runs: number = 1) => {
    if (!isLive) return;

    if (currentInning === 1) {
      setTeam1Runs(prev => prev + runs);
    } else {
      setTeam2Runs(prev => prev + runs);
    }

    if (type !== 'wide' && type !== 'no-ball') {
      nextBall();
    }

    setBallByBall(prev => [...prev, `${type.charAt(0).toUpperCase() + type.slice(1)} ${runs}`]);
    updateScore();
  };

  const nextBall = () => {
    setCurrentBall(prev => {
      if (prev === 5) {
        setCurrentOver(over => over + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const switchInnings = () => {
    if (!isLive) return;
    setCurrentInning(2);
    setCurrentOver(0);
    setCurrentBall(0);
    setBallByBall([]);
  };

  const updateScore = () => {
    const scoreData = {
      team1Score: {
        runs: team1Runs,
        wickets: team1Wickets,
        overs: currentInning === 1 ? `${currentOver}.${currentBall}` : `${currentOver}.0`,
      },
      team2Score: {
        runs: team2Runs,
        wickets: team2Wickets,
        overs: currentInning === 2 ? `${currentOver}.${currentBall}` : "0.0",
      },
      matchData: {
        currentInning,
        ballByBall,
        lastBall: ballByBall[ballByBall.length - 1],
      },
    };
    onScoreUpdate(scoreData);
  };

  return (
    <div className="space-y-6" data-testid="cricket-scorer">
      {/* Current Inning Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Cricket Scorer</span>
            <div className="flex gap-2">
              <Badge variant={currentInning === 1 ? "default" : "secondary"}>
                Inning {currentInning}
              </Badge>
              <Badge variant="outline" data-testid="text-current-over">
                Over {currentOver}.{currentBall}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{match.team1Name || "Team 1"}</h3>
              <div className="text-4xl font-bold text-primary" data-testid="text-team1-cricket-score">
                {team1Runs}/{team1Wickets}
              </div>
              {currentInning === 1 && (
                <p className="text-muted-foreground">
                  Overs: {currentOver}.{currentBall}
                </p>
              )}
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{match.team2Name || "Team 2"}</h3>
              <div className="text-4xl font-bold text-primary" data-testid="text-team2-cricket-score">
                {team2Runs}/{team2Wickets}
              </div>
              {currentInning === 2 && (
                <p className="text-muted-foreground">
                  Overs: {currentOver}.{currentBall}
                </p>
              )}
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
              {/* Runs */}
              <div>
                <h4 className="font-semibold mb-3">Runs</h4>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3, 4, 6].map((runs) => (
                    <Button 
                      key={runs} 
                      variant={runs === 4 || runs === 6 ? "default" : "outline"}
                      onClick={() => addRuns(runs)}
                      data-testid={`button-runs-${runs}`}
                    >
                      {runs}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Wicket */}
              <div>
                <h4 className="font-semibold mb-3">Wicket</h4>
                <Button 
                  variant="destructive" 
                  onClick={addWicket}
                  data-testid="button-wicket"
                >
                  Wicket
                </Button>
              </div>

              {/* Extras */}
              <div>
                <h4 className="font-semibold mb-3">Extras</h4>
                <div className="grid grid-cols-4 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => addExtra('wide')}
                    data-testid="button-wide"
                  >
                    Wide
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => addExtra('no-ball')}
                    data-testid="button-no-ball"
                  >
                    No Ball
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => addExtra('bye')}
                    data-testid="button-bye"
                  >
                    Bye
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => addExtra('leg-bye')}
                    data-testid="button-leg-bye"
                  >
                    Leg Bye
                  </Button>
                </div>
              </div>

              {/* Inning Control */}
              {currentInning === 1 && (
                <div>
                  <Button 
                    onClick={switchInnings}
                    className="w-full"
                    data-testid="button-switch-innings"
                  >
                    End Inning 1 / Start Inning 2
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ball by Ball */}
      {ballByBall.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ball by Ball</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2" data-testid="ball-by-ball">
              {ballByBall.slice(-12).map((ball, index) => (
                <Badge key={index} variant="outline">
                  {ball}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
