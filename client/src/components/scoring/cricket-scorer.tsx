import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

interface PlayerBattingStats {
  name: string;
  runs: number;
  balls: number;
  dots: number;
  fours: number;
  sixes: number;
  strikeRate: number;
}

interface PlayerBowlingStats {
  name: string;
  wickets: number;
  overs: number;
  balls: number;
  runsConceded: number;
  economyRate: number;
  bowlingAverage: number;
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
  const [showExtrasDialog, setShowExtrasDialog] = useState(false);
  const [selectedExtraType, setSelectedExtraType] = useState<'wide' | 'no-ball' | 'bye' | 'leg-bye' | null>(null);
  const [showWicketDialog, setShowWicketDialog] = useState(false);
  const [selectedWicketType, setSelectedWicketType] = useState<'bowled' | 'caught' | 'run-out' | 'hit-wicket' | 'stump-out' | null>(null);
  const [fielderName, setFielderName] = useState('');
  const [nextBatsman, setNextBatsman] = useState('');
  
  // Live scorecard state
  const [currentStriker, setCurrentStriker] = useState('');
  const [currentBowler, setCurrentBowler] = useState('');
  const [battingStats, setBattingStats] = useState<PlayerBattingStats[]>([]);
  const [bowlingStats, setBowlingStats] = useState<PlayerBowlingStats[]>([]);

  // Initialize current players from match data when match goes live
  useEffect(() => {
    if (isLive && match?.matchData?.currentPlayers) {
      const { striker, bowler } = match.matchData.currentPlayers;
      if (striker && !currentStriker) setCurrentStriker(striker);
      if (bowler && !currentBowler) setCurrentBowler(bowler);
    }
  }, [isLive, match?.matchData?.currentPlayers, currentStriker, currentBowler]);

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

  // Update player statistics
  const updateBattingStats = (playerName: string, runs: number) => {
    setBattingStats(prev => {
      const existingPlayerIndex = prev.findIndex(p => p.name === playerName);
      if (existingPlayerIndex >= 0) {
        const updated = [...prev];
        const player = updated[existingPlayerIndex];
        player.runs += runs;
        player.balls += 1;
        if (runs === 0) player.dots += 1;
        if (runs === 4) player.fours += 1;
        if (runs === 6) player.sixes += 1;
        player.strikeRate = player.balls > 0 ? (player.runs / player.balls) * 100 : 0;
        return updated;
      } else {
        const newPlayer: PlayerBattingStats = {
          name: playerName,
          runs,
          balls: 1,
          dots: runs === 0 ? 1 : 0,
          fours: runs === 4 ? 1 : 0,
          sixes: runs === 6 ? 1 : 0,
          strikeRate: runs * 100
        };
        return [...prev, newPlayer];
      }
    });
  };

  const updateBowlingStats = (playerName: string, runs: number, isWicket: boolean = false) => {
    setBowlingStats(prev => {
      const existingPlayerIndex = prev.findIndex(p => p.name === playerName);
      if (existingPlayerIndex >= 0) {
        const updated = [...prev];
        const player = updated[existingPlayerIndex];
        player.runsConceded += runs;
        player.balls += 1;
        if (isWicket) player.wickets += 1;
        player.overs = Math.floor(player.balls / 6) + (player.balls % 6) * 0.1;
        player.economyRate = player.overs > 0 ? player.runsConceded / player.overs : 0;
        player.bowlingAverage = player.wickets > 0 ? player.runsConceded / player.wickets : 0;
        return updated;
      } else {
        const newPlayer: PlayerBowlingStats = {
          name: playerName,
          wickets: isWicket ? 1 : 0,
          overs: 0.1,
          balls: 1,
          runsConceded: runs,
          economyRate: runs * 10,
          bowlingAverage: isWicket ? runs : 0
        };
        return [...prev, newPlayer];
      }
    });
  };

  const addRuns = (runs: number) => {
    if (!isLive) return;

    if (currentInning === 1) {
      setTeam1Runs(prev => prev + runs);
    } else {
      setTeam2Runs(prev => prev + runs);
    }

    // Update player stats
    if (currentStriker) updateBattingStats(currentStriker, runs);
    if (currentBowler) updateBowlingStats(currentBowler, runs);

    // Trigger flash effects for boundaries
    if (runs === 6) {
      triggerFlashEffect('six');
      toast({ title: "SIX!", description: "What a shot!", duration: 2000 });
    } else if (runs === 4) {
      triggerFlashEffect('four');
      toast({ title: "FOUR!", description: "Excellent boundary!", duration: 2000 });
    }

    // All legal deliveries (including dot balls) advance to next ball
    nextBall();

    setBallByBall(prev => [...prev, `${runs} run${runs !== 1 ? 's' : ''}`]);
    updateScore();
  };

  const openWicketDialog = () => {
    if (!isLive) return;
    setSelectedWicketType(null);
    setFielderName('');
    setNextBatsman('');
    setShowWicketDialog(true);
  };

  const addWicket = (wicketType: 'bowled' | 'caught' | 'run-out' | 'hit-wicket' | 'stump-out', fielder?: string, nextBatsmanName?: string) => {
    if (!isLive) return;

    if (currentInning === 1) {
      setTeam1Wickets(prev => prev + 1);
    } else {
      setTeam2Wickets(prev => prev + 1);
    }

    // Update bowling stats for wicket
    if (currentBowler) updateBowlingStats(currentBowler, 0, true);

    // Update striker to next batsman if provided
    if (nextBatsmanName) {
      setCurrentStriker(nextBatsmanName);
    }

    // Trigger wicket flash effect
    triggerFlashEffect('wicket');
    toast({ title: "WICKET!", description: `${wicketType.replace('-', ' ').toUpperCase()}!`, variant: "destructive", duration: 3000 });

    nextBall();
    
    // Enhanced wicket description
    let wicketDescription = '';
    switch (wicketType) {
      case 'bowled':
        wicketDescription = 'Bowled!';
        break;
      case 'caught':
        wicketDescription = fielder ? `Caught by ${fielder}` : 'Caught!';
        break;
      case 'run-out':
        wicketDescription = fielder ? `Run out by ${fielder}` : 'Run out!';
        break;
      case 'hit-wicket':
        wicketDescription = 'Hit wicket!';
        break;
      case 'stump-out':
        wicketDescription = 'Stumped!';
        break;
    }

    if (nextBatsmanName) {
      wicketDescription += ` | ${nextBatsmanName} in`;
    }

    setBallByBall(prev => [...prev, wicketDescription]);
    setShowWicketDialog(false);
    updateScore();
  };

  const openExtrasDialog = (type: 'wide' | 'no-ball' | 'bye' | 'leg-bye') => {
    if (!isLive) return;
    setSelectedExtraType(type);
    setShowExtrasDialog(true);
  };

  const addExtra = (type: 'wide' | 'no-ball' | 'bye' | 'leg-bye', runs: number = 1) => {
    if (!isLive) return;

    if (currentInning === 1) {
      setTeam1Runs(prev => prev + runs);
    } else {
      setTeam2Runs(prev => prev + runs);
    }

    // Update bowling stats for extras
    if (currentBowler) updateBowlingStats(currentBowler, runs);

    // For byes and leg-byes, update batting stats (as batsman faced a ball)
    if ((type === 'bye' || type === 'leg-bye') && currentStriker) {
      updateBattingStats(currentStriker, 0); // No runs to batsman for byes/leg-byes
    }

    if (type !== 'wide' && type !== 'no-ball') {
      nextBall();
    }

    // Enhanced ball by ball description
    let description = '';
    if (type === 'wide') {
      description = runs === 1 ? 'Wide +0' : `Wide +${runs - 1}`;
    } else if (type === 'no-ball') {
      description = runs === 1 ? 'No Ball +0' : `No Ball +${runs - 1}`;
    } else if (type === 'bye') {
      description = `Byes ${runs}`;
    } else if (type === 'leg-bye') {
      description = `Leg Byes ${runs}`;
    }

    setBallByBall(prev => [...prev, description]);
    setShowExtrasDialog(false);
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

      {/* Live Scorecard Section */}
      {isLive && (battingStats.length > 0 || bowlingStats.length > 0) && (
        <div className="space-y-6">
          {/* Current Score Banner */}
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                  {currentInning === 1 ? (match.team1Name || "Team 1") : (match.team2Name || "Team 2")}: {" "}
                  <span className="text-purple-600 dark:text-purple-400">
                    {currentInning === 1 ? `${team1Runs}/${team1Wickets}` : `${team2Runs}/${team2Wickets}`}
                  </span>
                  {" "} in {currentOver}.{currentBall} overs
                </h2>
                {currentStriker && currentBowler && (
                  <div className="mt-2 flex justify-center gap-4 text-sm text-purple-700 dark:text-purple-300">
                    <span>Striker: <strong>{currentStriker}</strong></span>
                    <span>Bowler: <strong>{currentBowler}</strong></span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Batting Statistics Table */}
          {battingStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  🏏 Batting Statistics - {currentInning === 1 ? (match.team1Name || "Team 1") : (match.team2Name || "Team 2")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Player Name</TableHead>
                      <TableHead className="text-center font-semibold">Runs</TableHead>
                      <TableHead className="text-center font-semibold">Balls</TableHead>
                      <TableHead className="text-center font-semibold">Dots</TableHead>
                      <TableHead className="text-center font-semibold">4s</TableHead>
                      <TableHead className="text-center font-semibold">6s</TableHead>
                      <TableHead className="text-center font-semibold">Strike Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {battingStats.map((player, index) => (
                      <TableRow 
                        key={index} 
                        className={currentStriker === player.name ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                        data-testid={`batting-row-${player.name.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <TableCell className="font-medium">
                          {player.name}
                          {currentStriker === player.name && (
                            <Badge variant="default" className="ml-2 text-xs bg-blue-600">
                              Striker
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-green-600">{player.runs}</TableCell>
                        <TableCell className="text-center">{player.balls}</TableCell>
                        <TableCell className="text-center text-gray-600">{player.dots}</TableCell>
                        <TableCell className="text-center text-blue-600 font-semibold">{player.fours}</TableCell>
                        <TableCell className="text-center text-yellow-600 font-semibold">{player.sixes}</TableCell>
                        <TableCell className="text-center font-medium">
                          {player.strikeRate.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Bowling Statistics Table */}
          {bowlingStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                  ⚡ Bowling Statistics - {currentInning === 1 ? (match.team2Name || "Team 2") : (match.team1Name || "Team 1")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Player Name</TableHead>
                      <TableHead className="text-center font-semibold">Wickets</TableHead>
                      <TableHead className="text-center font-semibold">Overs</TableHead>
                      <TableHead className="text-center font-semibold">Runs Conceded</TableHead>
                      <TableHead className="text-center font-semibold">Economy Rate</TableHead>
                      <TableHead className="text-center font-semibold">Bowling Average</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bowlingStats.map((player, index) => (
                      <TableRow 
                        key={index}
                        className={currentBowler === player.name ? "bg-orange-50 dark:bg-orange-900/20" : ""}
                        data-testid={`bowling-row-${player.name.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <TableCell className="font-medium">
                          {player.name}
                          {currentBowler === player.name && (
                            <Badge variant="default" className="ml-2 text-xs bg-orange-600">
                              Bowling
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-red-600">{player.wickets}</TableCell>
                        <TableCell className="text-center">{player.overs.toFixed(1)}</TableCell>
                        <TableCell className="text-center">{player.runsConceded}</TableCell>
                        <TableCell className="text-center font-medium">
                          {player.economyRate.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {player.bowlingAverage > 0 ? player.bowlingAverage.toFixed(2) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
                    onClick={openWicketDialog}
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
                      onClick={() => openExtrasDialog('wide')}
                      data-testid="button-wide"
                      className="border-orange-300 hover:bg-orange-50"
                    >
                      Wide
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => openExtrasDialog('no-ball')}
                      data-testid="button-no-ball"
                      className="border-orange-300 hover:bg-orange-50"
                    >
                      No Ball
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => openExtrasDialog('bye')}
                      data-testid="button-bye"
                      className="border-orange-300 hover:bg-orange-50"
                    >
                      Bye
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => openExtrasDialog('leg-bye')}
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

      {/* Enhanced Extras Dialog */}
      <Dialog open={showExtrasDialog} onOpenChange={setShowExtrasDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              ⚡ {selectedExtraType ? selectedExtraType.charAt(0).toUpperCase() + selectedExtraType.slice(1).replace('-', ' ') : 'Extra'} Options
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedExtraType === 'wide' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Select wide delivery with additional runs:</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => addExtra('wide', 1)} 
                    variant="outline"
                    data-testid="button-wide-0"
                    className="bg-orange-50 hover:bg-orange-100"
                  >
                    Wide +0 (1 run)
                  </Button>
                  <Button 
                    onClick={() => addExtra('wide', 2)} 
                    variant="outline"
                    data-testid="button-wide-1"
                    className="bg-orange-50 hover:bg-orange-100"
                  >
                    Wide +1 (2 runs)
                  </Button>
                  <Button 
                    onClick={() => addExtra('wide', 3)} 
                    variant="outline"
                    data-testid="button-wide-2"
                    className="bg-orange-50 hover:bg-orange-100"
                  >
                    Wide +2 (3 runs)
                  </Button>
                  <Button 
                    onClick={() => addExtra('wide', 4)} 
                    variant="outline"
                    data-testid="button-wide-3"
                    className="bg-orange-50 hover:bg-orange-100"
                  >
                    Wide +3 (4 runs)
                  </Button>
                  <Button 
                    onClick={() => addExtra('wide', 5)} 
                    variant="outline"
                    data-testid="button-wide-4"
                    className="bg-orange-50 hover:bg-orange-100"
                  >
                    Wide +4 (5 runs)
                  </Button>
                </div>
              </div>
            )}

            {selectedExtraType === 'no-ball' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Select no ball delivery with additional runs:</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => addExtra('no-ball', 1)} 
                    variant="outline"
                    data-testid="button-no-ball-0"
                    className="bg-red-50 hover:bg-red-100"
                  >
                    No Ball +0 (1 run)
                  </Button>
                  <Button 
                    onClick={() => addExtra('no-ball', 2)} 
                    variant="outline"
                    data-testid="button-no-ball-1"
                    className="bg-red-50 hover:bg-red-100"
                  >
                    No Ball +1 (2 runs)
                  </Button>
                  <Button 
                    onClick={() => addExtra('no-ball', 3)} 
                    variant="outline"
                    data-testid="button-no-ball-2"
                    className="bg-red-50 hover:bg-red-100"
                  >
                    No Ball +2 (3 runs)
                  </Button>
                  <Button 
                    onClick={() => addExtra('no-ball', 4)} 
                    variant="outline"
                    data-testid="button-no-ball-3"
                    className="bg-red-50 hover:bg-red-100"
                  >
                    No Ball +3 (4 runs)
                  </Button>
                  <Button 
                    onClick={() => addExtra('no-ball', 5)} 
                    variant="outline"
                    data-testid="button-no-ball-4"
                    className="bg-red-50 hover:bg-red-100"
                  >
                    No Ball +4 (5 runs)
                  </Button>
                  <Button 
                    onClick={() => addExtra('no-ball', 7)} 
                    variant="outline"
                    data-testid="button-no-ball-6"
                    className="bg-red-50 hover:bg-red-100"
                  >
                    No Ball +6 (7 runs)
                  </Button>
                </div>
              </div>
            )}

            {selectedExtraType === 'bye' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Select bye runs (ball pitched but batsman missed):</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => addExtra('bye', 1)} 
                    variant="outline"
                    data-testid="button-bye-1"
                    className="bg-blue-50 hover:bg-blue-100"
                  >
                    Byes 1 (1 run)
                  </Button>
                  <Button 
                    onClick={() => addExtra('bye', 2)} 
                    variant="outline"
                    data-testid="button-bye-2"
                    className="bg-blue-50 hover:bg-blue-100"
                  >
                    Byes 2 (2 runs)
                  </Button>
                  <Button 
                    onClick={() => addExtra('bye', 3)} 
                    variant="outline"
                    data-testid="button-bye-3"
                    className="bg-blue-50 hover:bg-blue-100"
                  >
                    Byes 3 (3 runs)
                  </Button>
                  <Button 
                    onClick={() => addExtra('bye', 4)} 
                    variant="outline"
                    data-testid="button-bye-4"
                    className="bg-blue-50 hover:bg-blue-100"
                  >
                    Byes 4 (4 runs)
                  </Button>
                </div>
              </div>
            )}

            {selectedExtraType === 'leg-bye' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Select leg bye runs (ball hit batsman's body/leg):</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => addExtra('leg-bye', 1)} 
                    variant="outline"
                    data-testid="button-leg-bye-1"
                    className="bg-green-50 hover:bg-green-100"
                  >
                    Leg Byes 1 (1 run)
                  </Button>
                  <Button 
                    onClick={() => addExtra('leg-bye', 2)} 
                    variant="outline"
                    data-testid="button-leg-bye-2"
                    className="bg-green-50 hover:bg-green-100"
                  >
                    Leg Byes 2 (2 runs)
                  </Button>
                  <Button 
                    onClick={() => addExtra('leg-bye', 3)} 
                    variant="outline"
                    data-testid="button-leg-bye-3"
                    className="bg-green-50 hover:bg-green-100"
                  >
                    Leg Byes 3 (3 runs)
                  </Button>
                  <Button 
                    onClick={() => addExtra('leg-bye', 4)} 
                    variant="outline"
                    data-testid="button-leg-bye-4"
                    className="bg-green-50 hover:bg-green-100"
                  >
                    Leg Byes 4 (4 runs)
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowExtrasDialog(false)}
                className="flex-1"
                data-testid="button-cancel-extras"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Wicket Dialog */}
      <Dialog open={showWicketDialog} onOpenChange={setShowWicketDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎯 Wicket Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Wicket Type Selection */}
            <div className="space-y-3">
              <Label className="font-medium">Select wicket type:</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => setSelectedWicketType('bowled')} 
                  variant={selectedWicketType === 'bowled' ? 'default' : 'outline'}
                  data-testid="button-bowled"
                  className="bg-red-50 hover:bg-red-100"
                >
                  Bowled
                </Button>
                <Button 
                  onClick={() => setSelectedWicketType('caught')} 
                  variant={selectedWicketType === 'caught' ? 'default' : 'outline'}
                  data-testid="button-caught"
                  className="bg-red-50 hover:bg-red-100"
                >
                  Caught
                </Button>
                <Button 
                  onClick={() => setSelectedWicketType('run-out')} 
                  variant={selectedWicketType === 'run-out' ? 'default' : 'outline'}
                  data-testid="button-run-out"
                  className="bg-red-50 hover:bg-red-100"
                >
                  Run Out
                </Button>
                <Button 
                  onClick={() => setSelectedWicketType('hit-wicket')} 
                  variant={selectedWicketType === 'hit-wicket' ? 'default' : 'outline'}
                  data-testid="button-hit-wicket"
                  className="bg-red-50 hover:bg-red-100"
                >
                  Hit Wicket
                </Button>
                <Button 
                  onClick={() => setSelectedWicketType('stump-out')} 
                  variant={selectedWicketType === 'stump-out' ? 'default' : 'outline'}
                  data-testid="button-stump-out"
                  className="bg-red-50 hover:bg-red-100 col-span-2"
                >
                  Stump Out
                </Button>
              </div>
            </div>

            {/* Fielder Name Input (for caught and run-out) */}
            {(selectedWicketType === 'caught' || selectedWicketType === 'run-out') && (
              <div className="space-y-2">
                <Label htmlFor="fielder-name" className="font-medium">
                  Fielder Name:
                </Label>
                <Input
                  id="fielder-name"
                  value={fielderName}
                  onChange={(e) => setFielderName(e.target.value)}
                  placeholder="Enter fielder's name"
                  data-testid="input-fielder-name"
                  className="w-full"
                />
              </div>
            )}

            {/* Next Batsman Input */}
            {selectedWicketType && (
              <div className="space-y-2">
                <Label htmlFor="next-batsman" className="font-medium">
                  Next Batsman:
                </Label>
                <Input
                  id="next-batsman"
                  value={nextBatsman}
                  onChange={(e) => setNextBatsman(e.target.value)}
                  placeholder="Enter next batsman's name"
                  data-testid="input-next-batsman"
                  className="w-full"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowWicketDialog(false)}
                className="flex-1"
                data-testid="button-cancel-wicket"
              >
                Cancel
              </Button>
              {selectedWicketType && (
                <Button 
                  onClick={() => addWicket(
                    selectedWicketType, 
                    fielderName || undefined, 
                    nextBatsman || undefined
                  )}
                  variant="destructive"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  data-testid="button-confirm-wicket"
                >
                  Confirm Wicket
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
