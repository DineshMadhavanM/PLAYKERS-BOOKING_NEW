import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Award, Target, TrendingUp, Calendar, MapPin, Users } from "lucide-react";
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
                        <td className="p-2 font-medium">{batsman.playerId}</td>
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
                        <td className="p-2 font-medium">{bowler.playerId}</td>
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
              {match.status === 'completed' && getScorecard() ? (
                <div className="space-y-6">
                  {/* Team 1 Innings */}
                  {getScorecard().team1Innings && renderInningsCard(getScorecard().team1Innings, match.team1Name)}
                  
                  {/* Team 2 Innings */}
                  {getScorecard().team2Innings && renderInningsCard(getScorecard().team2Innings, match.team2Name)}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {match.status === 'completed' 
                        ? 'Detailed scorecard not available for this match'
                        : 'Match scorecard will be available once the match is completed'
                      }
                    </p>
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
                              {(match.matchData as any).awards.manOfTheMatch}
                            </span>
                          </div>
                        )}
                        {(match.matchData as any).awards.bestBatsman && (
                          <div className="flex justify-between">
                            <span>🏏 Best Batsman:</span>
                            <span className="font-semibold">{(match.matchData as any).awards.bestBatsman}</span>
                          </div>
                        )}
                        {(match.matchData as any).awards.bestBowler && (
                          <div className="flex justify-between">
                            <span>⚡ Best Bowler:</span>
                            <span className="font-semibold">{(match.matchData as any).awards.bestBowler}</span>
                          </div>
                        )}
                        {(match.matchData as any).awards.bestFielder && (
                          <div className="flex justify-between">
                            <span>🤲 Best Fielder:</span>
                            <span className="font-semibold">{(match.matchData as any).awards.bestFielder}</span>
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
              {teamStats ? (
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
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Team statistics not available
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}