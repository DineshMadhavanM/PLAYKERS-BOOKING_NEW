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

  const createMatchMutation = useMutation({
    mutationFn: async (data: z.infer<typeof matchSchema>) => {
      const matchData = {
        ...data,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
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
    createMatchMutation.mutate(data);
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
                            form.setValue("venueId", "");
                          }} 
                          defaultValue={field.value}
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

                {/* Team Names (Optional) */}
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
