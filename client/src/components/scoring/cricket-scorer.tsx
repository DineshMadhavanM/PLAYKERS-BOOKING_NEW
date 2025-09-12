import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Match } from "@shared/schema";

interface CricketScorerProps {
  match: Match;
  onScoreUpdate: (scoreData: any) => void;
  isLive: boolean;
}

interface CricketScore {
  runs: number;
  wickets: number;
  overs: string;
  ballByBall?: string[];
}

export default function CricketScorer({ match, onScoreUpdate, isLive }: CricketScorerProps) {
  const { toast } = useToast();
  const [currentInning, setCurrentInning] = useState(1);
  const [currentOver, setCurrentOver] = useState(0);
  const [currentBall, setCurrentBall] = useState(0);
  const [team1Runs, setTeam1Runs] = useState(0);
  const [team1Wickets, setTeam1Wickets] = useState(0);
  const [team2Runs, setTeam2Runs] = useState(0);
  const [team2Wickets, setTeam2Wickets] = useState(0);
  const [ballByBall, setBallByBall] = useState<string[]>([]);
  const [showSixFlash, setShowSixFlash] = useState(false);
  const [showFourFlash, setShowFourFlash] = useState(false);
  const [showWicketFlash, setShowWicketFlash] = useState(false);

  // Flash effects
  const triggerFlashEffect = (type: 'six' | 'four' | 'wicket') => {
    switch (type) {
      case 'six':
        setShowSixFlash(true);
        setTimeout(() => setShowSixFlash(false), 1500);
        break;
      case 'four':
        setShowFourFlash(true);
        setTimeout(() => setShowFourFlash(false), 1500);
        break;
      case 'wicket':
        setShowWicketFlash(true);
        setTimeout(() => setShowWicketFlash(false), 1500);
        break;
    }
  };

  const addRuns = (runs: number) => {
    if (!isLive) return;

    if (currentInning === 1) {
      setTeam1Runs(prev => prev + runs);
    } else {
      setTeam2Runs(prev => prev + runs);
    }

    // Trigger flash effects for boundaries
    if (runs === 6) {
      triggerFlashEffect('six');
      toast({ title: "SIX!", description: "What a shot!", duration: 2000 });
    } else if (runs === 4) {
      triggerFlashEffect('four');
      toast({ title: "FOUR!", description: "Excellent boundary!", duration: 2000 });
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

    // Trigger wicket flash effect
    triggerFlashEffect('wicket');
    toast({ title: "WICKET!", description: "That's out!", variant: "destructive", duration: 3000 });

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
      {/* Flash Effects */}
      {showSixFlash && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="text-8xl font-bold text-yellow-500 animate-ping">
            SIX!
          </div>
        </div>
      )}
      {showFourFlash && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="text-8xl font-bold text-blue-500 animate-ping">
            FOUR!
          </div>
        </div>
      )}
      {showWicketFlash && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="text-8xl font-bold text-red-500 animate-ping">
            WICKET!
          </div>
        </div>
      )}

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
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl dark:from-blue-900/20 dark:to-blue-800/20">
              <h3 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-200">{match.team1Name || "Team 1"}</h3>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-team1-cricket-score">
                {team1Runs}/{team1Wickets}
              </div>
              {currentInning === 1 && (
                <div className="mt-2">
                  <Badge variant="default" className="bg-blue-600">
                    Overs: {currentOver}.{currentBall}
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground mb-2">VS</div>
                <Badge variant={currentInning === 1 ? "default" : "secondary"} className="text-sm">
                  Inning {currentInning}
                </Badge>
              </div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl dark:from-green-900/20 dark:to-green-800/20">
              <h3 className="text-lg font-semibold mb-2 text-green-800 dark:text-green-200">{match.team2Name || "Team 2"}</h3>
              <div className="text-4xl font-bold text-green-600 dark:text-green-400" data-testid="text-team2-cricket-score">
                {team2Runs}/{team2Wickets}
              </div>
              {currentInning === 2 && (
                <div className="mt-2">
                  <Badge variant="default" className="bg-green-600">
                    Overs: {currentOver}.{currentBall}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Scoring Controls */}
      {isLive && (
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/10 border-2 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              🏏 Advanced Cricket Scorer
              <Badge variant="outline" className="ml-auto">
                Ball: {currentOver}.{currentBall + 1}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                {/* Runs */}
                <div>
                  <h4 className="font-semibold mb-3 text-green-800 dark:text-green-200">🎯 Runs</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2, 3, 4, 6].map((runs) => (
                      <Button 
                        key={runs} 
                        variant={runs === 4 ? "default" : runs === 6 ? "default" : "outline"}
                        className={
                          runs === 6 
                            ? "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600" 
                            : runs === 4 
                            ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-600" 
                            : ""
                        }
                        onClick={() => addRuns(runs)}
                        data-testid={`button-runs-${runs}`}
                        size="lg"
                      >
                        {runs === 0 ? "●" : runs}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Wicket */}
                <div>
                  <h4 className="font-semibold mb-3 text-red-700 dark:text-red-300">🎯 Wicket</h4>
                  <Button 
                    variant="destructive" 
                    onClick={addWicket}
                    data-testid="button-wicket"
                    size="lg"
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    🎯 WICKET!
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Extras */}
                <div>
                  <h4 className="font-semibold mb-3 text-orange-700 dark:text-orange-300">⚡ Extras</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => addExtra('wide')}
                      data-testid="button-wide"
                      className="border-orange-300 hover:bg-orange-50"
                    >
                      Wide
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => addExtra('no-ball')}
                      data-testid="button-no-ball"
                      className="border-orange-300 hover:bg-orange-50"
                    >
                      No Ball
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => addExtra('bye')}
                      data-testid="button-bye"
                      className="border-orange-300 hover:bg-orange-50"
                    >
                      Bye
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => addExtra('leg-bye')}
                      data-testid="button-leg-bye"
                      className="border-orange-300 hover:bg-orange-50"
                    >
                      Leg Bye
                    </Button>
                  </div>
                </div>

                {/* Inning Control */}
                {currentInning === 1 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-purple-700 dark:text-purple-300">🏆 Innings</h4>
                    <Button 
                      onClick={switchInnings}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      data-testid="button-switch-innings"
                      size="lg"
                    >
                      🏆 End Inning 1 / Start Inning 2
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Ball by Ball Display */}
      {ballByBall.length > 0 && (
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/10 dark:to-slate-800/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Ball by Ball Commentary
              <Badge variant="outline" className="ml-auto">
                Last {Math.min(ballByBall.length, 12)} Balls
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2" data-testid="ball-by-ball">
              {ballByBall.slice(-12).map((ball, index) => {
                const isWicket = ball.toLowerCase().includes('wicket');
                const isSix = ball.includes('6 run');
                const isFour = ball.includes('4 run');
                
                return (
                  <Badge 
                    key={index} 
                    variant={isWicket ? "destructive" : "outline"}
                    className={
                      isWicket 
                        ? "bg-red-600 text-white animate-pulse" 
                        : isSix 
                        ? "bg-yellow-500 text-white font-bold"
                        : isFour 
                        ? "bg-blue-500 text-white font-bold"
                        : "bg-slate-200 dark:bg-slate-700"
                    }
                  >
                    {ball}
                  </Badge>
                );
              })}
            </div>
            {ballByBall.length > 12 && (
              <p className="text-sm text-muted-foreground mt-3">
                Showing last 12 balls of {ballByBall.length} total balls played
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
