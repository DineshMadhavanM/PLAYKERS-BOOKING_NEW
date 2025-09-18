import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Award, Target, TrendingUp, Calendar, MapPin, Users, Activity, Timer } from "lucide-react";
import type { Match, Player, Team } from "@shared/schema";

const sportEmojis: Record<string, string> = {
  cricket: "🏏",
  football: "⚽",
  volleyball: "🏐",
  tennis: "🎾",
  kabaddi: "🤼",
};

interface MatchScorecardDialogProps {
  match: Match;
  children: React.ReactNode;
  teamStats?: {
    totalMatches: number;
    matchesWon: number;
    matchesLost: number;
    matchesDrawn: number;
    winRate: number;
    tournamentPoints: number;
  };
}

export default function MatchScorecardDialog({ match, children, teamStats }: MatchScorecardDialogProps) {
  const [open, setOpen] = useState(false);

  // Fetch players to resolve player IDs to names
  const { data: allPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
    enabled: open,
  });

  // Fetch teams for additional team information
  const { data: allTeams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: open,
  });

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getMatchResult = () => {
    if (match.status !== 'completed') return null;
    
    const resultSummary = (match.matchData as any)?.resultSummary;
    const awards = (match.matchData as any)?.awards;
    
    if (resultSummary?.winnerId) {
      const winnerName = resultSummary.winnerId === (match.matchData as any)?.team1Id ? match.team1Name : match.team2Name;
      if (resultSummary.resultType === 'won-by-runs') {
        return `${winnerName} won by ${resultSummary.marginRuns} runs`;
      } else if (resultSummary.resultType === 'won-by-wickets') {
        return `${winnerName} won by ${resultSummary.marginWickets} wickets`;
      }
    }
    
    if (resultSummary?.resultType === 'tied') return 'Match tied';
    if (resultSummary?.resultType === 'no-result') return 'No result';
    if (resultSummary?.resultType === 'abandoned') return 'Match abandoned';
    
    return 'Result not available';
  };

  const getManOfTheMatch = () => {
    const awards = (match.matchData as any)?.awards;
    return awards?.manOfTheMatch || null;
  };

  const getScorecard = () => {
    return (match.matchData as any)?.scorecard || null;
  };

  const getPlayerName = (playerId: string) => {
    if (!playerId) return "Unknown Player";
    const player = allPlayers.find(p => p.id === playerId || p.name === playerId);
    return player?.name || playerId;
  };

  const getTeamName = (teamId: string) => {
    if (!teamId) return "Unknown Team";
    const team = allTeams.find(t => t.id === teamId || t.name === teamId);
    return team?.name || teamId;
  };

  const getCurrentScore = () => {
    const matchData = match.matchData as any;
    return {
      team1Score: typeof match.team1Score === 'object' && match.team1Score?.runs !== undefined ? match.team1Score.runs : (match.team1Score || 0),
      team2Score: typeof match.team2Score === 'object' && match.team2Score?.runs !== undefined ? match.team2Score.runs : (match.team2Score || 0),
      team1Wickets: matchData?.team1Wickets || 0,
      team2Wickets: matchData?.team2Wickets || 0,
      currentOver: matchData?.currentOver || 0,
      currentBall: matchData?.currentBall || 0,
    };
  };

  const getLiveMatchData = () => {
    const matchData = match.matchData as any;
    if (!matchData) return null;
    
    return {
      currentInning: matchData.currentInning || 1,
      tossWinner: matchData.toss?.winner,
      tossDecision: matchData.toss?.decision,
      currentStriker: matchData.currentPlayers?.striker,
      currentBowler: matchData.currentPlayers?.bowler,
      lastBall: matchData.lastBall,
      recentOvers: matchData.recentOvers || []
    };
  };

  const formatScore = (s: any) => {
    if (s && typeof s === 'object' && 'runs' in s) {
      return `${s.runs}/${s.wickets || 0} (${s.overs || 0} ov)`;
    }
    return String(s ?? '');
  };

  const renderInningsCard = (innings: any, teamName: string | null) => {
    if (!innings || innings.length === 0) return null;
    
    return innings.map((inning: any, index: number) => (
      <Card key={index} className="mb-4">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>{teamName} - Innings {inning.inningsNumber}</span>
            <Badge variant="outline" className="text-lg font-bold">
              {inning.totalRuns}/{inning.totalWickets} ({inning.totalOvers} overs)
            </Badge>
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Run Rate: {inning.runRate?.toFixed(2)} | 
            Extras: {Object.values(inning.extras || {}).reduce((a: any, b: any) => a + b, 0)}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="batting" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="batting">Batting</TabsTrigger>
              <TabsTrigger value="bowling">Bowling</TabsTrigger>
            </TabsList>
            
            <TabsContent value="batting" className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Batsman</th>
                      <th className="text-right p-2">Runs</th>
                      <th className="text-right p-2">Balls</th>
                      <th className="text-right p-2">4s</th>
                      <th className="text-right p-2">6s</th>
                      <th className="text-right p-2">SR</th>
                      <th className="text-left p-2">Dismissal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inning.batsmen?.map((batsman: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-medium">{getPlayerName(batsman.playerId)}</td>
                        <td className="text-right p-2">{batsman.runsScored}</td>
                        <td className="text-right p-2">{batsman.ballsFaced}</td>
                        <td className="text-right p-2">{batsman.fours}</td>
                        <td className="text-right p-2">{batsman.sixes}</td>
                        <td className="text-right p-2">{batsman.strikeRate?.toFixed(1)}</td>
                        <td className="text-left p-2 text-muted-foreground">
                          {batsman.dismissalType === 'not-out' ? 'Not Out' : batsman.dismissalType}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            
            <TabsContent value="bowling" className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Bowler</th>
                      <th className="text-right p-2">Overs</th>
                      <th className="text-right p-2">Maidens</th>
                      <th className="text-right p-2">Runs</th>
                      <th className="text-right p-2">Wickets</th>
                      <th className="text-right p-2">Economy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inning.bowlers?.map((bowler: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-medium">{getPlayerName(bowler.playerId)}</td>
                        <td className="text-right p-2">{bowler.overs}</td>
                        <td className="text-right p-2">{bowler.maidens}</td>
                        <td className="text-right p-2">{bowler.runsGiven}</td>
                        <td className="text-right p-2">{bowler.wickets}</td>
                        <td className="text-right p-2">{bowler.economy?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl" data-testid={`dialog-title-${match.id}`}>
            {sportEmojis[match.sport] || "🏃"} {match.title}
            <Badge variant={match.status === 'completed' ? 'default' : 'secondary'} data-testid={`dialog-status-badge-${match.id}`}>
              {match.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Match Info Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDate(match.scheduledAt)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Venue: {match.venueId}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {match.matchType} • {match.isPublic ? "Public" : "Private"}
                  </div>
                </div>
                
                {match.team1Name && match.team2Name && (
                  <div className="text-center">
                    <div className="flex justify-between items-center">
                      <div className="text-center">
                        <p className="font-bold text-lg">{match.team1Name}</p>
                      </div>
                      <div className="text-center text-muted-foreground font-medium mx-4">VS</div>
                      <div className="text-center">
                        <p className="font-bold text-lg">{match.team2Name}</p>
                      </div>
                    </div>
                    {match.status === 'completed' && (
                      <div className="mt-2 text-center">
                        <Badge variant="outline" className="text-green-600">
                          {getMatchResult()}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                
                {getManOfTheMatch() && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold">Man of the Match</span>
                    </div>
                    <Badge variant="outline" className="text-yellow-600">
                      {getManOfTheMatch()}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="scorecard" className="w-full">
            <TabsList className="grid w-full grid-cols-3" data-testid={`dialog-tabs-list-${match.id}`}>
              <TabsTrigger value="scorecard" data-testid={`tab-scorecard-${match.id}`}>Scorecard</TabsTrigger>
              <TabsTrigger value="awards" data-testid={`tab-awards-${match.id}`}>Awards</TabsTrigger>
              <TabsTrigger value="team-stats" data-testid={`tab-team-stats-${match.id}`}>Team Stats</TabsTrigger>
            </TabsList>
            
            <TabsContent value="scorecard" className="mt-6">
              {getScorecard() || match.status === 'live' ? (
                <div className="space-y-6">
                  {/* Current Live Score Display */}
                  {match.status === 'live' && (
                    <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                          <Activity className="h-5 w-5" />
                          Live Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="text-center">
                            <h3 className="font-bold text-lg mb-2">{match.team1Name || "Team 1"}</h3>
                            <div className="text-3xl font-bold text-green-600">
                              {getCurrentScore().team1Score}/{getCurrentScore().team1Wickets}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ({Math.floor(getCurrentScore().currentOver)}.{getCurrentScore().currentBall} overs)
                            </div>
                          </div>
                          <div className="text-center">
                            <h3 className="font-bold text-lg mb-2">{match.team2Name || "Team 2"}</h3>
                            <div className="text-3xl font-bold text-green-600">
                              {getCurrentScore().team2Score}/{getCurrentScore().team2Wickets}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {getCurrentScore().team2Score > 0 ? `(${Math.floor(getCurrentScore().currentOver)}.${getCurrentScore().currentBall} overs)` : "Yet to bat"}
                            </div>
                          </div>
                        </div>
                        {getLiveMatchData() && (
                          <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                            {getLiveMatchData()?.tossWinner && (
                              <p><strong>Toss:</strong> {getLiveMatchData()?.tossWinner} won and chose to {getLiveMatchData()?.tossDecision} first</p>
                            )}
                            {getLiveMatchData()?.currentStriker && (
                              <p><strong>Batting:</strong> {getPlayerName(getLiveMatchData()?.currentStriker || "")} (striker)</p>
                            )}
                            {getLiveMatchData()?.currentBowler && (
                              <p><strong>Bowling:</strong> {getPlayerName(getLiveMatchData()?.currentBowler || "")}</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Detailed Scorecard for Completed Matches */}
                  {getScorecard() && (
                    <>
                      {/* Team 1 Innings */}
                      {getScorecard().team1Innings && renderInningsCard(getScorecard().team1Innings, match.team1Name)}
                      
                      {/* Team 2 Innings */}
                      {getScorecard().team2Innings && renderInningsCard(getScorecard().team2Innings, match.team2Name)}
                    </>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {match.status === 'upcoming' 
                        ? 'Match has not started yet. Scorecard will be available once the match begins.'
                        : 'No scorecard data available for this match'
                      }
                    </p>
                    {match.status === 'upcoming' && match.team1Name && match.team2Name && (
                      <div className="mt-4 flex items-center justify-center gap-4">
                        <Badge variant="outline">{match.team1Name}</Badge>
                        <span className="text-muted-foreground">vs</span>
                        <Badge variant="outline">{match.team2Name}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="awards" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card data-testid={`card-match-awards-${match.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Match Awards
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {match.status === 'completed' && (match.matchData as any)?.awards ? (
                      <div className="space-y-3">
                        {(match.matchData as any).awards.manOfTheMatch && (
                          <div className="flex justify-between">
                            <span>🏆 Man of the Match:</span>
                            <span className="font-semibold text-yellow-600">
                              {getPlayerName((match.matchData as any).awards.manOfTheMatch)}
                            </span>
                          </div>
                        )}
                        {(match.matchData as any).awards.bestBatsman && (
                          <div className="flex justify-between">
                            <span>🏏 Best Batsman:</span>
                            <span className="font-semibold">{getPlayerName((match.matchData as any).awards.bestBatsman)}</span>
                          </div>
                        )}
                        {(match.matchData as any).awards.bestBowler && (
                          <div className="flex justify-between">
                            <span>⚡ Best Bowler:</span>
                            <span className="font-semibold">{getPlayerName((match.matchData as any).awards.bestBowler)}</span>
                          </div>
                        )}
                        {(match.matchData as any).awards.bestFielder && (
                          <div className="flex justify-between">
                            <span>🤲 Best Fielder:</span>
                            <span className="font-semibold">{getPlayerName((match.matchData as any).awards.bestFielder)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-6">
                        {match.status === 'completed' 
                          ? 'No awards data available for this match'
                          : 'Awards will be announced after match completion'
                        }
                      </p>
                    )}
                  </CardContent>
                </Card>
                
                <Card data-testid={`card-match-result-${match.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Match Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {match.status === 'completed' ? (
                      <div className="space-y-3">
                        <div className="text-center">
                          <Badge variant="outline" className="text-lg p-3">
                            {getMatchResult()}
                          </Badge>
                        </div>
                        {(match.matchData as any)?.resultSummary?.marginBalls && (
                          <div className="text-center text-sm text-muted-foreground">
                            with {(match.matchData as any).resultSummary.marginBalls} balls remaining
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-6">
                        Match result will be available once completed
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="team-stats" className="mt-6">
              <div className="space-y-6">
                {/* Match Performance Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Match Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Team 1 Performance */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          {match.team1Name || "Team 1"}
                          {match.status === 'completed' && (match.matchData as any)?.resultSummary?.winnerId === (match.matchData as any)?.team1Id && (
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          )}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{getCurrentScore().team1Score}</div>
                            <div className="text-xs text-muted-foreground">Runs</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{getCurrentScore().team1Wickets}</div>
                            <div className="text-xs text-muted-foreground">Wickets</div>
                          </div>
                        </div>
                        {match.sport === 'cricket' && getScorecard()?.team1Innings?.[0] && (
                          <div className="text-sm text-muted-foreground">
                            <p>Run Rate: {getScorecard()?.team1Innings?.[0]?.runRate?.toFixed(2) || '0.00'}</p>
                            <p>Extras: {Object.values(getScorecard()?.team1Innings?.[0]?.extras || {}).reduce((a: number, b: any) => a + Number(b || 0), 0)}</p>
                          </div>
                        )}
                      </div>

                      {/* Team 2 Performance */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          {match.team2Name || "Team 2"}
                          {match.status === 'completed' && (match.matchData as any)?.resultSummary?.winnerId === (match.matchData as any)?.team2Id && (
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          )}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{getCurrentScore().team2Score}</div>
                            <div className="text-xs text-muted-foreground">Runs</div>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{getCurrentScore().team2Wickets}</div>
                            <div className="text-xs text-muted-foreground">Wickets</div>
                          </div>
                        </div>
                        {match.sport === 'cricket' && getScorecard()?.team2Innings?.[0] && (
                          <div className="text-sm text-muted-foreground">
                            <p>Run Rate: {getScorecard()?.team2Innings?.[0]?.runRate?.toFixed(2) || '0.00'}</p>
                            <p>Extras: {Object.values(getScorecard()?.team2Innings?.[0]?.extras || {}).reduce((a: number, b: any) => a + Number(b || 0), 0)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Overall Team Statistics */}
                {teamStats ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Season Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6" data-testid={`team-stats-grid-${match.id}`}>
                        <Card data-testid={`card-wins-${match.id}`}>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-600" data-testid={`stat-wins-${match.id}`}>{teamStats.matchesWon}</div>
                            <div className="text-sm text-muted-foreground">Wins</div>
                          </CardContent>
                        </Card>
                        <Card data-testid={`card-losses-${match.id}`}>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-red-600" data-testid={`stat-losses-${match.id}`}>{teamStats.matchesLost}</div>
                            <div className="text-sm text-muted-foreground">Losses</div>
                          </CardContent>
                        </Card>
                        <Card data-testid={`card-draws-${match.id}`}>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-yellow-600" data-testid={`stat-draws-${match.id}`}>{teamStats.matchesDrawn}</div>
                            <div className="text-sm text-muted-foreground">Draws</div>
                          </CardContent>
                        </Card>
                        <Card data-testid={`card-win-rate-${match.id}`}>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600" data-testid={`stat-win-rate-${match.id}`}>{teamStats.winRate.toFixed(1)}%</div>
                            <div className="text-sm text-muted-foreground">Win Rate</div>
                          </CardContent>
                        </Card>
                        <Card className="md:col-span-2" data-testid={`card-tournament-points-${match.id}`}>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-purple-600" data-testid={`stat-tournament-points-${match.id}`}>{teamStats.tournamentPoints}</div>
                            <div className="text-sm text-muted-foreground">Tournament Points</div>
                          </CardContent>
                        </Card>
                        <Card className="md:col-span-2" data-testid={`card-total-matches-${match.id}`}>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold" data-testid={`stat-total-matches-${match.id}`}>{teamStats.totalMatches}</div>
                            <div className="text-sm text-muted-foreground">Total Matches</div>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Season statistics not available
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Match-specific performance data is shown above
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Match Timeline for Live/Completed matches */}
                {(match.status === 'live' || match.status === 'completed') && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Timer className="h-5 w-5" />
                        Match Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        {getLiveMatchData()?.tossWinner && (
                          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                            <span className="font-medium">Toss Winner:</span>
                            <span>{getLiveMatchData()?.tossWinner} (chose to {getLiveMatchData()?.tossDecision} first)</span>
                          </div>
                        )}
                        
                        {match.status === 'live' && (
                          <>
                            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <span className="font-medium">Current Status:</span>
                              <Badge variant="outline" className="bg-green-100 text-green-800">Live - Inning {getLiveMatchData()?.currentInning || 1}</Badge>
                            </div>
                            
                            {getLiveMatchData()?.currentStriker && (
                              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                <span className="font-medium">On Strike:</span>
                                <span>{getPlayerName(getLiveMatchData()?.currentStriker || "")}</span>
                              </div>
                            )}
                            
                            {getLiveMatchData()?.currentBowler && (
                              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                <span className="font-medium">Bowling:</span>
                                <span>{getPlayerName(getLiveMatchData()?.currentBowler || "")}</span>
                              </div>
                            )}
                          </>
                        )}
                        
                        {match.status === 'completed' && (
                          <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="font-medium">Final Result:</span>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800">{getMatchResult()}</Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}