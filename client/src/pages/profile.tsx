import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, getDisplayName } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Edit, Trophy, Calendar, MapPin, TrendingUp, Star, AlertCircle, UserCheck, ExternalLink } from "lucide-react";
import MatchCard from "@/components/match-card";
import type { UserStats, Match, Booking, PlayerPerformance, Player } from "@shared/schema";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be at most 30 characters").regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  location: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      username: user?.username || "",
      dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : "",
      location: user?.location || "",
      phoneNumber: user?.phoneNumber || "",
    },
  });

  const { data: userStats = [] } = useQuery<UserStats[]>({
    queryKey: ["/api/user/stats"],
    enabled: isAuthenticated,
  });

  const { data: userMatches = [] } = useQuery<Match[]>({
    queryKey: ["/api/user/matches"],
    enabled: isAuthenticated,
  });

  const { data: userBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated,
  });

  const { data: performancesData } = useQuery<{ performances: PlayerPerformance[]; pagination: { limit: number; offset: number; count: number } }>({
    queryKey: ["/api/user/performances"],
    enabled: isAuthenticated,
  });

  // Fetch linked player profile if exists
  const { data: linkedPlayer } = useQuery<Player>({
    queryKey: ['/api/users', user?.id, 'player'],
    queryFn: async (): Promise<Player> => {
      const response = await fetch(`/api/users/${user?.id}/player`);
      if (!response.ok) {
        throw new Error('No linked player');
      }
      return response.json();
    },
    enabled: !!user?.id,
    retry: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      await apiRequest("PUT", "/api/auth/user", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const totalMatches = userStats.reduce((sum: number, stat: UserStats) => sum + (stat.matchesPlayed || 0), 0);
  const totalWins = userStats.reduce((sum: number, stat: UserStats) => sum + (stat.matchesWon || 0), 0);
  const winRate = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : "0";

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background" data-testid="profile-page">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Completion Nudge */}
        {(!user?.firstName || !user?.lastName) && (
          <Card className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20" data-testid="card-profile-completion">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    Complete Your Profile
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-200 mb-3">
                    Add your full name to get better recommendations and connect with other players. 
                    Your current display name is "{getDisplayName(user as any)}".
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => setIsEditing(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    data-testid="button-complete-profile"
                  >
                    Complete Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Header */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <Avatar className="h-24 w-24" data-testid="img-profile-avatar">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt="Profile" />
                  <AvatarFallback className="text-2xl">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <h1 className="text-3xl font-bold" data-testid="text-user-name">
                        {user?.firstName} {user?.lastName}
                      </h1>
                      {user?.username && (
                        <p className="text-lg text-muted-foreground" data-testid="text-username">
                          @{user.username}
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                      data-testid="button-edit-profile"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {isEditing ? "Cancel" : "Edit"}
                    </Button>
                  </div>
                  <p className="text-muted-foreground mb-2" data-testid="text-user-email">
                    {user?.email}
                  </p>
                  {linkedPlayer && (
                    <div className="mb-3">
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Linked to Player Profile
                      </Badge>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 ml-3 text-blue-600 hover:text-blue-800"
                        onClick={() => window.location.href = `/players/${linkedPlayer.id}`}
                        data-testid="link-player-profile"
                      >
                        View Player Profile <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
                    {user?.dateOfBirth && (
                      <div className="flex items-center gap-1" data-testid="text-user-dob">
                        <Calendar className="h-4 w-4" />
                        Born {new Date(user.dateOfBirth).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    )}
                    {user?.location && (
                      <div className="flex items-center gap-1" data-testid="text-user-location">
                        <MapPin className="h-4 w-4" />
                        {user.location}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center" data-testid="stat-total-matches">
                      <div className="text-2xl font-bold text-primary">{totalMatches}</div>
                      <p className="text-sm text-muted-foreground">Matches Played</p>
                    </div>
                    <div className="text-center" data-testid="stat-total-wins">
                      <div className="text-2xl font-bold text-green-600">{totalWins}</div>
                      <p className="text-sm text-muted-foreground">Wins</p>
                    </div>
                    <div className="text-center" data-testid="stat-win-rate">
                      <div className="text-2xl font-bold text-blue-600">{winRate}%</div>
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                    </div>
                    <div className="text-center" data-testid="stat-total-bookings">
                      <div className="text-2xl font-bold text-purple-600">{userBookings.length}</div>
                      <p className="text-sm text-muted-foreground">Bookings</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Profile Form */}
        {isEditing && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" data-testid="input-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter unique username" data-testid="input-username" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" data-testid="input-date-of-birth" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="City, State" data-testid="input-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="+91 12345 67890" data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Profile Tabs */}
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="stats" data-testid="tab-stats">Statistics</TabsTrigger>
            <TabsTrigger value="matches" data-testid="tab-matches">Match History</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" data-testid="content-stats">
            <div className="space-y-6">
              {/* Summary Stats */}
              {userStats.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userStats.map((stat: UserStats) => (
                    <Card key={stat.id} data-testid={`card-stat-${stat.sport}`}>
                      <CardHeader>
                        <CardTitle className="capitalize">{stat.sport}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span>Matches Played:</span>
                            <span className="font-semibold">{stat.matchesPlayed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Matches Won:</span>
                            <span className="font-semibold text-green-600">{stat.matchesWon}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Win Rate:</span>
                            <span className="font-semibold">
                              {(stat.matchesPlayed || 0) > 0 
                                ? `${(((stat.matchesWon || 0) / (stat.matchesPlayed || 1)) * 100).toFixed(1)}%`
                                : "0%"
                              }
                            </span>
                          </div>
                          {stat.totalScore && (
                            <div className="flex justify-between">
                              <span>Total Score:</span>
                              <span className="font-semibold">{stat.totalScore}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Player Profile Statistics */}
              {linkedPlayer && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Cricket Career Statistics</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/players/${linkedPlayer.id}`}
                      data-testid="button-view-full-profile"
                    >
                      View Full Profile <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Batting Stats */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Batting</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Runs:</span>
                            <span className="font-semibold">{linkedPlayer.careerStats?.totalRuns || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Highest Score:</span>
                            <span className="font-semibold">{linkedPlayer.careerStats?.highestScore || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Average:</span>
                            <span className="font-semibold">{linkedPlayer.careerStats?.battingAverage?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Strike Rate:</span>
                            <span className="font-semibold">{linkedPlayer.careerStats?.strikeRate?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Centuries:</span>
                            <span className="font-semibold text-green-600">{linkedPlayer.careerStats?.centuries || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Half Centuries:</span>
                            <span className="font-semibold text-blue-600">{linkedPlayer.careerStats?.halfCenturies || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bowling Stats */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Bowling</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Wickets:</span>
                            <span className="font-semibold">{linkedPlayer.careerStats?.totalWickets || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Bowling Average:</span>
                            <span className="font-semibold">{linkedPlayer.careerStats?.bowlingAverage?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Economy Rate:</span>
                            <span className="font-semibold">{linkedPlayer.careerStats?.economy?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">5-wicket Hauls:</span>
                            <span className="font-semibold text-red-600">{linkedPlayer.careerStats?.fiveWicketHauls || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Overs:</span>
                            <span className="font-semibold">{linkedPlayer.careerStats?.totalOvers || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Best Bowling:</span>
                            <span className="font-semibold">{linkedPlayer.careerStats?.bestBowlingFigures || '-'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Fielding & Awards */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Fielding & Awards</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Catches:</span>
                            <span className="font-semibold">{linkedPlayer.careerStats?.catches || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Run Outs:</span>
                            <span className="font-semibold">{linkedPlayer.careerStats?.runOuts || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Stumpings:</span>
                            <span className="font-semibold">{linkedPlayer.careerStats?.stumpings || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Man of the Match:</span>
                            <span className="font-semibold text-yellow-600">{linkedPlayer.careerStats?.manOfTheMatchAwards || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Matches:</span>
                            <span className="font-semibold text-primary">{linkedPlayer.careerStats?.totalMatches || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Matches Won:</span>
                            <span className="font-semibold text-green-600">{linkedPlayer.careerStats?.matchesWon || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Detailed Performance Stats */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Match-by-Match Performance</h3>
                {!performancesData?.performances || performancesData.performances.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No Performance Records Yet</h3>
                      <p className="text-muted-foreground">
                        Start playing matches to see your match-by-match statistics here!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {performancesData.performances.map((performance) => (
                      <Card key={performance.id} className="hover:shadow-md transition-shadow" data-testid={`card-performance-${performance.id}`}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Match Header */}
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">
                                  vs {performance.opposition}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(performance.matchDate).toLocaleDateString()}</span>
                                  {performance.venue && (
                                    <>
                                      <span>•</span>
                                      <MapPin className="h-3 w-3" />
                                      <span>{performance.venue}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Badge 
                                variant={performance.matchResult === 'won' ? 'default' : performance.matchResult === 'lost' ? 'destructive' : 'secondary'}
                                className="ml-2"
                              >
                                {performance.matchResult === 'won' ? 'Won' : performance.matchResult === 'lost' ? 'Lost' : performance.matchResult === 'tied' ? 'Tied' : 'No Result'}
                              </Badge>
                            </div>

                            {/* Performance Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t">
                              {/* Batting */}
                              {performance.battingStats && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Trophy className="h-4 w-4" />
                                    Batting
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Runs:</span>
                                      <span className="font-semibold">{performance.battingStats.runs}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Balls:</span>
                                      <span>{performance.battingStats.balls}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">SR:</span>
                                      <span>{performance.battingStats.strikeRate.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">4s/6s:</span>
                                      <span>{performance.battingStats.fours}/{performance.battingStats.sixes}</span>
                                    </div>
                                    {performance.battingStats.dismissalType && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Out:</span>
                                        <span className="text-xs">{performance.battingStats.dismissalType}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Bowling */}
                              {performance.bowlingStats && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Bowling
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Wickets:</span>
                                      <span className="font-semibold">{performance.bowlingStats.wickets}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Overs:</span>
                                      <span>{performance.bowlingStats.overs}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Runs:</span>
                                      <span>{performance.bowlingStats.runs}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Economy:</span>
                                      <span>{performance.bowlingStats.economy.toFixed(1)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Fielding */}
                              {performance.fieldingStats && (performance.fieldingStats.catches > 0 || performance.fieldingStats.runOuts > 0 || performance.fieldingStats.stumpings > 0) && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Star className="h-4 w-4" />
                                    Fielding
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    {performance.fieldingStats.catches > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Catches:</span>
                                        <span>{performance.fieldingStats.catches}</span>
                                      </div>
                                    )}
                                    {performance.fieldingStats.runOuts > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Run Outs:</span>
                                        <span>{performance.fieldingStats.runOuts}</span>
                                      </div>
                                    )}
                                    {performance.fieldingStats.stumpings > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Stumpings:</span>
                                        <span>{performance.fieldingStats.stumpings}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Awards */}
                            {performance.awards && performance.awards.length > 0 && (
                              <div className="pt-3 border-t">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  {performance.awards.map((award, idx) => (
                                    <Badge key={idx} variant="secondary" className="capitalize">
                                      {award.replace('-', ' ')}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* View Match Details Button */}
                            <div className="pt-3 border-t">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => window.location.href = `/matches/${performance.matchId}`}
                                data-testid={`link-match-${performance.matchId}`}
                              >
                                View Match Details →
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="matches" data-testid="content-matches">
            {userMatches.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Matches Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't joined any matches yet. Find matches to join!
                  </p>
                  <Button onClick={() => window.location.href = '/matches'} data-testid="button-find-matches">
                    Find Matches
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {userMatches.map((match: Match) => (
                  <MatchCard key={match.id} match={match} showActions={false} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" data-testid="content-bookings">
            {userBookings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Bookings Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't made any venue bookings yet. Book your first venue!
                  </p>
                  <Button onClick={() => window.location.href = '/venues'} data-testid="button-find-venues">
                    Find Venues
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {userBookings.map((booking: Booking) => (
                  <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold mb-2">Venue Booking</h3>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {new Date(booking.startTime).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              Venue ID: {booking.venueId}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                            className="mb-2"
                          >
                            {booking.status}
                          </Badge>
                          <div className="text-lg font-bold">
                            ₹{Number(booking.totalAmount).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
