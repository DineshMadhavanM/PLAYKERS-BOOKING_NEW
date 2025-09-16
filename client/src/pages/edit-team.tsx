import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Users, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { insertTeamSchema } from "@shared/schema";
import type { InsertTeam, Team } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function EditTeam() {
  const params = useParams();
  const teamId = params.id!;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch team data
  const { data: team, isLoading, error } = useQuery({
    queryKey: ['/api/teams', teamId],
    queryFn: async (): Promise<Team> => {
      const response = await fetch(`/api/teams/${teamId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch team');
      }
      return response.json();
    },
  });

  const form = useForm<InsertTeam>({
    resolver: zodResolver(insertTeamSchema),
    defaultValues: {
      name: "",
      shortName: "",
      description: "",
      city: "",
    },
  });

  // Reset form when team data loads
  if (team && !form.getValues().name) {
    form.reset({
      name: team.name,
      shortName: team.shortName || "",
      description: team.description || "",
      city: team.city || "",
    });
  }

  const updateTeamMutation = useMutation({
    mutationFn: async (teamData: InsertTeam): Promise<Team> => {
      const response = await apiRequest('PUT', `/api/teams/${teamId}`, teamData);
      return response.json();
    },
    onSuccess: (updatedTeam) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId] });
      
      toast({
        title: "Team updated successfully!",
        description: `${updatedTeam.name} has been updated.`,
      });
      
      // Navigate back to team detail page
      navigate(`/teams/${teamId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating team",
        description: error.message || "Failed to update team. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTeam) => {
    updateTeamMutation.mutate(data);
  };

  if (isLoading) {
    return <EditTeamSkeleton />;
  }

  if (error || !team) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Team not found
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            The team you're trying to edit doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate('/teams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/teams/${teamId}`)}
          className="flex items-center gap-2"
          data-testid="button-back-to-team"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Team
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-8 w-8" />
            Edit Team
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Update {team.name}'s information
          </p>
        </div>
      </div>

      {/* Edit Team Form */}
      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter team name"
                          data-testid="input-team-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Short Name */}
                <FormField
                  control={form.control}
                  name="shortName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Name (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., NYC"
                          maxLength={4}
                          data-testid="input-team-short-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* City */}
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., New York, Mumbai, London"
                        data-testid="input-team-city"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about your team..."
                        rows={4}
                        data-testid="textarea-team-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Team Info Display */}
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Current Team Statistics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-800 dark:text-blue-200">
                    <div>
                      <span className="font-semibold">{team.totalMatches || 0}</span>
                      <br />Total Matches
                    </div>
                    <div>
                      <span className="font-semibold">{team.matchesWon || 0}</span>
                      <br />Wins
                    </div>
                    <div>
                      <span className="font-semibold">{team.matchesLost || 0}</span>
                      <br />Losses  
                    </div>
                    <div>
                      <span className="font-semibold">{team.tournamentPoints || 0}</span>
                      <br />Points
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex items-center gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={updateTeamMutation.isPending}
                  className="flex items-center gap-2"
                  data-testid="button-submit-team"
                >
                  {updateTeamMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating Team...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update Team
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/teams/${teamId}`)}
                  disabled={updateTeamMutation.isPending}
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
  );
}

// Loading skeleton component
function EditTeamSkeleton() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-8 w-24" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}