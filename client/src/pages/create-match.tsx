import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, MapPin, Users, Clock, Trophy } from "lucide-react";
import { useLocation } from "wouter";
import CricketTeamRoster, { Player } from "@/components/cricket-team-roster";
import type { Team } from "@shared/schema";

const matchSchema = z.object({
  title: z.string().min(1, "Match title is required"),
  sport: z.string().min(1, "Sport is required"),
  matchType: z.string().min(1, "Match type is required"),
  city: z.string().min(1, "City is required"),
  scheduledAt: z.string().min(1, "Date and time is required"),
  duration: z.number().min(30, "Duration must be at least 30 minutes"),
  maxPlayers: z.number().min(2, "Must have at least 2 players"),
  isPublic: z.boolean(),
  team1Name: z.string().optional(),
  team2Name: z.string().optional(),
  description: z.string().optional(),
});

// Generate cricket overs options (1-50)
const cricketOversOptions = Array.from({ length: 50 }, (_, i) => `${i + 1} Overs`);

const sportOptions = [
  { 
    value: "cricket", 
    label: "Cricket", 
    types: ["Test", ...cricketOversOptions] 
  },
  { value: "football", label: "Football", types: ["90 min", "60 min", "7-a-side", "5-a-side"] },
  { value: "volleyball", label: "Volleyball", types: ["Best of 3", "Best of 5", "Time-based"] },
  { value: "tennis", label: "Tennis", types: ["Singles", "Doubles", "Mixed Doubles"] },
  { value: "kabaddi", label: "Kabaddi", types: ["Pro Kabaddi", "Circle Style", "Beach Kabaddi"] },
];

export default function CreateMatch() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedSport, setSelectedSport] = useState("");
  const [team1Roster, setTeam1Roster] = useState<Player[]>([]);
  const [team2Roster, setTeam2Roster] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>(""); // For backward compatibility when team1 is pre-filled
  const [selectedTeam1, setSelectedTeam1] = useState<string>(""); // For team 1 selection when not pre-filled
  const [selectedTeam2, setSelectedTeam2] = useState<string>(""); // For team 2 selection when not pre-filled
  const [team1Id, setTeam1Id] = useState<string>("");
  const [team2Id, setTeam2Id] = useState<string>("");
  
  // URL parameters for pre-filled data
  const urlParams = new URLSearchParams(window.location.search);
  const prefilledSport = urlParams.get('sport');
  const prefilledTeam1Id = urlParams.get('team1');
  const prefilledTeam2Id = urlParams.get('team2');

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

  const form = useForm<z.infer<typeof matchSchema>>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      title: "",
      sport: "",
      matchType: "",
      city: "",
      scheduledAt: "",
      duration: 120,
      maxPlayers: 22,
      isPublic: true,
      team1Name: "",
      team2Name: "",
      description: "",
    },
  });

  const { data: venues = [] } = useQuery({
    queryKey: ["/api/venues"],
    enabled: isAuthenticated,
  });

  // Fetch all teams for dropdown
  const { data: allTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['/api/teams'],
    queryFn: async (): Promise<Team[]> => {
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Failed to fetch teams');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch pre-filled teams if provided in URL
  const { data: prefilledTeam1 } = useQuery({
    queryKey: ['/api/teams', prefilledTeam1Id],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${prefilledTeam1Id}`);
      if (!response.ok) throw new Error('Failed to fetch team 1');
      return response.json();
    },
    enabled: isAuthenticated && !!prefilledTeam1Id,
  });

  const { data: prefilledTeam2 } = useQuery({
    queryKey: ['/api/teams', prefilledTeam2Id],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${prefilledTeam2Id}`);
      if (!response.ok) throw new Error('Failed to fetch team 2');
      return response.json();
    },
    enabled: isAuthenticated && !!prefilledTeam2Id,
  });

  // Fetch players for Team 1
  const { data: team1Players = [], isLoading: team1PlayersLoading } = useQuery({
    queryKey: ['/api/players', team1Id],
    queryFn: async (): Promise<any[]> => {
      const response = await fetch(`/api/players?teamId=${team1Id}`);
      if (!response.ok) throw new Error('Failed to fetch team 1 players');
      return response.json();
    },
    enabled: isAuthenticated && !!team1Id,
  });

  // Fetch players for Team 2  
  const { data: team2Players = [], isLoading: team2PlayersLoading } = useQuery({
    queryKey: ['/api/players', team2Id],
    queryFn: async (): Promise<any[]> => {
      const response = await fetch(`/api/players?teamId=${team2Id}`);
      if (!response.ok) throw new Error('Failed to fetch team 2 players');
      return response.json();
    },
    enabled: isAuthenticated && !!team2Id,
  });

  // Helper function to map database Player to CricketTeamRoster Player
  const mapDatabasePlayerToRosterPlayer = (dbPlayer: any): Player => ({
    id: dbPlayer.id,
    name: dbPlayer.name,
    email: dbPlayer.email || '',
    role: 'player', // Default role, can be changed in roster
    position: dbPlayer.position || 0, // Preserve position from database or caller
    battingStyle: dbPlayer.battingStyle || undefined,
    bowlingStyle: dbPlayer.bowlingStyle || undefined,
    isRegisteredUser: dbPlayer.userId ? true : false,
    userId: dbPlayer.userId || undefined,
  });

  // Set form defaults with pre-filled data
  useEffect(() => {
    if (prefilledSport && prefilledSport !== selectedSport) {
      setSelectedSport(prefilledSport);
      form.setValue('sport', prefilledSport);
    }
  }, [prefilledSport, selectedSport, form]);

  useEffect(() => {
    if (prefilledTeam1?.name) {
      form.setValue('team1Name', prefilledTeam1.name);
      setTeam1Id(prefilledTeam1.id); // Track team1 ID
    }
    if (prefilledTeam2?.name) {
      form.setValue('team2Name', prefilledTeam2.name);
      setSelectedTeam(prefilledTeam2.id); // Sync selectedTeam state
      setTeam2Id(prefilledTeam2.id); // Track team2 ID
    }
    
    // Generate a default title with available team names
    if (prefilledTeam1?.name && prefilledTeam2?.name) {
      const defaultTitle = `${prefilledTeam1.name} vs ${prefilledTeam2.name}`;
      if (!form.getValues('title')) {
        form.setValue('title', defaultTitle);
      }
    }
  }, [prefilledTeam1, prefilledTeam2, form]);

  // Handle opponent selection changes (when team1 is pre-filled)
  useEffect(() => {
    if (selectedTeam && allTeams.length > 0 && prefilledTeam1) {
      const selectedTeamData = allTeams.find(team => team.id === selectedTeam);
      if (selectedTeamData) {
        form.setValue('team2Name', selectedTeamData.name);
        setTeam2Id(selectedTeamData.id); // Track team2 ID
        
        // Update title if we have both teams
        const defaultTitle = `${prefilledTeam1.name} vs ${selectedTeamData.name}`;
        if (!form.getValues('title') || form.getValues('title') === '') {
          form.setValue('title', defaultTitle);
        }
      }
    }
  }, [selectedTeam, allTeams, prefilledTeam1, form]);

  // Handle team1 selection changes (when no teams are pre-filled)
  useEffect(() => {
    if (selectedTeam1 && allTeams.length > 0 && !prefilledTeam1) {
      const selectedTeam1Data = allTeams.find(team => team.id === selectedTeam1);
      if (selectedTeam1Data) {
        form.setValue('team1Name', selectedTeam1Data.name);
        setTeam1Id(selectedTeam1Data.id); // Track team1 ID
        
        // Update title if we have both teams
        if (selectedTeam2) {
          const selectedTeam2Data = allTeams.find(team => team.id === selectedTeam2);
          if (selectedTeam2Data) {
            const defaultTitle = `${selectedTeam1Data.name} vs ${selectedTeam2Data.name}`;
            if (!form.getValues('title') || form.getValues('title') === '') {
              form.setValue('title', defaultTitle);
            }
          }
        }
      }
    }
  }, [selectedTeam1, allTeams, selectedTeam2, prefilledTeam1, form]);

  // Handle team2 selection changes (when no teams are pre-filled)
  useEffect(() => {
    if (selectedTeam2 && allTeams.length > 0 && !prefilledTeam1) {
      const selectedTeam2Data = allTeams.find(team => team.id === selectedTeam2);
      if (selectedTeam2Data) {
        form.setValue('team2Name', selectedTeam2Data.name);
        setTeam2Id(selectedTeam2Data.id); // Track team2 ID
        
        // Update title if we have both teams
        if (selectedTeam1) {
          const selectedTeam1Data = allTeams.find(team => team.id === selectedTeam1);
          if (selectedTeam1Data) {
            const defaultTitle = `${selectedTeam1Data.name} vs ${selectedTeam2Data.name}`;
            if (!form.getValues('title') || form.getValues('title') === '') {
              form.setValue('title', defaultTitle);
            }
          }
        }
      }
    }
  }, [selectedTeam2, allTeams, selectedTeam1, prefilledTeam1, form]);

  // Initialize team rosters with available players when players are fetched
  // Reset and reinitialize when team1Id changes or when team1Players are loaded
  useEffect(() => {
    if (team1Id && team1Players.length > 0) {
      const mappedPlayers = team1Players.map((player, index) => 
        mapDatabasePlayerToRosterPlayer({ ...player, position: index + 1 })
      );
      setTeam1Roster(mappedPlayers.slice(0, 15)); // Limit to 15 players
    } else if (!team1Id) {
      setTeam1Roster([]); // Clear roster when no team selected
    }
  }, [team1Id, team1Players]);

  // Reset and reinitialize when team2Id changes or when team2Players are loaded  
  useEffect(() => {
    if (team2Id && team2Players.length > 0) {
      const mappedPlayers = team2Players.map((player, index) => 
        mapDatabasePlayerToRosterPlayer({ ...player, position: index + 1 })
      );
      setTeam2Roster(mappedPlayers.slice(0, 15)); // Limit to 15 players
    } else if (!team2Id) {
      setTeam2Roster([]); // Clear roster when no team selected
    }
  }, [team2Id, team2Players]);

  const createMatchMutation = useMutation({
    mutationFn: async (data: any) => {
      const matchData = {
        ...data,
        scheduledAt: new Date(data.scheduledAt), // Send Date object, not ISO string
        venueId: "temp-venue", // Temporary - will be handled by backend
      };
      
      const matchResponse = await apiRequest("POST", "/api/matches", matchData);
      return matchResponse.json();
    },
    onSuccess: (match) => {
      toast({
        title: "Success",
        description: "Match created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      setLocation(`/match/${match.id}/score`);
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
        description: "Failed to create match. Please try again.",
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

  const selectedSportData = sportOptions.find(sport => sport.value === selectedSport);

  const onSubmit = (data: z.infer<typeof matchSchema>) => {
    // Validate cricket team rosters
    if (selectedSport === "cricket") {
      if (team1Roster.length < 3 || team2Roster.length < 3) {
        toast({
          title: "Incomplete team rosters",
          description: "Each cricket team must have at least 3 players to create the match.",
          variant: "destructive",
        });
        return;
      }

      if (team1Roster.length > 15 || team2Roster.length > 15) {
        toast({
          title: "Too many players",
          description: "Each cricket team can have a maximum of 15 players.",
          variant: "destructive",
        });
        return;
      }

      // Check for required roles
      const team1Captain = team1Roster.find(p => p.role === "captain");
      const team2Captain = team2Roster.find(p => p.role === "captain");
      const team1WicketKeeper = team1Roster.find(p => p.role === "wicket-keeper");
      const team2WicketKeeper = team2Roster.find(p => p.role === "wicket-keeper");

      if (!team1Captain || !team2Captain) {
        toast({
          title: "Missing captains",
          description: "Both teams must have a designated captain.",
          variant: "destructive",
        });
        return;
      }

      if (!team1WicketKeeper || !team2WicketKeeper) {
        toast({
          title: "Missing wicket keepers",
          description: "Both teams must have a designated wicket keeper.",
          variant: "destructive",
        });
        return;
      }
    }

    // Include roster data in the submission for cricket matches
    const matchData = selectedSport === "cricket" 
      ? {
          ...data,
          team1Name: allTeams.find(t => t.id === team1Id)?.name || data.team1Name,
          team2Name: allTeams.find(t => t.id === team2Id)?.name || data.team2Name,
          matchData: {
            team1Id,
            team2Id,
            team1Roster: team1Roster.map(player => ({
              playerId: player.id,
              name: player.name,
              role: player.role,
              battingStyle: player.battingStyle,
              bowlingStyle: player.bowlingStyle,
              position: player.position,
              isRegisteredUser: player.isRegisteredUser,
              userId: player.userId,
            })),
            team2Roster: team2Roster.map(player => ({
              playerId: player.id,
              name: player.name,
              role: player.role,
              battingStyle: player.battingStyle,
              bowlingStyle: player.bowlingStyle,
              position: player.position,
              isRegisteredUser: player.isRegisteredUser,
              userId: player.userId,
            })),
            sport: "cricket"
          }
        }
      : data;

    createMatchMutation.mutate(matchData);
  };

  return (
    <div className="min-h-screen bg-background" data-testid="create-match-page">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Match</h1>
          <p className="text-muted-foreground">
            Set up a new match and invite players to join your game.
          </p>
        </div>

        {/* Team Selection Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {prefilledTeam1 ? 'Select Opponent Team' : 'Select Teams'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Team 1 Display (when pre-filled) */}
              {prefilledTeam1 && (
                <div>
                  <Label className="text-base font-medium">Team 1</Label>
                  <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-300">
                          {prefilledTeam1.name}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          {prefilledTeam1.city ? `Located in ${prefilledTeam1.city}` : 'No city specified'} • {prefilledTeam1.totalMatches || 0} matches played
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

{/* Team Selection Logic */}
              {prefilledTeam1 ? (
                /* Opponent Team Selection (when team1 is pre-filled) */
                <div>
                  <Label htmlFor="opponent-select" className="text-base font-medium">
                    Choose Opponent (Team 2)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select the opposing team for this match
                  </p>
                  <Select 
                    onValueChange={setSelectedTeam} 
                    value={selectedTeam}
                    disabled={teamsLoading}
                  >
                    <SelectTrigger 
                      id="opponent-select" 
                      className="w-full"
                      data-testid="select-opponent-team"
                    >
                      <SelectValue placeholder={teamsLoading ? "Loading teams..." : "Select opponent team"} />
                    </SelectTrigger>
                    <SelectContent>
                      {allTeams
                        .filter(team => team.id !== prefilledTeam1.id) // Filter out Team 1 if pre-filled
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium">{team.name}</span>
                              {team.city && (
                                <span className="text-sm text-muted-foreground ml-2">
                                  {team.city}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedTeam && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      {(() => {
                        const team = allTeams.find(t => t.id === selectedTeam);
                        return team ? (
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <div>
                              <p className="font-medium text-green-700 dark:text-green-300">
                                {team.name} (Opponent)
                              </p>
                              <p className="text-sm text-green-600 dark:text-green-400">
                                {team.city ? `Located in ${team.city}` : 'No city specified'} • {team.totalMatches || 0} matches played
                              </p>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                /* Both Team Dropdowns (when no teams are pre-filled) */
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="team1-select" className="text-base font-medium">
                      Select Team 1
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Choose the first team for this match
                    </p>
                    <Select 
                      onValueChange={setSelectedTeam1} 
                      value={selectedTeam1}
                      disabled={teamsLoading}
                    >
                      <SelectTrigger 
                        id="team1-select" 
                        className="w-full"
                        data-testid="select-team1"
                      >
                        <SelectValue placeholder={teamsLoading ? "Loading teams..." : "Select Team 1"} />
                      </SelectTrigger>
                      <SelectContent>
                        {allTeams
                          .filter(team => team.id !== selectedTeam2) // Filter out selected Team 2
                          .map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center justify-between w-full">
                                <span className="font-medium">{team.name}</span>
                                {team.city && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {team.city}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedTeam1 && (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        {(() => {
                          const team = allTeams.find(t => t.id === selectedTeam1);
                          return team ? (
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <div>
                                <p className="font-medium text-blue-700 dark:text-blue-300">
                                  {team.name} (Team 1)
                                </p>
                                <p className="text-sm text-blue-600 dark:text-blue-400">
                                  {team.city ? `Located in ${team.city}` : 'No city specified'} • {team.totalMatches || 0} matches played
                                </p>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="team2-select" className="text-base font-medium">
                      Select Team 2
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Choose the second team for this match
                    </p>
                    <Select 
                      onValueChange={setSelectedTeam2} 
                      value={selectedTeam2}
                      disabled={teamsLoading}
                    >
                      <SelectTrigger 
                        id="team2-select" 
                        className="w-full"
                        data-testid="select-team2"
                      >
                        <SelectValue placeholder={teamsLoading ? "Loading teams..." : "Select Team 2"} />
                      </SelectTrigger>
                      <SelectContent>
                        {allTeams
                          .filter(team => team.id !== selectedTeam1) // Filter out selected Team 1
                          .map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center justify-between w-full">
                                <span className="font-medium">{team.name}</span>
                                {team.city && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {team.city}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedTeam2 && (
                      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        {(() => {
                          const team = allTeams.find(t => t.id === selectedTeam2);
                          return team ? (
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <div>
                                <p className="font-medium text-green-700 dark:text-green-300">
                                  {team.name} (Team 2)
                                </p>
                                <p className="text-sm text-green-600 dark:text-green-400">
                                  {team.city ? `Located in ${team.city}` : 'No city specified'} • {team.totalMatches || 0} matches played
                                </p>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Match Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Pre-filled Teams Confirmation */}
                {prefilledTeam1 && prefilledTeam2 && (
                  <div className="mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Selected Teams for Match
                      </h3>
                      <div className="flex items-center justify-center gap-4 text-sm">
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-md border">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium text-green-700 dark:text-green-300">{prefilledTeam1.name}</span>
                          {prefilledTeam1.city && (
                            <span className="text-gray-500">({prefilledTeam1.city})</span>
                          )}
                        </div>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">VS</span>
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-md border">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="font-medium text-blue-700 dark:text-blue-300">{prefilledTeam2.name}</span>
                          {prefilledTeam2.city && (
                            <span className="text-gray-500">({prefilledTeam2.city})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Basic Match Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Match Title</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Weekend Cricket Match"
                            data-testid="input-match-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sport"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sport</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedSport(value);
                            form.setValue("matchType", "");
                          }} 
                          value={field.value || selectedSport}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-sport">
                              <SelectValue placeholder="Select sport" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sportOptions.map((sport) => (
                              <SelectItem key={sport.value} value={sport.value}>
                                {sport.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="matchType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Match Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-match-type">
                              <SelectValue placeholder="Select match type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {selectedSportData?.types.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Mumbai"
                            data-testid="input-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>

                {/* Schedule and Duration */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="scheduledAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date & Time</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="datetime-local"
                            data-testid="input-scheduled-at"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-duration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxPlayers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Players</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-max-players"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Team Names - Show selected teams or input fields */}
                {prefilledTeam1 || selectedTeam ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Selected Teams for Match
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Team 1 Display */}
                      {prefilledTeam1 && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <div>
                              <p className="font-medium text-blue-700 dark:text-blue-300">
                                Team 1: {prefilledTeam1.name}
                              </p>
                              <p className="text-sm text-blue-600 dark:text-blue-400">
                                {prefilledTeam1.city ? `${prefilledTeam1.city}` : 'No city specified'} • {team1Players.length} available players
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Team 2 Display */}
                      {selectedTeam && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          {(() => {
                            const team = allTeams.find(t => t.id === selectedTeam);
                            return team ? (
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <div>
                                  <p className="font-medium text-green-700 dark:text-green-300">
                                    Team 2: {team.name}
                                  </p>
                                  <p className="text-sm text-green-600 dark:text-green-400">
                                    {team.city ? `${team.city}` : 'No city specified'} • {team2Players.length} available players
                                  </p>
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Fallback to manual team name inputs */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="team1Name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team 1 Name (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Team Warriors"
                              data-testid="input-team1-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="team2Name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team 2 Name (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Team Champions"
                              data-testid="input-team2-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Cricket Team Rosters - Only show when both teams are selected */}
                {selectedSport === "cricket" && team1Id && team2Id && (
                  <div className="space-y-6">
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Team Player Selection (Required for Cricket)
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Select players from each team for this match. Each team needs at least 3 players and can have up to 15 players.
                        Available players are loaded from each team's roster.
                      </p>
                      
                      {/* Show loading state while fetching players */}
                      {(team1PlayersLoading || team2PlayersLoading) && (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                          <p>Loading team players...</p>
                        </div>
                      )}
                      
                      {/* Show rosters when players are loaded */}
                      {!team1PlayersLoading && !team2PlayersLoading && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          <CricketTeamRoster
                            teamName={prefilledTeam1?.name || form.watch("team1Name") || "Team 1"}
                            teamNumber={1}
                            players={team1Roster}
                            onPlayersChange={setTeam1Roster}
                          />
                          
                          <CricketTeamRoster
                            teamName={allTeams.find(t => t.id === selectedTeam)?.name || form.watch("team2Name") || "Team 2"}
                            teamNumber={2}
                            players={team2Roster}
                            onPlayersChange={setTeam2Roster}
                          />
                        </div>
                      )}

                      {/* Show available players info */}
                      {!team1PlayersLoading && !team2PlayersLoading && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Available Players</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Team 1 ({prefilledTeam1?.name}):</span>
                              <span className="ml-2 text-blue-600 dark:text-blue-400">{team1Players.length} players available</span>
                            </div>
                            <div>
                              <span className="font-medium">Team 2 ({allTeams.find(t => t.id === selectedTeam)?.name}):</span>
                              <span className="ml-2 text-blue-600 dark:text-blue-400">{team2Players.length} players available</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Roster Validation Messages */}
                      {selectedSport === "cricket" && (team1Roster.length < 3 || team2Roster.length < 3) && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            ⚠️ Each team needs at least 3 players to start the match. 
                            Team 1 has {team1Roster.length} players, Team 2 has {team2Roster.length} players.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Match Visibility */}
                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Public Match</FormLabel>
                        <FormDescription>
                          Allow anyone to join this match. Turn off to make it invite-only.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-public"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Additional details about the match, skill level requirements, equipment needed, etc."
                          className="min-h-[100px]"
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-6">
                  <Button 
                    type="submit" 
                    disabled={createMatchMutation.isPending}
                    className="flex-1"
                    data-testid="button-create-match"
                  >
                    {createMatchMutation.isPending ? "Creating..." : "Create Match"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setLocation('/matches')}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
