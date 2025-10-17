import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Match } from "@shared/schema";

interface CricketScorerProps {
  match: Match;
  onScoreUpdate: (scoreData: any) => void;
  isLive: boolean;
  rosterPlayers?: any[];
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
  isDismissed: boolean;
  dismissalType?: string;
}

interface PlayerBowlingStats {
  name: string;
  wickets: number;
  overs: number;
  balls: number;
  runsConceded: number;
  economyRate: number;
  bowlingAverage: number;
  maidenOvers: number;
  oversBowled: string; // "5.3" format
}

export default function CricketScorer({ match, onScoreUpdate, isLive, rosterPlayers = [] }: CricketScorerProps) {
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
  const [selectedWicketType, setSelectedWicketType] = useState<'bowled' | 'caught' | 'run-out' | 'hit-wicket' | 'stump-out' | 'wide-wicket' | 'no-ball-wicket' | 'leg-bye-wicket' | 'bye-wicket' | null>(null);
  const [fielderName, setFielderName] = useState('');
  const [nextBatsman, setNextBatsman] = useState('');
  const [dismissedBatter, setDismissedBatter] = useState<'striker' | 'non-striker'>('striker');
  const [extraRuns, setExtraRuns] = useState(0);
  
  // Live scorecard state
  const [currentStriker, setCurrentStriker] = useState('');
  const [currentNonStriker, setCurrentNonStriker] = useState('');
  const [currentBowler, setCurrentBowler] = useState('');
  const [battingStats, setBattingStats] = useState<PlayerBattingStats[]>([]);
  const [bowlingStats, setBowlingStats] = useState<PlayerBowlingStats[]>([]);
  const [lastLegalBallRuns, setLastLegalBallRuns] = useState(0);
  
  // Separate tracking for each team's balls/overs
  const [team1Balls, setTeam1Balls] = useState(0);
  const [team2Balls, setTeam2Balls] = useState(0);

  // Bowling rules and restrictions tracking
  const [lastOverBowlerByInning, setLastOverBowlerByInning] = useState<{[key: number]: string}>({});
  const [bowlingHistoryByInning, setBowlingHistoryByInning] = useState<{[key: number]: Array<{over: number; bowler: string}>}>({1: [], 2: []});
  // Change from simple number to object tracking both legal and total balls
  const [ballsByBowlerByInning, setBallsByBowlerByInning] = useState<{
    [key: number]: Record<string, {
      legalBalls: number;    // Only counts toward overs (no wides/no-balls)
      totalBalls: number;    // All balls bowled including extras
    }>
  }>({1: {}, 2: {}});
  
  // Next bowler selection dialog
  const [showBowlerDialog, setShowBowlerDialog] = useState(false);
  const [selectedNextBowler, setSelectedNextBowler] = useState('');
  const [eligibleBowlers, setEligibleBowlers] = useState<string[]>([]);
  
  // Second innings setup dialog
  const [showSecondInningsDialog, setShowSecondInningsDialog] = useState(false);
  const [newStriker, setNewStriker] = useState('');
  const [newNonStriker, setNewNonStriker] = useState('');
  const [newBowler, setNewBowler] = useState('');
  const [matchResult, setMatchResult] = useState<string | null>(null);
  const [isMatchCompleted, setIsMatchCompleted] = useState(false);
  
  // Man of the match functionality
  const [showManOfMatchDialog, setShowManOfMatchDialog] = useState(false);
  const [selectedManOfMatch, setSelectedManOfMatch] = useState('');
  const [manOfMatchSelected, setManOfMatchSelected] = useState(false);
  
  // Match saving functionality
  const [isMatchSaved, setIsMatchSaved] = useState(false);
  const [isSavingMatch, setIsSavingMatch] = useState(false);
  const [isPlayerProfilesSaved, setIsPlayerProfilesSaved] = useState(false);
  const [isSavingPlayerProfiles, setIsSavingPlayerProfiles] = useState(false);
  
  // Per-innings data persistence
  const [inningsData, setInningsData] = useState<Array<{
    inningNumber: number;
    battingTeam: string;
    score: {
      runs: number;
      wickets: number;
      overs: string;
      ballsFaced: number;
    };
    batsmen: PlayerBattingStats[];
    bowlers: PlayerBowlingStats[];
    ballByBall: string[];
  }>>([]);
  
  // Manual second innings trigger
  const [firstInningsComplete, setFirstInningsComplete] = useState(false);
  const [showManualSecondInningsButton, setShowManualSecondInningsButton] = useState(false);
  
  // Wicket tracking
  const [dismissedPlayers, setDismissedPlayers] = useState<Set<string>>(new Set());
  
  // Batsman replacement dialog
  const [showReplacementDialog, setShowReplacementDialog] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState('');
  const [replacingPlayer, setReplacingPlayer] = useState<'striker' | 'non-striker'>('striker');
  
  // Match configuration for bowling restrictions
  const totalOvers = parseInt(match.matchType?.replace(/[^\d]/g, '') || '20'); // Extract number from match type like "20 Overs"
  const maxWickets = 10; // Maximum wickets in an innings
  // Bowling quota constraint removed - bowlers can bowl unlimited overs

  // Bowler eligibility helper functions
  const getFieldingRoster = () => {
    // First inning: team2 is fielding, second inning: team1 is fielding
    const fieldingTeam = currentInning === 1 ? 'team2' : 'team1';
    
    // Filter actual roster players by fielding team
    const filteredPlayers = rosterPlayers.filter((player: any) => 
      player.team === fieldingTeam
    );
    
    // If we have roster data, return actual players
    if (filteredPlayers.length > 0) {
      return filteredPlayers;
    }
    
    // If no roster data is available, provide fallback bowler names
    const teamName = fieldingTeam === 'team1' ? (match.team1Name || 'Team A') : (match.team2Name || 'Team B');
    const fallbackBowlers = [
      { name: `${teamName} Bowler 1`, team: fieldingTeam, role: 'bowler', id: `${fieldingTeam}-bowler-1` },
      { name: `${teamName} Bowler 2`, team: fieldingTeam, role: 'bowler', id: `${fieldingTeam}-bowler-2` },
      { name: `${teamName} Bowler 3`, team: fieldingTeam, role: 'bowler', id: `${fieldingTeam}-bowler-3` },
      { name: `${teamName} Bowler 4`, team: fieldingTeam, role: 'bowler', id: `${fieldingTeam}-bowler-4` },
      { name: `${teamName} Bowler 5`, team: fieldingTeam, role: 'bowler', id: `${fieldingTeam}-bowler-5` },
      { name: `${teamName} Bowler 6`, team: fieldingTeam, role: 'bowler', id: `${fieldingTeam}-bowler-6` },
    ];
    return fallbackBowlers;
  };

  // Get all players from both teams for man of the match selection
  const getAllPlayers = () => {
    const allPlayers = rosterPlayers.filter((player: any) => player.name || player.playerName);
    
    if (allPlayers.length > 0) {
      return allPlayers;
    }
    
    // Fallback if no roster data
    const team1Players = [
      { name: `${match.team1Name || 'Team A'} Player 1`, team: 'team1', id: 'team1-player-1' },
      { name: `${match.team1Name || 'Team A'} Player 2`, team: 'team1', id: 'team1-player-2' },
      { name: `${match.team1Name || 'Team A'} Player 3`, team: 'team1', id: 'team1-player-3' },
    ];
    
    const team2Players = [
      { name: `${match.team2Name || 'Team B'} Player 1`, team: 'team2', id: 'team2-player-1' },
      { name: `${match.team2Name || 'Team B'} Player 2`, team: 'team2', id: 'team2-player-2' },
      { name: `${match.team2Name || 'Team B'} Player 3`, team: 'team2', id: 'team2-player-3' },
    ];
    
    return [...team1Players, ...team2Players];
  };

  // Batting roster helper function (similar to fielding roster)
  const getBattingRoster = () => {
    // First inning: team1 is batting, second inning: team2 is batting
    const battingTeam = currentInning === 1 ? 'team1' : 'team2';
    
    // Filter actual roster players by batting team and exclude dismissed players
    const filteredPlayers = rosterPlayers.filter((player: any) => 
      player.team === battingTeam && !dismissedPlayers.has(player.name || player.playerName)
    );
    
    // If we have roster data with available players, return them
    if (filteredPlayers.length > 0) {
      return filteredPlayers;
    }
    
    // If no roster data is available, provide fallback batsman names
    const teamName = battingTeam === 'team1' ? (match.team1Name || 'Team A') : (match.team2Name || 'Team B');
    const fallbackBatsmen = [
      { name: `${teamName} Batsman 1`, team: battingTeam, role: 'batsman', id: `${battingTeam}-batsman-1` },
      { name: `${teamName} Batsman 2`, team: battingTeam, role: 'batsman', id: `${battingTeam}-batsman-2` },
      { name: `${teamName} Batsman 3`, team: battingTeam, role: 'batsman', id: `${battingTeam}-batsman-3` },
      { name: `${teamName} Batsman 4`, team: battingTeam, role: 'batsman', id: `${battingTeam}-batsman-4` },
      { name: `${teamName} Batsman 5`, team: battingTeam, role: 'batsman', id: `${battingTeam}-batsman-5` },
      { name: `${teamName} Batsman 6`, team: battingTeam, role: 'batsman', id: `${battingTeam}-batsman-6` },
      { name: `${teamName} Batsman 7`, team: battingTeam, role: 'batsman', id: `${battingTeam}-batsman-7` },
      { name: `${teamName} Batsman 8`, team: battingTeam, role: 'batsman', id: `${battingTeam}-batsman-8` },
      { name: `${teamName} Batsman 9`, team: battingTeam, role: 'batsman', id: `${battingTeam}-batsman-9` },
      { name: `${teamName} Batsman 10`, team: battingTeam, role: 'batsman', id: `${battingTeam}-batsman-10` },
      { name: `${teamName} Batsman 11`, team: battingTeam, role: 'batsman', id: `${battingTeam}-batsman-11` },
    ];
    // Filter out dismissed players from fallback names too
    return fallbackBatsmen.filter(player => !dismissedPlayers.has(player.name));
  };

  // Track legal balls separately from total balls (including extras)
  const getLegalBallsBowled = (playerName: string) => {
    return ballsByBowlerByInning[currentInning]?.[playerName]?.legalBalls || 0;
  };

  const getBallsBowled = (playerName: string) => {
    return ballsByBowlerByInning[currentInning]?.[playerName]?.totalBalls || 0;
  };

  const getOversBowled = (playerName: string) => {
    const legalBalls = getLegalBallsBowled(playerName);
    return Math.floor(legalBalls / 6);
  };

  const getRemainingBallsInCurrentOver = (playerName: string) => {
    const legalBalls = getLegalBallsBowled(playerName);
    return legalBalls % 6; // Returns 0-5 balls remaining in current over
  };

  // Format overs as "5.3" (5 complete overs + 3 balls)
  const getFormattedOvers = (playerName: string) => {
    const completeOvers = getOversBowled(playerName);
    const remainingBalls = getRemainingBallsInCurrentOver(playerName);
    return remainingBalls > 0 ? `${completeOvers}.${remainingBalls}` : `${completeOvers}`;
  };


  const hasReachedQuota = (playerName: string) => {
    // Bowling quota constraint removed - no bowler reaches quota
    return false;
  };

  const isPreviousOverBowler = (playerName: string) => {
    return playerName === lastOverBowlerByInning[currentInning];
  };

  const computeEligibleBowlers = (excludeBowler?: string) => {
    const fieldingRoster = getFieldingRoster();
    const bowlerToExclude = excludeBowler || lastOverBowlerByInning[currentInning];
    return fieldingRoster
      .filter((player: any) => {
        const playerName = player.name || player.playerName;
        const isNotPreviousBowler = playerName !== bowlerToExclude;
        // Bowling quota constraint removed - only check consecutive overs rule
        return isNotPreviousBowler && playerName; // Ensure player has a valid name
      })
      .map((player: any) => player.name || player.playerName);
  };

  const getBowlerRestrictionReason = (playerName: string, excludeBowler?: string) => {
    const bowlerToExclude = excludeBowler || lastOverBowlerByInning[currentInning];
    if (playerName === bowlerToExclude) {
      return "Cannot bowl consecutive overs";
    }
    // Bowling quota constraint removed - no quota restrictions
    return null;
  };

  // Initialize current players from match data when match goes live
  useEffect(() => {
    if (isLive && match?.matchData?.currentPlayers) {
      const { striker, nonStriker, bowler } = match.matchData.currentPlayers;
      if (striker && !currentStriker) setCurrentStriker(striker);
      if (nonStriker && !currentNonStriker) setCurrentNonStriker(nonStriker);
      if (bowler && !currentBowler) setCurrentBowler(bowler);
    }
  }, [isLive, match?.matchData?.currentPlayers, currentStriker, currentNonStriker, currentBowler]);

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
  const updateBattingStats = (playerName: string, runs: number, countsAsBall: boolean = true, isDot: boolean = false, dismissalType?: string) => {
    setBattingStats(prev => {
      const existingPlayerIndex = prev.findIndex(p => p.name === playerName);
      if (existingPlayerIndex >= 0) {
        const updated = [...prev];
        const player = updated[existingPlayerIndex];
        player.runs += runs;
        if (countsAsBall) player.balls += 1;
        if (isDot) player.dots += 1;
        if (runs === 4) player.fours += 1;
        if (runs === 6) player.sixes += 1;
        player.strikeRate = player.balls > 0 ? (player.runs / player.balls) * 100 : 0;
        if (dismissalType) {
          player.isDismissed = true;
          player.dismissalType = dismissalType;
        }
        return updated;
      } else {
        const newPlayer: PlayerBattingStats = {
          name: playerName,
          runs,
          balls: countsAsBall ? 1 : 0,
          dots: isDot ? 1 : 0,
          fours: runs === 4 ? 1 : 0,
          sixes: runs === 6 ? 1 : 0,
          strikeRate: countsAsBall && runs > 0 ? runs * 100 : 0,
          isDismissed: false
        };
        return [...prev, newPlayer];
      }
    });
  };

  const updateBowlingStats = (playerName: string, runs: number, isWicket: boolean = false, countsAsBall: boolean = true) => {
    setBowlingStats(prev => {
      const existingPlayerIndex = prev.findIndex(p => p.name === playerName);
      if (existingPlayerIndex >= 0) {
        const updated = [...prev];
        const player = updated[existingPlayerIndex];
        player.runsConceded += runs;
        if (countsAsBall) player.balls += 1;
        if (isWicket) player.wickets += 1;
        
        // Calculate overs in proper format
        const completedOvers = Math.floor(player.balls / 6);
        const ballsInCurrentOver = player.balls % 6;
        player.overs = completedOvers + (ballsInCurrentOver * 0.1);
        player.oversBowled = `${completedOvers}.${ballsInCurrentOver}`;
        
        // Calculate maiden overs (simplified - over with 0 runs, would need more complex tracking for accuracy)
        player.maidenOvers = player.maidenOvers || 0;
        
        player.economyRate = player.balls > 0 ? (player.runsConceded / (player.balls / 6)) : 0;
        player.bowlingAverage = player.wickets > 0 ? player.runsConceded / player.wickets : 0;
        return updated;
      } else {
        const newPlayer: PlayerBowlingStats = {
          name: playerName,
          wickets: isWicket ? 1 : 0,
          overs: countsAsBall ? 0.1 : 0,
          balls: countsAsBall ? 1 : 0,
          runsConceded: runs,
          economyRate: countsAsBall ? runs * 6 : 0,
          bowlingAverage: isWicket ? runs : 0,
          maidenOvers: 0,
          oversBowled: countsAsBall ? "0.1" : "0.0"
        };
        return [...prev, newPlayer];
      }
    });

    // Update balls by bowler by inning for quota tracking
    setBallsByBowlerByInning(prev => ({
      ...prev,
      [currentInning]: {
        ...prev[currentInning],
        [playerName]: {
          legalBalls: (prev[currentInning]?.[playerName]?.legalBalls || 0) + (countsAsBall ? 1 : 0),
          totalBalls: (prev[currentInning]?.[playerName]?.totalBalls || 0) + 1
        }
      }
    }));
  };

  // Strike rotation logic
  const rotateStrike = () => {
    const temp = currentStriker;
    setCurrentStriker(currentNonStriker);
    setCurrentNonStriker(temp);
  };

  // Handle batsman replacement
  const handleBatsmanReplacement = () => {
    if (!selectedReplacement) {
      toast({
        title: "Replacement Required",
        description: "Please select a replacement batsman.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate replacement is from batting team
    const battingRoster = getBattingRoster();
    const replacementInRoster = battingRoster.some((player: any) => 
      (player.name || player.playerName) === selectedReplacement
    );
    
    if (!replacementInRoster) {
      toast({
        title: "Invalid Selection",
        description: "Selected batsman is not from the batting team roster.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate replacement is not already playing
    if (selectedReplacement === currentStriker || selectedReplacement === currentNonStriker) {
      toast({
        title: "Invalid Selection",
        description: "Selected batsman is already playing. Choose a different player.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate replacement is not already dismissed
    if (dismissedPlayers.has(selectedReplacement)) {
      toast({
        title: "Invalid Selection",
        description: "Selected batsman is already out. Choose an active player.",
        variant: "destructive",
      });
      return;
    }
    
    // Replace the batsman
    const playerBeingReplaced = replacingPlayer === 'striker' ? currentStriker : currentNonStriker;
    
    if (replacingPlayer === 'striker') {
      setCurrentStriker(selectedReplacement);
    } else {
      setCurrentNonStriker(selectedReplacement);
    }
    
    // Add to ball-by-ball commentary
    setBallByBall(prev => [...prev, `${selectedReplacement} comes in to bat replacing ${playerBeingReplaced}`]);
    
    // Close dialog and clear selection
    setShowReplacementDialog(false);
    setSelectedReplacement('');
    
    // Success message
    toast({
      title: "Batsman Replaced",
      description: `${selectedReplacement} comes in to bat replacing ${playerBeingReplaced}`,
      duration: 3000,
    });
  };

  const addRuns = (runs: number) => {
    if (!isLive || isMatchCompleted || showManOfMatchDialog) return;
    
    // Capture original striker positions for end-of-over logic
    const originalStriker = currentStriker;
    const originalNonStriker = currentNonStriker;
    
    // Block further scoring if first innings is complete
    if (currentInning === 1 && firstInningsComplete) {
      toast({
        title: "First Innings Complete",
        description: "Click 'Start Second Innings' to continue the match.",
        variant: "destructive",
      });
      return;
    }
    
    // Block scoring while bowler selection is in progress
    if (showBowlerDialog) {
      toast({
        title: "Select Next Bowler",
        description: "Please select a bowler for the next over before continuing.",
        variant: "destructive",
      });
      return;
    }

    // Block scoring while wicket dialog is open
    if (showWicketDialog) {
      toast({
        title: "Wicket Dialog Open",
        description: "Please complete the wicket entry before continuing.",
        variant: "destructive",
      });
      return;
    }

    // Ensure bowler is selected
    if (!currentBowler) {
      toast({
        title: "Bowler Required",
        description: "Please select a valid bowler from the list.",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure both batsmen are selected
    if (!currentStriker || !currentNonStriker) {
      toast({
        title: "Batsmen Required",
        description: "Both striker and non-striker must be selected before scoring.",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure striker and non-striker are different players
    if (currentStriker === currentNonStriker) {
      toast({
        title: "Invalid Selection",
        description: "Striker and non-striker must be different players.",
        variant: "destructive",
      });
      return;
    }

    // Check if the current striker is dismissed - show replacement dialog
    if (dismissedPlayers.has(currentStriker)) {
      setReplacingPlayer('striker');
      setSelectedReplacement('');
      setShowReplacementDialog(true);
      return;
    }

    // Check if the current non-striker is dismissed - show replacement dialog  
    if (dismissedPlayers.has(currentNonStriker)) {
      setReplacingPlayer('non-striker');
      setSelectedReplacement('');
      setShowReplacementDialog(true);
      return;
    }

    // Prevent 7th legal ball in an over or exceeding total overs limit
    const currentTeamBalls = currentInning === 1 ? team1Balls : team2Balls;
    if (currentBall >= 6 || currentTeamBalls >= totalOvers * 6) {
      if (currentTeamBalls >= totalOvers * 6) {
        // Check if this should trigger innings completion
        if (currentInning === 1 && !firstInningsComplete) {
          setFirstInningsComplete(true);
          setShowManualSecondInningsButton(true);
          toast({
            title: "First Innings Complete!",
            description: `${totalOvers} overs completed. Click 'Start Second Innings' to continue.`,
            duration: 8000,
          });
        } else {
          // Second innings completed due to overs - end the match immediately
          handleInningsCompletion();
          return;
        }
      } else {
        toast({
          title: "Over Complete",
          description: "A bowler cannot bowl more than 6 legal balls in an over.",
          variant: "destructive",
        });
      }
      return;
    }

    // Calculate updated values locally
    const newTeam1Runs = currentInning === 1 ? team1Runs + runs : team1Runs;
    const newTeam2Runs = currentInning === 2 ? team2Runs + runs : team2Runs;
    const newTeam1Balls = currentInning === 1 ? team1Balls + 1 : team1Balls;
    const newTeam2Balls = currentInning === 2 ? team2Balls + 1 : team2Balls;
    const newBallByBall = [...ballByBall, `${runs} run${runs !== 1 ? 's' : ''}`];

    // Update state
    if (currentInning === 1) {
      setTeam1Runs(newTeam1Runs);
    } else {
      setTeam2Runs(newTeam2Runs);
    }

    // Check for immediate target achievement in second innings
    if (currentInning === 2) {
      const target = team1Runs + 1;
      if (newTeam2Runs >= target) {
        // Target reached! End match immediately
        setTeam2Runs(newTeam2Runs);
        setBallByBall([...ballByBall, `${runs} run${runs !== 1 ? 's' : ''}`, "🎯 TARGET REACHED!"]);
        
        // Immediately lock the match and show result
        const wicketsRemaining = maxWickets - team2Wickets;
        const result = `${match.team2Name || 'Team B'} won by ${wicketsRemaining} wickets`;
        setMatchResult(result);
        setIsMatchCompleted(true);
        
        // Update final score before showing dialog
        updateScore({
          team1Runs: newTeam1Runs,
          team2Runs: newTeam2Runs,
          team1Balls: newTeam1Balls,
          team2Balls: newTeam2Balls,
          ballByBall: [...ballByBall, `${runs} run${runs !== 1 ? 's' : ''}`, "🎯 TARGET REACHED!"]
        });
        
        // Don't auto-open man of the match dialog - let user choose
        // setShowManOfMatchDialog(true);
        
        toast({
          title: "🎯 TARGET ACHIEVED!",
          description: result,
          duration: 10000
        });
        return;
      }
    }

    // Update player stats
    if (currentStriker) updateBattingStats(currentStriker, runs, true, runs === 0);
    if (currentBowler) updateBowlingStats(currentBowler, runs, false, true);

    // Handle strike rotation with special end-of-over rules
    const isLastBallOfOver = currentBall === 5;
    
    if (isLastBallOfOver) {
      // End-of-over cricket rule: 
      // - Odd runs on last ball: striker faces next over (no rotation)
      // - Even runs on last ball: non-striker faces next over (rotate)
      if (runs % 2 === 0) {
        rotateStrike();
      }
    } else {
      // Normal mid-over rotation for odd runs
      if (runs % 2 === 1) {
        rotateStrike();
      }
    }

    // Track runs from this legal ball for end-of-over rotation
    setLastLegalBallRuns(runs);

    // Trigger flash effects for boundaries
    if (runs === 6) {
      triggerFlashEffect('six');
      toast({ title: "SIX!", description: "What a shot!", duration: 2000 });
    } else if (runs === 4) {
      triggerFlashEffect('four');
      toast({ title: "FOUR!", description: "Excellent boundary!", duration: 2000 });
    }

    // All legal deliveries (including dot balls) advance to next ball
    const endOfOver = nextBall();
    
    // Handle over completion
    if (endOfOver) {
      handleOverCompletion();
    }

    setBallByBall(newBallByBall);
    
    // Update score with calculated values to avoid staleness
    updateScore({
      team1Runs: newTeam1Runs,
      team2Runs: newTeam2Runs,
      team1Balls: newTeam1Balls,
      team2Balls: newTeam2Balls,
      ballByBall: newBallByBall
    });
    
    // Check for innings completion after scoring runs (but only if target not already reached)
    if (currentInning === 1 || (currentInning === 2 && newTeam2Runs < team1Runs + 1)) {
      if (checkInningsCompletion()) {
        setTimeout(() => handleInningsCompletion(), 100); // Small delay to ensure state updates
      }
    }
  };

  const openWicketDialog = () => {
    if (!isLive) return;
    setSelectedWicketType(null);
    setFielderName('');
    setNextBatsman('');
    setDismissedBatter('striker');
    setExtraRuns(0);
    setShowWicketDialog(true);
  };

  const addWicket = (wicketType: 'bowled' | 'caught' | 'run-out' | 'hit-wicket' | 'stump-out' | 'wide-wicket' | 'no-ball-wicket' | 'leg-bye-wicket' | 'bye-wicket', fielder?: string, nextBatsmanName?: string, dismissedBatter?: 'striker' | 'non-striker', extraRunsConceded?: number) => {
    if (!isLive || isMatchCompleted || showManOfMatchDialog) return;
    
    // Block further scoring if first innings is complete
    if (currentInning === 1 && firstInningsComplete) {
      toast({
        title: "First Innings Complete",
        description: "Click 'Start Second Innings' to continue the match.",
        variant: "destructive",
      });
      return;
    }
    
    // Block scoring while bowler selection is in progress
    if (showBowlerDialog) {
      toast({
        title: "Select Next Bowler",
        description: "Please select a bowler for the next over before continuing.",
        variant: "destructive",
      });
      return;
    }

    // Ensure bowler is selected
    if (!currentBowler) {
      toast({
        title: "Bowler Required",
        description: "Please select a valid bowler from the list.",
        variant: "destructive",
      });
      return;
    }

    // Determine if this counts as a legal ball (wide-wicket and no-ball-wicket don't)
    const countsAsBall = !['wide-wicket', 'no-ball-wicket'].includes(wicketType);

    // Check total overs limit (applies to ALL events regardless of countsAsBall)
    const currentTeamBalls = currentInning === 1 ? team1Balls : team2Balls;
    if (currentTeamBalls >= totalOvers * 6) {
      // Check if this should trigger innings completion
      if (currentInning === 1 && !firstInningsComplete) {
        setFirstInningsComplete(true);
        setShowManualSecondInningsButton(true);
        toast({
          title: "First Innings Complete!",
          description: `${totalOvers} overs completed. Click 'Start Second Innings' to continue.`,
          duration: 8000,
        });
      } else {
        // Second innings completed - trigger match completion
        setTimeout(() => handleInningsCompletion(), 100);
      }
      return;
    }

    // For legal ball wickets, prevent 7th legal ball in an over
    if (countsAsBall && currentBall >= 6) {
      toast({
        title: "Over Complete",
        description: "A bowler cannot bowl more than 6 legal balls in an over.",
        variant: "destructive",
      });
      return;
    }

    // Calculate updated values locally including extra runs for combination wickets
    // Validate runs for wide/no-ball combos (minimum 1) and bye/leg-bye combos (minimum 0)
    let runsFromWicket = extraRunsConceded || 0;
    if (['wide-wicket', 'no-ball-wicket'].includes(wicketType) && runsFromWicket < 1) {
      runsFromWicket = 1; // Minimum 1 run for wide/no-ball deliveries
    }
    const newTeam1Runs = currentInning === 1 ? team1Runs + runsFromWicket : team1Runs;
    const newTeam2Runs = currentInning === 2 ? team2Runs + runsFromWicket : team2Runs;
    const newTeam1Wickets = currentInning === 1 ? team1Wickets + 1 : team1Wickets;
    const newTeam2Wickets = currentInning === 2 ? team2Wickets + 1 : team2Wickets;
    
    // Use the already computed countsAsBall for consistency
    const newTeam1Balls = currentInning === 1 && countsAsBall ? team1Balls + 1 : team1Balls;
    const newTeam2Balls = currentInning === 2 && countsAsBall ? team2Balls + 1 : team2Balls;

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
      case 'wide-wicket':
        wicketDescription = `Wide + Wicket (${runsFromWicket} runs)`;
        break;
      case 'no-ball-wicket':
        wicketDescription = `No Ball + Wicket (${runsFromWicket} runs)`;
        break;
      case 'leg-bye-wicket':
        wicketDescription = `Leg Bye + Wicket (${runsFromWicket} runs)`;
        break;
      case 'bye-wicket':
        wicketDescription = `Bye + Wicket (${runsFromWicket} runs)`;
        break;
    }

    if (nextBatsmanName) {
      wicketDescription += ` | ${nextBatsmanName} in`;
    }
    
    const newBallByBall = [...ballByBall, wicketDescription];

    // Check for immediate target achievement in second innings
    if (currentInning === 2) {
      const target = team1Runs + 1;
      if (newTeam2Runs >= target) {
        // Target reached! End match immediately
        setTeam2Runs(newTeam2Runs);
        setTeam2Wickets(newTeam2Wickets);
        setBallByBall([...ballByBall, wicketDescription, "🎯 TARGET REACHED!"]);
        
        // Immediately lock the match and show result
        const wicketsRemaining = maxWickets - newTeam2Wickets;
        const result = `${match.team2Name || 'Team B'} won by ${wicketsRemaining} wickets`;
        setMatchResult(result);
        setIsMatchCompleted(true);
        // setShowManOfMatchDialog(true); // Let user choose to open this
        
        // Update final score
        updateScore({
          team1Runs: newTeam1Runs,
          team2Runs: newTeam2Runs,
          team1Wickets: newTeam1Wickets,
          team2Wickets: newTeam2Wickets,
          team1Balls: newTeam1Balls,
          team2Balls: newTeam2Balls,
          ballByBall: [...ballByBall, wicketDescription, "🎯 TARGET REACHED!"]
        });
        
        toast({
          title: "🎯 TARGET ACHIEVED!",
          description: result,
          duration: 10000
        });
        return;
      }
    }

    // Update state
    if (currentInning === 1) {
      setTeam1Runs(newTeam1Runs);
      setTeam1Wickets(newTeam1Wickets);
    } else {
      setTeam2Runs(newTeam2Runs);
      setTeam2Wickets(newTeam2Wickets);
    }

    // Determine who was dismissed (default to striker for non-run-out)
    const actualDismissedBatter = wicketType === 'run-out' ? (dismissedBatter || 'striker') : 'striker';
    const dismissedBatterName = actualDismissedBatter === 'striker' ? currentStriker : currentNonStriker;

    // Mark player as dismissed and handle ball attribution correctly
    if (dismissedBatterName) {
      // Add to dismissed players set
      setDismissedPlayers(prev => new Set(Array.from(prev).concat(dismissedBatterName)));
      
      // Map wicket type to proper dismissal type for database
      const getDismissalType = (wType: string): string => {
        switch (wType) {
          case 'bowled': return 'bowled';
          case 'caught': return 'caught';
          case 'run-out': return 'run-out';
          case 'hit-wicket': return 'hit-wicket';
          case 'stump-out': return 'stumped';
          case 'wide-wicket': return 'caught'; // Wide-wicket is usually a catch
          case 'no-ball-wicket': return 'caught'; // No-ball-wicket is usually a catch
          case 'leg-bye-wicket': return 'run-out'; // Usually run-out on leg-bye
          case 'bye-wicket': return 'run-out'; // Usually run-out on bye
          default: return 'bowled';
        }
      };
      
      const properDismissalType = getDismissalType(wicketType);
      
      // For legal deliveries: striker always faces the ball, regardless of who gets out
      if (countsAsBall) {
        if (actualDismissedBatter === 'striker') {
          // Striker gets out - they face the ball and get dismissed
          updateBattingStats(dismissedBatterName, 0, true, false, properDismissalType);
        } else {
          // Non-striker gets out - striker faces the ball, non-striker gets dismissed without ball faced
          updateBattingStats(currentStriker, 0, true, false); // Striker faces the ball
          updateBattingStats(dismissedBatterName, 0, false, false, properDismissalType); // Non-striker dismissed, no ball faced
        }
      } else {
        // Extra delivery wickets (wide-wicket, no-ball-wicket) - no ball faced by anyone
        updateBattingStats(dismissedBatterName, 0, false, false, properDismissalType);
      }
    }

    // Only credit bowler for applicable wicket types (not run-out)
    // Update bowling stats correctly for combination wickets
    if (currentBowler) {
      // For wide/no-ball wickets, bowler concedes the runs; for bye/leg-bye wickets, bowler doesn't concede runs
      const bowlerRunsConceded = ['wide-wicket', 'no-ball-wicket'].includes(wicketType) ? runsFromWicket : 0;
      // Only credit bowler with wicket for legal dismissals, not for run-outs, bye/leg-bye wickets, or no-ball wickets
      const bowlerGetsWicket = wicketType === 'wide-wicket' || ['bowled', 'caught', 'hit-wicket', 'stump-out'].includes(wicketType);
      updateBowlingStats(currentBowler, bowlerRunsConceded, bowlerGetsWicket, countsAsBall);
    }

    // Check if this will be the last ball of the over (for wicket positioning)
    const isLastBallOfOver = countsAsBall && currentBall === 5;

    // Store the current non-striker before any updates (needed for last ball wicket logic)
    const nonStrikerBeforeWicket = currentNonStriker;

    // Update batsmen based on who was dismissed
    if (nextBatsmanName) {
      if (actualDismissedBatter === 'striker') {
        // Striker gets out: new batsman replaces striker position
        setCurrentStriker(nextBatsmanName);
        // Initialize batting stats for new batsman
        updateBattingStats(nextBatsmanName, 0, false, false);
      } else {
        // Non-striker gets out: new batsman replaces non-striker position
        setCurrentNonStriker(nextBatsmanName);
        // Initialize batting stats for new batsman
        updateBattingStats(nextBatsmanName, 0, false, false);
      }
    }

    // Trigger wicket flash effect
    triggerFlashEffect('wicket');
    toast({ title: "WICKET!", description: `${wicketType.replace('-', ' ').toUpperCase()}!`, variant: "destructive", duration: 3000 });

    // Track 0 runs for wicket balls for end-of-over rotation (only for legal balls)
    if (countsAsBall) {
      setLastLegalBallRuns(0);
    }
    
    const endOfOver = countsAsBall ? nextBall() : false;
    
    // Special handling for wicket on last ball of over:
    // The non-striker (who was at the other end) should face the next over
    // and the new batsman should be at the non-striker end
    if (endOfOver && actualDismissedBatter === 'striker' && nextBatsmanName) {
      // Swap: non-striker (who was at other end) becomes striker for next over
      // and new batsman (who just came in at striker) goes to non-striker
      setTimeout(() => {
        setCurrentStriker(nonStrikerBeforeWicket);
        setCurrentNonStriker(nextBatsmanName);
      }, 0);
    } else if (endOfOver) {
      // Normal end of over (no striker wicket): no special rotation needed
    }
    
    if (endOfOver) {
      handleOverCompletion();
    }

    setBallByBall(newBallByBall);
    setShowWicketDialog(false);
    
    // Update score with calculated values to avoid staleness
    updateScore({
      team1Runs: newTeam1Runs,
      team2Runs: newTeam2Runs,
      team1Wickets: newTeam1Wickets,
      team2Wickets: newTeam2Wickets,
      team1Balls: newTeam1Balls,
      team2Balls: newTeam2Balls,
      ballByBall: newBallByBall
    });
    
    // Check for innings completion after wicket (all out)
    if (checkInningsCompletion()) {
      setTimeout(() => handleInningsCompletion(), 100); // Small delay to ensure state updates
    }
  };

  const openExtrasDialog = (type: 'wide' | 'no-ball' | 'bye' | 'leg-bye') => {
    if (!isLive || isMatchCompleted) return;
    setSelectedExtraType(type);
    setShowExtrasDialog(true);
  };

  const addExtra = (type: 'wide' | 'no-ball' | 'bye' | 'leg-bye', runs: number = 1) => {
    if (!isLive || isMatchCompleted || showManOfMatchDialog) return;
    
    // Block further scoring if first innings is complete
    if (currentInning === 1 && firstInningsComplete) {
      toast({
        title: "First Innings Complete",
        description: "Click 'Start Second Innings' to continue the match.",
        variant: "destructive",
      });
      return;
    }
    
    // Block scoring while bowler selection is in progress
    if (showBowlerDialog) {
      toast({
        title: "Select Next Bowler",
        description: "Please select a bowler for the next over before continuing.",
        variant: "destructive",
      });
      return;
    }

    // Block scoring while wicket dialog is open
    if (showWicketDialog) {
      toast({
        title: "Wicket Dialog Open",
        description: "Please complete the wicket entry before continuing.",
        variant: "destructive",
      });
      return;
    }

    // For wides and no-balls, don't count as ball faced by bowler
    const countsAsBall = type !== 'wide' && type !== 'no-ball';
    
    // Ensure bowler is selected
    if (!currentBowler) {
      toast({
        title: "Bowler Required",
        description: "Please select a valid bowler from the list.",
        variant: "destructive",
      });
      return;
    }
    
    // For bye/leg-bye (legal deliveries), ensure both batsmen are selected
    if ((type === 'bye' || type === 'leg-bye')) {
      if (!currentStriker || !currentNonStriker) {
        toast({
          title: "Batsmen Required",
          description: "Both striker and non-striker must be selected for byes and leg-byes.",
          variant: "destructive",
        });
        return;
      }
      
      // Check if current striker is dismissed - show replacement dialog
      if (dismissedPlayers.has(currentStriker)) {
        setReplacingPlayer('striker');
        setSelectedReplacement('');
        setShowReplacementDialog(true);
        return;
      }

      // Check if current non-striker is dismissed - show replacement dialog  
      if (dismissedPlayers.has(currentNonStriker)) {
        setReplacingPlayer('non-striker');
        setSelectedReplacement('');
        setShowReplacementDialog(true);
        return;
      }
      
      // Check total overs limit (applies to ALL events regardless of countsAsBall)
      const currentTeamBalls = currentInning === 1 ? team1Balls : team2Balls;
      if (currentTeamBalls >= totalOvers * 6) {
        // Check if this should trigger innings completion
        if (currentInning === 1 && !firstInningsComplete) {
          setFirstInningsComplete(true);
          setShowManualSecondInningsButton(true);
          toast({
            title: "First Innings Complete!",
            description: `${totalOvers} overs completed. Click 'Start Second Innings' to continue.`,
            duration: 8000,
          });
        } else {
          // Second innings completed due to overs - end the match immediately
          handleInningsCompletion();
          return;
        }
        return;
      }

      // Prevent 7th legal ball in an over for bye/leg-bye
      if (currentBall >= 6) {
        toast({
          title: "Over Complete",
          description: "Cannot bowl more than 6 legal balls in an over.",
          variant: "destructive",
        });
        return;
      }
    }

    // Check if current striker is dismissed for byes/leg-byes (they need to face the ball)
    if ((type === 'bye' || type === 'leg-bye') && dismissedPlayers.has(currentStriker)) {
      toast({
        title: "Player is Out",
        description: `${currentStriker} is already dismissed and cannot face the ball. Please select a new batsman.`,
        variant: "destructive",
      });
      return;
    }

    // Check total overs limit (applies to ALL events regardless of countsAsBall)
    const currentTeamBalls = currentInning === 1 ? team1Balls : team2Balls;
    if (currentTeamBalls >= totalOvers * 6) {
      // Check if this should trigger innings completion
      if (currentInning === 1 && !firstInningsComplete) {
        setFirstInningsComplete(true);
        setShowManualSecondInningsButton(true);
        toast({
          title: "First Innings Complete!",
          description: `${totalOvers} overs completed. Click 'Start Second Innings' to continue.`,
          duration: 8000,
        });
      } else {
        // Second innings completed - trigger match completion
        setTimeout(() => handleInningsCompletion(), 100);
      }
      return;
    }

    // Prevent 7th legal ball in an over (for byes and leg-byes)
    if (countsAsBall && currentBall >= 6) {
      toast({
        title: "Over Complete",
        description: "A bowler cannot bowl more than 6 legal balls in an over.",
        variant: "destructive",
      });
      return;
    }
    
    // Calculate updated values locally
    const newTeam1Runs = currentInning === 1 ? team1Runs + runs : team1Runs;
    const newTeam2Runs = currentInning === 2 ? team2Runs + runs : team2Runs;
    const newTeam1Balls = currentInning === 1 && countsAsBall ? team1Balls + 1 : team1Balls;
    const newTeam2Balls = currentInning === 2 && countsAsBall ? team2Balls + 1 : team2Balls;
    
    // Enhanced ball by ball description
    let description = '';
    if (type === 'wide') {
      description = runs === 1 ? 'Wide +0' : `Wide +${runs - 1}`;
      // Rotate strike on wides with runs
      if (runs > 1 && (runs - 1) % 2 === 1) {
        rotateStrike();
      }
    } else if (type === 'no-ball') {
      description = runs === 1 ? 'No Ball +0' : `No Ball +${runs - 1}`;
      // Handle no-ball bat runs
      if (runs > 1 && currentStriker) {
        const batRuns = runs - 1; // Runs off the bat (excluding the no-ball penalty)
        updateBattingStats(currentStriker, batRuns, false, false); // No ball faced, no dot
        // Rotate strike based on bat runs
        if (batRuns % 2 === 1) {
          rotateStrike();
        }
      }
    } else if (type === 'bye') {
      description = `Byes ${runs}`;
    } else if (type === 'leg-bye') {
      description = `Leg Byes ${runs}`;
    }
    
    const newBallByBall = [...ballByBall, description];

    // Immediate target check for extras in second innings
    if (currentInning === 2) {
      const target = team1Runs + 1;
      if (newTeam2Runs >= target) {
        setTeam2Runs(newTeam2Runs);
        setBallByBall([...ballByBall, description, "🎯 TARGET REACHED!"]);

        const wicketsRemaining = maxWickets - team2Wickets;
        const result = `${match.team2Name || 'Team B'} won by ${wicketsRemaining} wickets`;
        setMatchResult(result);
        setIsMatchCompleted(true);
        // setShowManOfMatchDialog(true); // Let user choose to open this

        updateScore({
          team1Runs: newTeam1Runs,
          team2Runs: newTeam2Runs,
          team1Balls: newTeam1Balls,
          team2Balls: newTeam2Balls,
          ballByBall: [...ballByBall, description, "🎯 TARGET REACHED!"]
        });

        toast({ title: "🎯 TARGET ACHIEVED!", description: result, duration: 10000 });
        return;
      }
    }

    // Update state
    if (currentInning === 1) {
      setTeam1Runs(newTeam1Runs);
    } else {
      setTeam2Runs(newTeam2Runs);
    }
    
    // Update bowling stats for extras
    if (currentBowler) updateBowlingStats(currentBowler, runs, false, countsAsBall);

    // For byes and leg-byes, update batting stats (as batsman faced a ball)
    if ((type === 'bye' || type === 'leg-bye') && currentStriker) {
      const isDot = runs === 0;
      updateBattingStats(currentStriker, 0, true, isDot); // No runs to batsman for byes/leg-byes
      
      // Rotate strike on odd runs for byes/leg-byes
      if (runs % 2 === 1) {
        rotateStrike();
      }
    }

    let endOfOver = false;
    if (countsAsBall) {
      // Track runs from this legal ball for end-of-over rotation
      setLastLegalBallRuns(runs);
      endOfOver = nextBall();
      // Rotate strike at end of over only if last legal ball had odd runs
      if (endOfOver) {
        if (runs % 2 === 1) {
          rotateStrike();
        }
        handleOverCompletion();
      }
    }

    setBallByBall(newBallByBall);
    setShowExtrasDialog(false);
    
    // Update score with calculated values to avoid staleness
    updateScore({
      team1Runs: newTeam1Runs,
      team2Runs: newTeam2Runs,
      team1Balls: newTeam1Balls,
      team2Balls: newTeam2Balls,
      ballByBall: newBallByBall
    });
    
    // Check for innings completion after extras
    if (checkInningsCompletion()) {
      setTimeout(() => handleInningsCompletion(), 100); // Small delay to ensure state updates
    }
  };

  // Check if innings should end automatically
  const checkInningsCompletion = () => {
    const currentTeamWickets = currentInning === 1 ? team1Wickets : team2Wickets;
    const currentTeamBalls = currentInning === 1 ? team1Balls : team2Balls;
    const oversCompleted = Math.floor(currentTeamBalls / 6);
    
    // For first innings: End if max overs reached or all wickets fall
    if (currentInning === 1) {
      if (currentTeamBalls >= totalOvers * 6 || currentTeamWickets >= maxWickets) {
        return true;
      }
    }
    
    // For second innings: End if target reached, OR overs completed, OR all wickets fall
    if (currentInning === 2) {
      const target = team1Runs + 1;
      
      // Target reached - batting team wins
      if (team2Runs >= target) {
        return true;
      }
      
      // Overs completed or all wickets fall - determine winner based on scores
      if (currentTeamBalls >= totalOvers * 6 || currentTeamWickets >= maxWickets) {
        return true;
      }
    }
    
    return false;
  };

  const nextBall = (): boolean => {
    // Check if this will complete an over BEFORE updating state
    const willCompleteOver = currentBall === 5;
    
    setCurrentBall(prev => {
      if (prev === 5) {
        setCurrentOver(over => over + 1);
        return 0;
      }
      return prev + 1;
    });

    // Update team-specific ball counts
    if (currentInning === 1) {
      setTeam1Balls(prev => prev + 1);
    } else {
      setTeam2Balls(prev => prev + 1);
    }

    return willCompleteOver;
  };

  // Handle automatic innings completion
  const handleInningsCompletion = () => {
    const currentTeamWickets = currentInning === 1 ? team1Wickets : team2Wickets;
    const oversCompleted = Math.floor((currentInning === 1 ? team1Balls : team2Balls) / 6);
    
    if (currentInning === 1) {
      // First innings completed - always set manual trigger states
      setFirstInningsComplete(true);
      setShowManualSecondInningsButton(true);
      
      const target = team1Runs + 1;
      
      let completionReason = '';
      if (oversCompleted >= totalOvers) {
        completionReason = `${totalOvers} overs completed`;
      } else if (currentTeamWickets >= maxWickets) {
        completionReason = 'All out';
      }
      
      toast({
        title: "First Innings Complete!",
        description: `${match.team1Name || 'Team A'} scored ${team1Runs}/${team1Wickets} (${completionReason}). Click 'Start Second Innings' to continue.`,
        duration: 8000
      });
      
      // Try automatic transition - if it fails, manual button is already available
      try {
        // Set current inning to 2 before showing dialog to get correct rosters
        setCurrentInning(2);
        
        // Show second innings setup dialog
        setNewStriker('');
        setNewNonStriker('');
        setNewBowler('');
        setShowSecondInningsDialog(true);
      } catch (error) {
        console.error('Automatic second innings setup failed:', error);
        // Manual button is already showing as fallback
      }
      
    } else {
      // Second innings completed - determine match result
      const target = team1Runs + 1;
      let result = '';
      
      if (team2Runs >= target) {
        const wicketsRemaining = maxWickets - team2Wickets;
        result = `${match.team2Name || 'Team B'} won by ${wicketsRemaining} wickets`;
      } else if (team2Runs === team1Runs) {
        result = 'Match Tied';
      } else {
        const runsMargin = team1Runs - team2Runs;
        result = `${match.team1Name || 'Team A'} won by ${runsMargin} runs`;
      }
      
      setMatchResult(result);
      
      // Complete the match immediately - don't auto-open Man of the Match dialog
      setIsMatchCompleted(true);
      // setShowManOfMatchDialog(true); // Let user choose to open this
      
      toast({
        title: "Match Complete!",
        description: result,
        duration: 10000
      });
    }
  };

  // Handle over completion - trigger bowler selection dialog or check innings completion
  const handleOverCompletion = () => {
    if (!currentBowler) {
      console.log("No current bowler set, skipping over completion");
      return;
    }

    // Check if innings should end after this over
    if (checkInningsCompletion()) {
      handleInningsCompletion();
      return;
    }

    console.log("Over completed! Current bowler:", currentBowler, "Current over:", currentOver);

    // Update last over bowler for current inning
    setLastOverBowlerByInning(prev => ({
      ...prev,
      [currentInning]: currentBowler
    }));

    // Add to bowling history
    setBowlingHistoryByInning(prev => ({
      ...prev,
      [currentInning]: [
        ...prev[currentInning],
        { over: currentOver, bowler: currentBowler } // Use currentOver as the completed over
      ]
    }));

    // Compute and set eligible bowlers, excluding the current bowler
    const eligible = computeEligibleBowlers(currentBowler);
    console.log("Eligible bowlers:", eligible);
    console.log("Fielding roster:", getFieldingRoster());
    console.log("Previous bowler to exclude:", currentBowler);
    setEligibleBowlers(eligible);

    // Add commentary for over completion  
    setBallByBall(prev => [...prev, `Over ${currentOver} completed by ${currentBowler}`]);

    // Show bowler selection dialog
    setSelectedNextBowler('');
    setShowBowlerDialog(true);
    console.log("Setting showBowlerDialog to true");

    // Flash effect for over completion
    toast({ 
      title: "Over Completed!", 
      description: `Select next bowler for Over ${currentOver}`, 
      duration: 3000 
    });
  };

  // Handle manual second innings start
  const handleManualSecondInningsStart = () => {
    if (!isLive) return;
    
    // Set current inning to 2 before showing dialog to get correct rosters
    setCurrentInning(2);
    
    // Show second innings setup dialog
    setNewStriker('');
    setNewNonStriker('');
    setNewBowler('');
    setShowSecondInningsDialog(true);
    
    // Hide the manual button
    setShowManualSecondInningsButton(false);
    
    toast({
      title: "Setting up Second Innings",
      description: "Please select batting team players and bowler",
      duration: 3000
    });
  };

  // Function to capture current innings data before resetting
  const captureInningsData = (inningNumber: number) => {
    const currentBattingTeam = inningNumber === 1 ? 
      (match.team1Name || 'Team 1') : 
      (match.team2Name || 'Team 2');
    
    const currentRuns = inningNumber === 1 ? team1Runs : team2Runs;
    const currentWickets = inningNumber === 1 ? team1Wickets : team2Wickets;
    const currentBalls = inningNumber === 1 ? team1Balls : team2Balls;
    
    const inningData = {
      inningNumber,
      battingTeam: currentBattingTeam,
      score: {
        runs: currentRuns,
        wickets: currentWickets,
        overs: `${Math.floor(currentBalls / 6)}.${currentBalls % 6}`,
        ballsFaced: currentBalls
      },
      batsmen: [...battingStats],
      bowlers: [...bowlingStats],
      ballByBall: [...ballByBall]
    };
    
    setInningsData(prev => {
      const filtered = prev.filter(data => data.inningNumber !== inningNumber);
      return [...filtered, inningData];
    });
    
    // Removed console.log to prevent potential object rendering issues
  };

  const switchInnings = () => {
    if (!isLive) return;
    
    // Capture first innings data before resetting
    captureInningsData(1);
    
    // Reset for second innings (currentInning already set to 2 in handleInningsCompletion)
    setCurrentOver(0);
    setCurrentBall(0);
    setBattingStats([]); // Reset batting stats for new team
    setBowlingStats([]); // Reset bowling stats for new team
    setBallByBall([]);
    setDismissedPlayers(new Set()); // Reset dismissed players for new innings
    
    // Reset manual second innings trigger states
    setFirstInningsComplete(false);
    setShowManualSecondInningsButton(false);
    
    // Set new players
    setCurrentStriker(newStriker);
    setCurrentNonStriker(newNonStriker);
    setCurrentBowler(newBowler);
    
    // Initialize batting stats for new batsmen
    if (newStriker) updateBattingStats(newStriker, 0, false, false);
    if (newNonStriker) updateBattingStats(newNonStriker, 0, false, false);
    
    // Team 2 balls start from 0
    setTeam2Balls(0);
    
    // Close dialog
    setShowSecondInningsDialog(false);
    
    // Notify consumers of innings switch
    updateScore();
    
    toast({
      title: "Second Innings Started!",
      description: `Target: ${team1Runs + 1} runs in ${totalOvers} overs`,
      duration: 5000
    });
  };

  const updateScore = (overrides: any = {}) => {
    // Use current state or provided overrides for real-time accuracy
    const currentTeam1Runs = overrides.team1Runs ?? team1Runs;
    const currentTeam1Wickets = overrides.team1Wickets ?? team1Wickets;
    const currentTeam1Balls = overrides.team1Balls ?? team1Balls;
    const currentTeam2Runs = overrides.team2Runs ?? team2Runs;
    const currentTeam2Wickets = overrides.team2Wickets ?? team2Wickets;
    const currentTeam2Balls = overrides.team2Balls ?? team2Balls;
    const currentBallByBall = overrides.ballByBall ?? ballByBall;
    
    // Calculate proper overs from ball counts
    const team1Overs = `${Math.floor(currentTeam1Balls / 6)}.${currentTeam1Balls % 6}`;
    const team2Overs = `${Math.floor(currentTeam2Balls / 6)}.${currentTeam2Balls % 6}`;
    
    const scoreData = {
      team1Score: {
        runs: currentTeam1Runs,
        wickets: currentTeam1Wickets,
        overs: team1Overs,
      },
      team2Score: {
        runs: currentTeam2Runs,
        wickets: currentTeam2Wickets,
        overs: team2Overs,
      },
      matchData: {
        currentInning,
        ballByBall: currentBallByBall,
        lastBall: currentBallByBall[currentBallByBall.length - 1],
      },
    };
    onScoreUpdate(scoreData);
  };

  // Helper functions to fix race conditions and team mapping issues
  
  // Get current batting team name based on match setup, not just inning number
  const getCurrentBattingTeamName = () => {
    // In cricket, team1 bats first only if they won toss and chose to bat, or lost toss and opponent chose to field
    // For simplicity, we'll determine from the match data structure or current state
    const matchData = match.matchData as any;
    
    // If match has explicit team/toss info, use it
    if (matchData?.tossWinner && matchData?.tossDecision) {
      const tossWinner = matchData.tossWinner;
      const tossDecision = matchData.tossDecision; // 'bat' or 'bowl'
      
      if (currentInning === 1) {
        // First innings: if toss winner chose to bat, they bat first; if they chose to bowl, opponent bats first
        return tossDecision === 'bat' ? 
          (tossWinner === 'team1' ? (match.team1Name || 'Team 1') : (match.team2Name || 'Team 2')) :
          (tossWinner === 'team1' ? (match.team2Name || 'Team 2') : (match.team1Name || 'Team 1'));
      } else {
        // Second innings: opposite team bats
        const firstInningsBattingTeam = tossDecision === 'bat' ? 
          (tossWinner === 'team1' ? (match.team1Name || 'Team 1') : (match.team2Name || 'Team 2')) :
          (tossWinner === 'team1' ? (match.team2Name || 'Team 2') : (match.team1Name || 'Team 1'));
        return firstInningsBattingTeam === (match.team1Name || 'Team 1') ? 
          (match.team2Name || 'Team 2') : (match.team1Name || 'Team 1');
      }
    }
    
    // Fallback: check which team has been scoring in current inning based on actual score changes
    // If team1 score is changing in this inning, they're batting
    if (currentInning === 1) {
      return match.team1Name || 'Team 1'; // Default assumption for first inning
    } else {
      return match.team2Name || 'Team 2'; // Default assumption for second inning
    }
  };
  
  // Get current batting team ID
  const getCurrentBattingTeamId = () => {
    const matchData = match.matchData as any;
    const battingTeamName = getCurrentBattingTeamName();
    
    // Return corresponding team ID
    if (battingTeamName === (match.team1Name || 'Team 1')) {
      return matchData?.team1Id || 'team1';
    } else {
      return matchData?.team2Id || 'team2';
    }
  };
  
  // Get current inning stats without state dependency
  const getCurrentInningRuns = () => {
    const battingTeamName = getCurrentBattingTeamName();
    return battingTeamName === (match.team1Name || 'Team 1') ? team1Runs : team2Runs;
  };
  
  const getCurrentInningWickets = () => {
    const battingTeamName = getCurrentBattingTeamName();
    return battingTeamName === (match.team1Name || 'Team 1') ? team1Wickets : team2Wickets;
  };
  
  const getCurrentInningBalls = () => {
    const battingTeamName = getCurrentBattingTeamName();
    return battingTeamName === (match.team1Name || 'Team 1') ? team1Balls : team2Balls;
  };
  
  // Get final team stats using correct team mapping
  const getTeamFinalRuns = (teamKey: 'team1' | 'team2') => {
    return teamKey === 'team1' ? team1Runs : team2Runs;
  };
  
  const getTeamFinalWickets = (teamKey: 'team1' | 'team2') => {
    return teamKey === 'team1' ? team1Wickets : team2Wickets;
  };
  
  const getTeamId = (teamKey: 'team1' | 'team2') => {
    const matchData = match.matchData as any;
    return teamKey === 'team1' ? (matchData?.team1Id || 'team1') : (matchData?.team2Id || 'team2');
  };
  
  // Helper function to find player ID from roster by name
  const findPlayerIdByName = (playerName: string): string => {
    const player = rosterPlayers.find((p: any) => 
      (p.name === playerName || p.playerName === playerName)
    );
    return player?.id || playerName; // Fallback to name if ID not found
  };

  // Build scorecard in format expected by backend scorecardUpdateSchema
  const buildProperScorecardFormat = (allInnings: any[]) => {
    const team1Innings: any[] = [];
    const team2Innings: any[] = [];
    
    allInnings.forEach(inning => {
      const battingTeamId = inning.battingTeamId || (inning.battingTeam === (match.team1Name || 'Team 1') ? 'team1' : 'team2');
      
      const innings = {
        inningsNumber: inning.inningNumber,
        battingTeamId,
        totalRuns: inning.score.runs,
        totalWickets: inning.score.wickets,
        totalOvers: parseFloat(inning.score.overs) || 0,
        runRate: inning.score.runs / (parseFloat(inning.score.overs) || 1),
        extras: {
          wides: 0, // These would need to be tracked separately in a full implementation
          noBalls: 0,
          byes: 0,
          legByes: 0,
          penalties: 0,
        },
        batsmen: (inning.batsmen || []).map((batsman: any) => ({
          playerId: findPlayerIdByName(batsman.name || ''), // Use proper player ID from roster
          runsScored: batsman.runs || 0,
          ballsFaced: batsman.balls || 0,
          fours: batsman.fours || 0,
          sixes: batsman.sixes || 0,
          strikeRate: batsman.strikeRate || 0,
          dismissalType: batsman.isDismissed ? (batsman.dismissalType || 'not-out') : 'not-out',
          bowlerOut: batsman.bowlerOut,
          fielderOut: batsman.fielderOut,
        })),
        bowlers: (inning.bowlers || []).map((bowler: any) => ({
          playerId: findPlayerIdByName(bowler.name || ''), // Use proper player ID from roster
          overs: parseFloat(bowler.oversBowled) || 0,
          maidens: bowler.maidenOvers || 0,
          runsGiven: bowler.runsConceded || 0,
          wickets: bowler.wickets || 0,
          economy: bowler.economyRate || 0,
          wides: 0, // These would need to be tracked separately
          noBalls: 0,
        })),
        ballByBall: [], // Optional field, skip for now due to complexity
      };
      
      // Assign to correct team array based on battingTeamId
      if (battingTeamId === getTeamId('team1')) {
        team1Innings.push(innings);
      } else {
        team2Innings.push(innings);
      }
    });
    
    return {
      team1Innings,
      team2Innings,
    };
  };
  
  // Proper cache invalidation with correct query keys
  const invalidateMatchQueries = () => {
    // Invalidate core match queries
    queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
    queryClient.invalidateQueries({ queryKey: ['/api/matches', match.id] });
    
    // Invalidate team-specific queries if team IDs are available
    const team1Id = getTeamId('team1');
    const team2Id = getTeamId('team2');
    
    if (team1Id && team1Id !== 'team1') {
      queryClient.invalidateQueries({ queryKey: ['/api/teams', team1Id] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', team1Id, 'matches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', team1Id, 'stats'] });
    }
    if (team2Id && team2Id !== 'team2') {
      queryClient.invalidateQueries({ queryKey: ['/api/teams', team2Id] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', team2Id, 'matches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', team2Id, 'stats'] });
    }
    
    // Invalidate player-specific queries for all players in the match
    const allPlayers = getAllPlayers();
    allPlayers.forEach(player => {
      const playerId = player.id;
      if (playerId) {
        // Invalidate player profile data (includes career stats)
        queryClient.invalidateQueries({ queryKey: ['/api/players', playerId] });
        // Invalidate player match history  
        queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'matches'] });
        // Invalidate player performances
        queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'performances'] });
      }
    });
    
    // Invalidate all players queries (for team rosters, etc.)
    queryClient.invalidateQueries({ queryKey: ['/api/players'] });
    
    // Invalidate user-specific queries
    queryClient.invalidateQueries({ queryKey: ['/api/matches', 'user'] });
    queryClient.invalidateQueries({ queryKey: ['/api/matches', 'history'] });
  };

  // Handle saving player profiles to MongoDB with match statistics
  const handleSavePlayerProfiles = async () => {
    if (!isMatchCompleted || !matchResult) {
      toast({
        title: "Match Not Complete",
        description: "Please complete the match before saving player profiles.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPlayerProfiles(true);

    try {
      // Prepare player statistics for saving
      const allPlayers = getAllPlayers();
      const playerStats = [];

      // Process batting statistics
      for (const batter of battingStats) {
        const player = allPlayers.find(p => (p.name || p.playerName) === batter.name);
        if (player && player.id) {
          playerStats.push({
            playerId: player.id,
            teamId: player.teamId || (player.team === 'team1' ? getTeamId('team1') : getTeamId('team2')),
            runsScored: batter.runs,
            ballsFaced: batter.balls,
            fours: batter.fours,
            sixes: batter.sixes,
            isOut: batter.isDismissed,
            dismissalType: batter.dismissalType,
            manOfMatch: manOfMatchSelected && selectedManOfMatch === batter.name
          });
        } else if (player && !player.id) {
          console.warn(`⚠️ Skipping player ${batter.name} - missing player ID in roster`);
        }
      }

      // Process bowling statistics
      for (const bowler of bowlingStats) {
        const player = allPlayers.find(p => (p.name || p.playerName) === bowler.name);
        if (player && player.id) {
          const existingPlayerIndex: number = playerStats.findIndex(p => p.playerId === player.id);
          if (existingPlayerIndex >= 0) {
            // Update existing player stats with bowling info
            playerStats[existingPlayerIndex] = {
              ...playerStats[existingPlayerIndex],
              oversBowled: bowler.overs,
              runsGiven: bowler.runsConceded,
              wicketsTaken: bowler.wickets,
              maidens: bowler.maidenOvers
            };
          } else {
            // Add new player with bowling stats only
            playerStats.push({
              playerId: player.id,
              teamId: player.teamId || (player.team === 'team1' ? getTeamId('team1') : getTeamId('team2')),
              oversBowled: bowler.overs,
              runsGiven: bowler.runsConceded,
              wicketsTaken: bowler.wickets,
              maidens: bowler.maidenOvers,
              manOfMatch: manOfMatchSelected && selectedManOfMatch === bowler.name
            });
          }
        } else if (player && !player.id) {
          console.warn(`⚠️ Skipping player ${bowler.name} - missing player ID in roster`);
        }
      }

      // Save player profiles via API
      const response = await apiRequest('POST', `/api/matches/${match.id}/save-player-profiles`, {
        playerStats
      });

      if (response.ok) {
        const responseData = await response.json();
        setIsPlayerProfilesSaved(true);
        toast({
          title: "✅ Player Profiles Saved!",
          description: `Successfully updated career statistics for ${playerStats.length} players.`,
          duration: 6000,
        });
        
        // Invalidate player caches for immediate profile updates
        if (responseData.cacheInvalidation?.players) {
          responseData.cacheInvalidation.players.forEach((playerId: string) => {
            queryClient.invalidateQueries({ queryKey: ['/api/players', playerId] });
            queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'stats'] });
            queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'performances'] });
            queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'matches'] });
          });
        }
        queryClient.invalidateQueries({ queryKey: ['/api/players'] });
        
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save player profiles');
      }

    } catch (error: any) {
      console.error('Error saving player profiles:', error);
      toast({
        title: "❌ Save Player Profiles Failed",
        description: "Failed to save player profiles. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSavingPlayerProfiles(false);
    }
  };

  // Handle saving match to MongoDB with complete scorecard and stats
  const handleSaveMatch = async () => {
    if (!isMatchCompleted || !matchResult) {
      toast({
        title: "Match Not Complete",
        description: "Please complete the match before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingMatch(true);

    try {
      // Build complete innings data synchronously without setState dependencies
      const currentInningsData = {
        inningNumber: currentInning,
        battingTeam: getCurrentBattingTeamName(), // Use helper function for correct team mapping
        battingTeamId: getCurrentBattingTeamId(), // Get actual team ID
        score: {
          runs: getCurrentInningRuns(),
          wickets: getCurrentInningWickets(), 
          overs: `${Math.floor(getCurrentInningBalls() / 6)}.${getCurrentInningBalls() % 6}`,
          ballsFaced: getCurrentInningBalls()
        },
        batsmen: [...battingStats],
        bowlers: [...bowlingStats],
        ballByBall: [...ballByBall]
      };

      // Merge current innings with persisted innings data
      const allInnings = [...inningsData];
      const existingInningIndex = allInnings.findIndex(data => data.inningNumber === currentInning);
      
      if (existingInningIndex >= 0) {
        // Replace existing entry with current data
        allInnings[existingInningIndex] = currentInningsData;
      } else {
        // Add new innings data
        allInnings.push(currentInningsData);
      }

      // Sort innings by inning number
      allInnings.sort((a, b) => a.inningNumber - b.inningNumber);

      // Build scorecard in the format expected by backend schema
      const finalScorecard = buildProperScorecardFormat(allInnings);

      // Determine match winner using correct team mapping
      let winnerId: string | undefined;
      let resultType: "won-by-runs" | "won-by-wickets" | "tied" | "no-result" | "abandoned" = "no-result";
      let marginRuns: number | undefined;
      let marginWickets: number | undefined;

      const team1FinalRuns = getTeamFinalRuns('team1');
      const team2FinalRuns = getTeamFinalRuns('team2');
      const team1FinalWickets = getTeamFinalWickets('team1'); 
      const team2FinalWickets = getTeamFinalWickets('team2');

      if (team1FinalRuns > team2FinalRuns) {
        winnerId = getTeamId('team1');
        resultType = "won-by-runs";
        marginRuns = team1FinalRuns - team2FinalRuns;
      } else if (team2FinalRuns > team1FinalRuns) {
        winnerId = getTeamId('team2');
        resultType = "won-by-wickets";
        marginWickets = 10 - team2FinalWickets;
      } else {
        resultType = "tied";
      }

      // Prepare match completion data
      const completionData = {
        matchId: match.id,
        finalScorecard,
        awards: manOfMatchSelected && selectedManOfMatch ? {
          manOfTheMatch: getAllPlayers().find(p => (p.name || p.playerName) === selectedManOfMatch)?.id
        } : undefined,
        resultSummary: {
          winnerId,
          resultType,
          marginRuns,
          marginWickets
        }
      };

      // Save match to MongoDB
      const response = await apiRequest('POST', `/api/matches/${match.id}/complete`, completionData);

      if (response.ok) {
        const responseData = await response.json();
        
        // Handle already processed matches
        if (responseData.alreadyProcessed) {
          setIsMatchSaved(true);
          toast({
            title: "✅ Match Already Saved",
            description: "This match has already been saved to the database.",
            duration: 4000,
          });
        } else {
          setIsMatchSaved(true);
          toast({
            title: "✅ Match Saved Successfully!",
            description: "Full match scorecard and stats saved to database. Check Match History for updated records.",
            duration: 6000,
          });
        }

        // Invalidate queries to refresh data in real-time with proper keys
        invalidateMatchQueries();
        
        // Invalidate player and team caches for immediate profile updates
        if (responseData.cacheInvalidation) {
          console.log('🔄 Invalidating caches for:', responseData.cacheInvalidation);
          
          // Invalidate player caches
          responseData.cacheInvalidation.players?.forEach((playerId: string) => {
            queryClient.invalidateQueries({ queryKey: ['/api/players', playerId] });
            queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'matches'] });
            queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'stats'] });
            queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'performances'] });
          });
          
          // Invalidate team caches
          responseData.cacheInvalidation.teams?.forEach((teamId: string) => {
            queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId] });
            queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId, 'stats'] });
            queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId, 'players'] });
          });
          
          // Invalidate general player and team lists
          queryClient.invalidateQueries({ queryKey: ['/api/players'] });
          queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
        }
        
      } else if (response.status === 401 || response.status === 403) {
        // Handle authentication/authorization errors
        throw new Error('You are not authorized to save this match. Please check your permissions or try logging in again.');
      } else if (response.status === 409) {
        // Handle conflict (match already completed)
        setIsMatchSaved(true);
        toast({
          title: "✅ Match Already Saved",
          description: "This match has already been completed and saved.",
          duration: 4000,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save match');
      }

    } catch (error: any) {
      console.error('Error saving match:', error);
      
      let errorMessage = "Failed to save match to database. Please try again.";
      
      // Provide specific guidance based on error type
      if (error.message && error.message.includes('authorized')) {
        errorMessage = "You are not authorized to save this match. Please check your permissions.";
      } else if (error.message && error.message.includes('network')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.message && error.message.includes('validation')) {
        errorMessage = "Invalid match data. Please ensure all required information is complete.";
      }
      
      toast({
        title: "❌ Save Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSavingMatch(false);
    }
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
                <div className="mt-2 space-y-2">
                  <Badge variant="default" className="bg-green-600">
                    Overs: {currentOver}.{currentBall}
                  </Badge>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                      🎯 Target: {team1Runs + 1}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Need {Math.max(0, team1Runs + 1 - team2Runs)} runs
                    </p>
                  </div>
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
                        className={
                          player.isDismissed 
                            ? "bg-red-50 dark:bg-red-900/20 opacity-75" 
                            : currentStriker === player.name 
                            ? "bg-blue-50 dark:bg-blue-900/20" 
                            : ""
                        }
                        data-testid={`batting-row-${player.name.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <TableCell className="font-medium">
                          {player.name}
                          {player.isDismissed && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Out
                            </Badge>
                          )}
                          {currentStriker === player.name && !player.isDismissed && (
                            <Badge variant="default" className="ml-2 text-xs bg-blue-600">
                              Striker
                            </Badge>
                          )}
                          {currentNonStriker === player.name && !player.isDismissed && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Non-Striker
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
                        disabled={isMatchCompleted}
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
                    disabled={isMatchCompleted}
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
                      disabled={isMatchCompleted}
                      data-testid="button-wide"
                      className="border-orange-300 hover:bg-orange-50"
                    >
                      Wide
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => openExtrasDialog('no-ball')}
                      disabled={isMatchCompleted}
                      data-testid="button-no-ball"
                      className="border-orange-300 hover:bg-orange-50"
                    >
                      No Ball
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => openExtrasDialog('bye')}
                      disabled={isMatchCompleted}
                      data-testid="button-bye"
                      className="border-orange-300 hover:bg-orange-50"
                    >
                      Bye
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => openExtrasDialog('leg-bye')}
                      disabled={isMatchCompleted}
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
                    
                    {/* Manual Second Innings Button - shows when first innings is complete */}
                    {showManualSecondInningsButton && firstInningsComplete && (
                      <Button 
                        onClick={handleManualSecondInningsStart}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold mb-3"
                        data-testid="button-start-second-innings"
                        size="lg"
                      >
                        🏏 Start Second Innings
                      </Button>
                    )}
                    
                    {/* Regular switch innings button */}
                    {!showManualSecondInningsButton && (
                      <Button 
                        onClick={switchInnings}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        data-testid="button-switch-innings"
                        size="lg"
                      >
                        🏆 End Inning 1 / Start Inning 2
                      </Button>
                    )}
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

      {/* Team Batting and Bowling Statistics Sections */}
      {isLive && (
        <div className="space-y-6">
          {/* Team A (Team 1) Batting Statistics */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-800/10 border-2 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                🏏 {match.team1Name || "Team A"} - Batting Statistics
                <Badge variant="outline" className="ml-auto">
                  {team1Runs}/{team1Wickets} ({Math.floor(team1Balls / 6)}.{team1Balls % 6} overs)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Batsman</TableHead>
                    <TableHead className="text-center font-semibold">Runs</TableHead>
                    <TableHead className="text-center font-semibold">Balls</TableHead>
                    <TableHead className="text-center font-semibold">Dots</TableHead>
                    <TableHead className="text-center font-semibold">4s</TableHead>
                    <TableHead className="text-center font-semibold">6s</TableHead>
                    <TableHead className="text-center font-semibold">Strike Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentInning === 1 && battingStats.length > 0 ? (
                    battingStats.map((player, index) => (
                      <TableRow 
                        key={index} 
                        className={
                          player.isDismissed 
                            ? "bg-red-50 dark:bg-red-900/20 opacity-75" 
                            : currentStriker === player.name 
                            ? "bg-blue-100 dark:bg-blue-900/30" 
                            : ""
                        }
                        data-testid={`team1-batting-row-${player.name.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <TableCell className="font-medium">
                          {player.name}
                          {player.isDismissed && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Out
                            </Badge>
                          )}
                          {currentStriker === player.name && !player.isDismissed && (
                            <Badge variant="default" className="ml-2 text-xs bg-blue-600">
                              Striker
                            </Badge>
                          )}
                          {currentNonStriker === player.name && !player.isDismissed && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Non-Striker
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-green-600">{player.runs}</TableCell>
                        <TableCell className="text-center">{player.balls}</TableCell>
                        <TableCell className="text-center text-gray-600">{player.dots}</TableCell>
                        <TableCell className="text-center text-blue-600 font-semibold">{player.fours}</TableCell>
                        <TableCell className="text-center text-yellow-600 font-semibold">{player.sixes}</TableCell>
                        <TableCell className="text-center font-medium">{player.strikeRate.toFixed(1)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                        {currentInning === 1 ? "No batting statistics yet" : "Team completed batting"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Team B (Team 2) Batting Statistics */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/10 border-2 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                🏏 {match.team2Name || "Team B"} - Batting Statistics
                <Badge variant="outline" className="ml-auto">
                  {team2Runs}/{team2Wickets} ({Math.floor(team2Balls / 6)}.{team2Balls % 6} overs)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Batsman</TableHead>
                    <TableHead className="text-center font-semibold">Runs</TableHead>
                    <TableHead className="text-center font-semibold">Balls</TableHead>
                    <TableHead className="text-center font-semibold">Dots</TableHead>
                    <TableHead className="text-center font-semibold">4s</TableHead>
                    <TableHead className="text-center font-semibold">6s</TableHead>
                    <TableHead className="text-center font-semibold">Strike Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentInning === 2 && battingStats.length > 0 ? (
                    battingStats.map((player, index) => (
                      <TableRow 
                        key={index} 
                        className={
                          player.isDismissed 
                            ? "bg-red-50 dark:bg-red-900/20 opacity-75" 
                            : currentStriker === player.name 
                            ? "bg-green-100 dark:bg-green-900/30" 
                            : ""
                        }
                        data-testid={`team2-batting-row-${player.name.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <TableCell className="font-medium">
                          {player.name}
                          {player.isDismissed && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Out
                            </Badge>
                          )}
                          {currentStriker === player.name && !player.isDismissed && (
                            <Badge variant="default" className="ml-2 text-xs bg-green-600">
                              Striker
                            </Badge>
                          )}
                          {currentNonStriker === player.name && !player.isDismissed && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Non-Striker
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-green-600">{player.runs}</TableCell>
                        <TableCell className="text-center">{player.balls}</TableCell>
                        <TableCell className="text-center text-gray-600">{player.dots}</TableCell>
                        <TableCell className="text-center text-blue-600 font-semibold">{player.fours}</TableCell>
                        <TableCell className="text-center text-yellow-600 font-semibold">{player.sixes}</TableCell>
                        <TableCell className="text-center font-medium">{player.strikeRate.toFixed(1)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                        {currentInning === 2 ? "No batting statistics yet" : "Team has not batted yet"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Team A (Team 1) Bowling Statistics */}
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/10 dark:to-orange-800/10 border-2 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                ⚡ {match.team1Name || "Team A"} - Bowling Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Bowler</TableHead>
                    <TableHead className="text-center font-semibold">Overs</TableHead>
                    <TableHead className="text-center font-semibold">Wickets</TableHead>
                    <TableHead className="text-center font-semibold">Runs</TableHead>
                    <TableHead className="text-center font-semibold">Maiden</TableHead>
                    <TableHead className="text-center font-semibold">Economy</TableHead>
                    <TableHead className="text-center font-semibold">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentInning === 2 && bowlingStats.length > 0 ? (
                    bowlingStats.map((player, index) => (
                      <TableRow 
                        key={index}
                        className={currentBowler === player.name ? "bg-orange-100 dark:bg-orange-900/30" : ""}
                        data-testid={`team1-bowling-row-${player.name.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <TableCell className="font-medium">
                          {player.name}
                          {currentBowler === player.name && (
                            <Badge variant="default" className="ml-2 text-xs bg-orange-600">
                              Bowling
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{player.oversBowled}</TableCell>
                        <TableCell className="text-center font-semibold text-red-600">{player.wickets}</TableCell>
                        <TableCell className="text-center">{player.runsConceded}</TableCell>
                        <TableCell className="text-center">{player.maidenOvers}</TableCell>
                        <TableCell className="text-center font-medium">{player.economyRate.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{player.bowlingAverage > 0 ? player.bowlingAverage.toFixed(2) : '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                        {currentInning === 2 ? "No bowling statistics yet" : "Team has not bowled yet"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Team B (Team 2) Bowling Statistics */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-800/10 border-2 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                ⚡ {match.team2Name || "Team B"} - Bowling Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Bowler</TableHead>
                    <TableHead className="text-center font-semibold">Overs</TableHead>
                    <TableHead className="text-center font-semibold">Wickets</TableHead>
                    <TableHead className="text-center font-semibold">Runs</TableHead>
                    <TableHead className="text-center font-semibold">Maiden</TableHead>
                    <TableHead className="text-center font-semibold">Economy</TableHead>
                    <TableHead className="text-center font-semibold">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentInning === 1 && bowlingStats.length > 0 ? (
                    bowlingStats.map((player, index) => (
                      <TableRow 
                        key={index}
                        className={currentBowler === player.name ? "bg-purple-100 dark:bg-purple-900/30" : ""}
                        data-testid={`team2-bowling-row-${player.name.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <TableCell className="font-medium">
                          {player.name}
                          {currentBowler === player.name && (
                            <Badge variant="default" className="ml-2 text-xs bg-purple-600">
                              Bowling
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{player.oversBowled}</TableCell>
                        <TableCell className="text-center font-semibold text-red-600">{player.wickets}</TableCell>
                        <TableCell className="text-center">{player.runsConceded}</TableCell>
                        <TableCell className="text-center">{player.maidenOvers}</TableCell>
                        <TableCell className="text-center font-medium">{player.economyRate.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{player.bowlingAverage > 0 ? player.bowlingAverage.toFixed(2) : '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                        {currentInning === 1 ? "No bowling statistics yet" : "Team has completed bowling"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
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
              
              {/* Combination Wicket Types */}
              <div className="border-t pt-4">
                <Label className="font-medium text-blue-700 mb-3 block">Extras + Wicket Combinations:</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => setSelectedWicketType('wide-wicket')} 
                    variant={selectedWicketType === 'wide-wicket' ? 'default' : 'outline'}
                    data-testid="button-wide-wicket"
                    className="bg-blue-50 hover:bg-blue-100 text-xs"
                  >
                    Wide + Wicket
                  </Button>
                  <Button 
                    onClick={() => setSelectedWicketType('no-ball-wicket')} 
                    variant={selectedWicketType === 'no-ball-wicket' ? 'default' : 'outline'}
                    data-testid="button-no-ball-wicket"
                    className="bg-blue-50 hover:bg-blue-100 text-xs"
                  >
                    No Ball + Wicket
                  </Button>
                  <Button 
                    onClick={() => setSelectedWicketType('leg-bye-wicket')} 
                    variant={selectedWicketType === 'leg-bye-wicket' ? 'default' : 'outline'}
                    data-testid="button-leg-bye-wicket"
                    className="bg-blue-50 hover:bg-blue-100 text-xs"
                  >
                    Leg Bye + Wicket
                  </Button>
                  <Button 
                    onClick={() => setSelectedWicketType('bye-wicket')} 
                    variant={selectedWicketType === 'bye-wicket' ? 'default' : 'outline'}
                    data-testid="button-bye-wicket"
                    className="bg-blue-50 hover:bg-blue-100 text-xs"
                  >
                    Bye + Wicket
                  </Button>
                </div>
              </div>
            </div>

            {/* Runs Conceded Input (for combination wickets) */}
            {['wide-wicket', 'no-ball-wicket', 'leg-bye-wicket', 'bye-wicket'].includes(selectedWicketType || '') && (
              <div className="space-y-2">
                <Label htmlFor="extra-runs" className="font-medium">
                  Runs Conceded:
                </Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="10"
                  value={extraRuns} 
                  onChange={(e) => setExtraRuns(Number(e.target.value))}
                  placeholder="Enter runs conceded"
                  data-testid="input-extra-runs"
                  className="w-full"
                />
                <p className="text-xs text-gray-600">Total runs scored from this delivery (including the extra)</p>
              </div>
            )}

            {/* Fielder Name Input (for caught and run-out) */}
            {(selectedWicketType === 'caught' || selectedWicketType === 'run-out') && (
              <div className="space-y-2">
                <Label htmlFor="fielder-name" className="font-medium">
                  Fielder Name:
                </Label>
                <div className="flex gap-2">
                  <Select value={fielderName} onValueChange={setFielderName}>
                    <SelectTrigger className="flex-1" data-testid="select-fielder-name">
                      <SelectValue placeholder="Select fielder" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFieldingRoster().map((player: any, index: number) => (
                        <SelectItem key={player.id || `fielder-${index}`} value={player.name || player.playerName}>
                          {player.name || player.playerName}
                          {player.role && player.role !== 'player' && (
                            <span className="ml-2 text-xs text-muted-foreground">({player.role})</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="fielder-name"
                    value={fielderName}
                    onChange={(e) => setFielderName(e.target.value)}
                    placeholder="Or type name"
                    data-testid="input-fielder-name"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Select from dropdown or type manually
                </p>
              </div>
            )}

            {/* Who is Out Selection (Run-out only) */}
            {selectedWicketType === 'run-out' && (
              <div className="space-y-2">
                <Label className="font-medium">Who is Out:</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={dismissedBatter === 'striker' ? 'default' : 'outline'}
                    onClick={() => setDismissedBatter('striker')}
                    className="flex-1"
                    data-testid="button-striker-out"
                  >
                    Striker ({currentStriker})
                  </Button>
                  <Button
                    type="button"
                    variant={dismissedBatter === 'non-striker' ? 'default' : 'outline'}
                    onClick={() => setDismissedBatter('non-striker')}
                    className="flex-1"
                    data-testid="button-non-striker-out"
                  >
                    Non-Striker ({currentNonStriker})
                  </Button>
                </div>
              </div>
            )}

            {/* Next Batsman Input */}
            {selectedWicketType && (
              <div className="space-y-3">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    {selectedWicketType === 'run-out' 
                      ? `${dismissedBatter === 'striker' ? currentStriker : currentNonStriker} is out!`
                      : `${currentStriker} is out!`
                    }
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Select the name of the next batsman to replace the dismissed player.
                  </p>
                  {rosterPlayers.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      📝 Using generic batsman names (roster data not available)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next-batsman" className="font-medium">
                    Next Batsman Name:
                  </Label>
                  <div className="flex gap-2">
                    <Select value={nextBatsman} onValueChange={setNextBatsman}>
                      <SelectTrigger className="flex-1" data-testid="select-next-batsman">
                        <SelectValue placeholder="Select next batsman" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Available team players using improved team filtering */}
                        {getBattingRoster().filter((player: any) => {
                          const playerName = player.name || player.playerName;
                          return playerName !== currentStriker && 
                                 playerName !== currentNonStriker &&
                                 !dismissedPlayers.has(playerName);
                        }).map((player: any, index: number) => (
                          <SelectItem key={player.id || `replacement-${index}`} value={player.name || player.playerName}>
                            {player.name || player.playerName}
                            {player.role && player.role !== 'player' && (
                              <span className="ml-2 text-xs text-muted-foreground">({player.role})</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="next-batsman-manual"
                      value={nextBatsman}
                      onChange={(e) => setNextBatsman(e.target.value)}
                      placeholder="Or type name"
                      data-testid="input-next-batsman-manual"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select from dropdown or type manually
                    {rosterPlayers.length === 0 && " (using fallback names)"}
                  </p>
                </div>
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
                  onClick={() => {
                    if (!nextBatsman.trim()) {
                      toast({
                        title: "Next Batsman Required",
                        description: "Please enter the name of the next batsman before confirming the wicket.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Validate next batsman is from batting team
                    const battingRoster = getBattingRoster();
                    const batsmanInRoster = battingRoster.some((player: any) => 
                      (player.name || player.playerName) === nextBatsman.trim()
                    );
                    
                    if (!batsmanInRoster) {
                      toast({
                        title: "Invalid Selection",
                        description: "Selected batsman is not from the batting team roster.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Validate next batsman is not currently playing
                    if (nextBatsman.trim() === currentStriker || nextBatsman.trim() === currentNonStriker) {
                      toast({
                        title: "Invalid Selection",
                        description: "Selected batsman is already playing. Choose a different player.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Validate next batsman is not already dismissed
                    if (dismissedPlayers.has(nextBatsman.trim())) {
                      toast({
                        title: "Invalid Selection",
                        description: "Selected batsman is already out. Choose an active player.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    addWicket(
                      selectedWicketType, 
                      fielderName || undefined, 
                      nextBatsman.trim(),
                      selectedWicketType === 'run-out' ? dismissedBatter : undefined,
                      ['wide-wicket', 'no-ball-wicket', 'leg-bye-wicket', 'bye-wicket'].includes(selectedWicketType) ? extraRuns : undefined
                    );
                    // Close dialog after wicket is recorded
                    setShowWicketDialog(false);
                  }}
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

      {/* Next Bowler Selection Dialog */}
      <Dialog open={showBowlerDialog} onOpenChange={setShowBowlerDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎳 Select Next Bowler - Over {currentOver}
            </DialogTitle>
            <DialogDescription>
              Choose who will bowl the next over. The previous bowler cannot bowl consecutive overs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Over completion info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Over {currentOver > 1 ? currentOver - 1 : 1} completed by {lastOverBowlerByInning[currentInning]}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Select next bowler for Over {currentOver}. No bowling quota restrictions.
              </p>
              {rosterPlayers.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  📝 Using generic bowler names (roster data not available)
                </p>
              )}
            </div>

            {/* Eligible bowlers dropdown */}
            <div className="space-y-2">
              <Label htmlFor="next-bowler" className="font-medium">
                Next Bowler:
              </Label>
              <Select value={selectedNextBowler} onValueChange={setSelectedNextBowler}>
                <SelectTrigger className="w-full" data-testid="select-next-bowler">
                  <SelectValue placeholder="Select next bowler" />
                </SelectTrigger>
                <SelectContent>
                  {getFieldingRoster().map((player: any) => {
                    const playerName = player.name || player.playerName;
                    const isEligible = eligibleBowlers.includes(playerName);
                    const restrictionReason = getBowlerRestrictionReason(playerName, currentBowler);
                    const oversBowled = getOversBowled(playerName);
                    
                    return (
                      <SelectItem 
                        key={player.id || `bowler-${playerName}`} 
                        value={playerName}
                        disabled={!isEligible}
                        data-testid={`bowler-option-${playerName.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-col">
                            <span>{playerName}</span>
                            {player.role && player.role !== 'player' && (
                              <span className="text-xs text-muted-foreground">({player.role})</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground ml-2 flex flex-col items-end">
                            {oversBowled > 0 && <span>({oversBowled} overs)</span>}
                            {!isEligible && restrictionReason && (
                              <span className="text-red-500 text-xs">Restricted</span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {eligibleBowlers.length === 0 && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  ⚠️ No eligible bowlers available! Previous bowler cannot bowl consecutive overs.
                  {rosterPlayers.length === 0 && " (Using fallback bowler names)"}
                </p>
              )}
            </div>

            {/* Bowling stats summary */}
            {selectedNextBowler && (
              <div className="bg-gray-50 dark:bg-gray-900/20 p-3 rounded-lg border">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                  {selectedNextBowler} - Bowling Stats
                </p>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <p>Overs bowled this innings: {getOversBowled(selectedNextBowler)} (no limit)</p>
                  <p>Balls bowled: {getBallsBowled(selectedNextBowler)}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowBowlerDialog(false)}
                className="flex-1"
                data-testid="button-cancel-bowler"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!selectedNextBowler) {
                    toast({
                      title: "Bowler Required",
                      description: "Please select a bowler for the next over.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  // Validate bowler is from fielding team
                  const fieldingRoster = getFieldingRoster();
                  const bowlerInRoster = fieldingRoster.some((player: any) => 
                    (player.name || player.playerName) === selectedNextBowler
                  );
                  
                  if (!bowlerInRoster) {
                    toast({
                      title: "Invalid Selection",
                      description: "Selected bowler is not from the fielding team.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  if (!eligibleBowlers.includes(selectedNextBowler)) {
                    toast({
                      title: "Invalid Selection",
                      description: "Selected bowler cannot bowl consecutive overs.",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Set new bowler
                  setCurrentBowler(selectedNextBowler);
                  
                  // Add commentary
                  setBallByBall(prev => [...prev, `Over ${currentOver}: ${selectedNextBowler} to bowl`]);
                  
                  // Close dialog
                  setShowBowlerDialog(false);
                  
                  // Success message
                  toast({
                    title: "Bowler Selected",
                    description: `${selectedNextBowler} will bowl Over ${currentOver}`,
                    duration: 2000,
                  });
                }}
                disabled={!selectedNextBowler || !eligibleBowlers.includes(selectedNextBowler)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                data-testid="button-confirm-bowler"
              >
                Confirm Bowler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batsman Replacement Dialog */}
      <Dialog open={showReplacementDialog} onOpenChange={setShowReplacementDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🏏 Replace Batsman
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Replacement info */}
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                {replacingPlayer === 'striker' ? currentStriker : currentNonStriker} is already out and needs to be replaced
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Select a new batsman from the batting team to continue the innings
              </p>
              {rosterPlayers.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  📝 Using generic batsman names (roster data not available)
                </p>
              )}
            </div>

            {/* Available batsmen dropdown */}
            <div className="space-y-2">
              <Label htmlFor="replacement-batsman" className="font-medium">
                New {replacingPlayer === 'striker' ? 'Striker' : 'Non-Striker'}:
              </Label>
              <Select value={selectedReplacement} onValueChange={setSelectedReplacement}>
                <SelectTrigger className="w-full" data-testid="select-replacement-batsman">
                  <SelectValue placeholder="Select replacement batsman" />
                </SelectTrigger>
                <SelectContent>
                  {getBattingRoster().map((player: any) => {
                    const playerName = player.name || player.playerName;
                    const isAlreadyPlaying = playerName === currentStriker || playerName === currentNonStriker;
                    const isAlreadyOut = dismissedPlayers.has(playerName);
                    const isAvailable = !isAlreadyPlaying && !isAlreadyOut;
                    
                    return (
                      <SelectItem 
                        key={player.id || playerName} 
                        value={playerName}
                        disabled={!isAvailable}
                        data-testid={`replacement-option-${playerName.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-col">
                            <span>{playerName}</span>
                            {player.role && player.role !== 'player' && (
                              <span className="text-xs text-muted-foreground">({player.role})</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground ml-2">
                            {isAlreadyPlaying && <span className="text-blue-500">Playing</span>}
                            {isAlreadyOut && <span className="text-red-500">Out</span>}
                            {isAvailable && <span className="text-green-500">Available</span>}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {getBattingRoster().filter((player: any) => {
                const playerName = player.name || player.playerName;
                return !dismissedPlayers.has(playerName) && playerName !== currentStriker && playerName !== currentNonStriker;
              }).length === 0 && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  ⚠️ No available batsmen! All remaining players are either already playing or dismissed.
                  {rosterPlayers.length === 0 && " (Using fallback batsman names)"}
                </p>
              )}
            </div>

            {/* Replacement confirmation */}
            {selectedReplacement && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                  Replacement Ready
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {selectedReplacement} will replace {replacingPlayer === 'striker' ? currentStriker : currentNonStriker} as the {replacingPlayer}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowReplacementDialog(false)}
                className="flex-1"
                data-testid="button-cancel-replacement"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBatsmanReplacement}
                disabled={!selectedReplacement}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                data-testid="button-confirm-replacement"
              >
                Confirm Replacement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Second Innings Setup Dialog */}
      <Dialog open={showSecondInningsDialog} onOpenChange={setShowSecondInningsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🏆 Second Innings Setup
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* First innings summary */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                First Innings Complete: {match.team1Name || 'Team A'} scored {team1Runs}/{team1Wickets}
              </p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                🎯 Target: {team1Runs + 1} runs in {totalOvers} overs
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {match.team2Name || 'Team B'} needs {team1Runs + 1} runs to win
              </p>
            </div>

            {/* Player selections */}
            <div className="space-y-4">
              <p className="font-medium text-gray-800 dark:text-gray-200">
                Select opening batsmen and bowler for {match.team2Name || 'Team B'}:
              </p>
              
              {/* Striker selection */}
              <div className="space-y-2">
                <Label htmlFor="new-striker" className="font-medium">Opening Striker:</Label>
                <div className="flex gap-2">
                  <Select value={newStriker} onValueChange={setNewStriker}>
                    <SelectTrigger className="flex-1" data-testid="select-new-striker">
                      <SelectValue placeholder="Select opening striker" />
                    </SelectTrigger>
                    <SelectContent>
                      {getBattingRoster().map((player: any, index: number) => (
                        <SelectItem key={player.id || `striker-${index}`} value={player.name || player.playerName}>
                          {player.name || player.playerName}
                          {player.role && player.role !== 'player' && (
                            <span className="ml-2 text-xs text-muted-foreground">({player.role})</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={newStriker}
                    onChange={(e) => setNewStriker(e.target.value)}
                    placeholder="Or type name"
                    data-testid="input-new-striker"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Non-striker selection */}
              <div className="space-y-2">
                <Label htmlFor="new-non-striker" className="font-medium">Opening Non-Striker:</Label>
                <div className="flex gap-2">
                  <Select value={newNonStriker} onValueChange={setNewNonStriker}>
                    <SelectTrigger className="flex-1" data-testid="select-new-non-striker">
                      <SelectValue placeholder="Select opening non-striker" />
                    </SelectTrigger>
                    <SelectContent>
                      {getBattingRoster().filter((player: any) => {
                        const playerName = player.name || player.playerName;
                        return playerName !== newStriker;
                      }).map((player: any, index: number) => (
                        <SelectItem key={player.id || `non-striker-${index}`} value={player.name || player.playerName}>
                          {player.name || player.playerName}
                          {player.role && player.role !== 'player' && (
                            <span className="ml-2 text-xs text-muted-foreground">({player.role})</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={newNonStriker}
                    onChange={(e) => setNewNonStriker(e.target.value)}
                    placeholder="Or type name"
                    data-testid="input-new-non-striker"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Bowler selection */}
              <div className="space-y-2">
                <Label htmlFor="new-bowler" className="font-medium">First Bowler ({match.team1Name || 'Team A'}):</Label>
                <div className="flex gap-2">
                  <Select value={newBowler} onValueChange={setNewBowler}>
                    <SelectTrigger className="flex-1" data-testid="select-new-bowler">
                      <SelectValue placeholder="Select opening bowler" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFieldingRoster().map((player: any, index: number) => (
                        <SelectItem key={player.id || `bowler-${index}`} value={player.name || player.playerName}>
                          {player.name || player.playerName}
                          {player.role && player.role !== 'player' && (
                            <span className="ml-2 text-xs text-muted-foreground">({player.role})</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={newBowler}
                    onChange={(e) => setNewBowler(e.target.value)}
                    placeholder="Or type name"
                    data-testid="input-new-bowler"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowSecondInningsDialog(false)}
                className="flex-1"
                data-testid="button-cancel-second-innings"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!newStriker.trim() || !newNonStriker.trim() || !newBowler.trim()) {
                    toast({
                      title: "All Players Required",
                      description: "Please select all players before starting second innings.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  if (newStriker.trim() === newNonStriker.trim()) {
                    toast({
                      title: "Invalid Selection",
                      description: "Striker and non-striker must be different players.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  // Validate batsmen are from batting team (team2 in second innings)
                  const battingRoster = getBattingRoster();
                  const strikerInRoster = battingRoster.some((player: any) => 
                    (player.name || player.playerName) === newStriker.trim()
                  );
                  const nonStrikerInRoster = battingRoster.some((player: any) => 
                    (player.name || player.playerName) === newNonStriker.trim()
                  );
                  
                  if (!strikerInRoster || !nonStrikerInRoster) {
                    toast({
                      title: "Invalid Selection",
                      description: "Both batsmen must be from the batting team roster.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  // Validate bowler is from fielding team (team1 in second innings)
                  const fieldingRoster = getFieldingRoster();
                  const bowlerInRoster = fieldingRoster.some((player: any) => 
                    (player.name || player.playerName) === newBowler.trim()
                  );
                  
                  if (!bowlerInRoster) {
                    toast({
                      title: "Invalid Selection",
                      description: "Bowler must be from the fielding team roster.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  switchInnings();
                }}
                disabled={!newStriker.trim() || !newNonStriker.trim() || !newBowler.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="button-start-second-innings"
              >
                Start Second Innings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Man of the Match Selection Dialog */}
      <Dialog open={showManOfMatchDialog} onOpenChange={setShowManOfMatchDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🏆 Select Man of the Match
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Match result summary */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-lg font-bold text-yellow-900 dark:text-yellow-100 mb-2">
                {matchResult}
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">{match.team1Name || 'Team A'}</p>
                  <p>{team1Runs}/{team1Wickets} ({Math.floor(team1Balls / 6)}.{team1Balls % 6} overs)</p>
                </div>
                <div>
                  <p className="font-semibold">{match.team2Name || 'Team B'}</p>
                  <p>{team2Runs}/{team2Wickets} ({Math.floor(team2Balls / 6)}.{team2Balls % 6} overs)</p>
                </div>
              </div>
            </div>

            {/* Player selection */}
            <div className="space-y-4">
              <p className="font-medium text-gray-800 dark:text-gray-200">
                Select the Man of the Match:
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="man-of-match" className="font-medium">Player:</Label>
                <Select value={selectedManOfMatch} onValueChange={setSelectedManOfMatch}>
                  <SelectTrigger data-testid="select-man-of-match">
                    <SelectValue placeholder="Select Man of the Match" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllPlayers().map((player: any, index: number) => {
                      const playerName = player.name || player.playerName;
                      const teamName = player.team === 'team1' ? (match.team1Name || 'Team A') : (match.team2Name || 'Team B');
                      return (
                        <SelectItem key={player.id || `motm-${index}`} value={playerName}>
                          {playerName}
                          <span className="ml-2 text-xs text-muted-foreground">({teamName})</span>
                          {player.role && player.role !== 'player' && (
                            <span className="ml-1 text-xs text-muted-foreground">[{player.role}]</span>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  // Complete match without man of the match
                  setShowManOfMatchDialog(false);
                  setIsMatchCompleted(true);
                  setManOfMatchSelected(false);
                }}
                className="flex-1"
                data-testid="button-skip-man-of-match"
              >
                Skip Selection
              </Button>
              <Button 
                onClick={() => {
                  if (!selectedManOfMatch.trim()) {
                    toast({
                      title: "Player Required",
                      description: "Please select a player for Man of the Match.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  // Complete match with man of the match
                  setShowManOfMatchDialog(false);
                  setIsMatchCompleted(true);
                  setManOfMatchSelected(true);
                  
                  toast({
                    title: "🏆 Man of the Match",
                    description: `${selectedManOfMatch} selected as Man of the Match!`,
                    duration: 5000
                  });
                }}
                disabled={!selectedManOfMatch.trim()}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                data-testid="button-confirm-man-of-match"
              >
                Confirm Selection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Result Display */}
      {isMatchCompleted && matchResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-300 dark:border-yellow-700">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                🏆 Match Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {matchResult}
              </p>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Final Scores:</p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="font-semibold">{match.team1Name || 'Team A'}</p>
                    <p className="text-lg">{team1Runs}/{team1Wickets}</p>
                    <p className="text-xs text-gray-500">({Math.floor(team1Balls / 6)}.{team1Balls % 6} overs)</p>
                  </div>
                  <div>
                    <p className="font-semibold">{match.team2Name || 'Team B'}</p>
                    <p className="text-lg">{team2Runs}/{team2Wickets}</p>
                    <p className="text-xs text-gray-500">({Math.floor(team2Balls / 6)}.{team2Balls % 6} overs)</p>
                  </div>
                </div>
              </div>
              
              {/* Man of the Match Display or Selection Button */}
              {manOfMatchSelected && selectedManOfMatch ? (
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 p-4 rounded-lg border-2 border-yellow-400 dark:border-yellow-600">
                  <div className="text-center">
                    <p className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-1">
                      🏆 Man of the Match
                    </p>
                    <p className="text-xl font-extrabold text-orange-700 dark:text-orange-300">
                      {selectedManOfMatch}
                    </p>
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={() => setShowManOfMatchDialog(true)}
                  variant="outline"
                  className="w-full border-yellow-300 dark:border-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                  data-testid="button-select-man-of-match"
                >
                  🏆 Select Man of the Match (Optional)
                </Button>
              )}
              
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  {!isMatchSaved && (
                    <Button 
                      onClick={handleSaveMatch}
                      disabled={isSavingMatch}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      data-testid="button-save-match"
                    >
                      {isSavingMatch ? "Saving..." : "💾 Save Match"}
                    </Button>
                  )}
                  {!isPlayerProfilesSaved && (
                    <Button 
                      onClick={handleSavePlayerProfiles}
                      disabled={isSavingPlayerProfiles}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="button-save-player-profiles"
                    >
                      {isSavingPlayerProfiles ? "Saving..." : "👤 Save Player Profiles"}
                    </Button>
                  )}
                </div>
                <Button 
                  onClick={() => {
                    setIsMatchCompleted(false);
                    setMatchResult(null);
                    setSelectedManOfMatch('');
                    setManOfMatchSelected(false);
                    setIsMatchSaved(false);
                    setIsPlayerProfilesSaved(false);
                  }}
                  className="w-full"
                  variant={(isMatchSaved || isPlayerProfilesSaved) ? "default" : "outline"}
                  data-testid="button-close-result"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
