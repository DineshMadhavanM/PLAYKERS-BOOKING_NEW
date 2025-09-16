import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Users, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { insertTeamSchema } from "@shared/schema";
import type { InsertTeam, Team } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function CreateTeam() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<InsertTeam>({
    resolver: zodResolver(insertTeamSchema),
    defaultValues: {
      name: "",
      shortName: "",
      description: "",
      city: "",
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (teamData: InsertTeam): Promise<Team> => {
      const response = await apiRequest('POST', '/api/teams', teamData);
      return response.json();
    },
    onSuccess: (newTeam) => {
      // Invalidate teams cache
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      
      toast({
        title: "Team created successfully!",
        description: `${newTeam.name} has been created and is ready for players.`,
      });
      
      // Navigate to the new team's detail page
      navigate(`/teams/${newTeam.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating team",
        description: error.message || "Failed to create team. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTeam) => {
    createTeamMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/teams')}
          className="flex items-center gap-2"
          data-testid="button-back-to-teams"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Teams
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-8 w-8" />
            Create New Team
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Set up a new team and start building your roster
          </p>
        </div>
      </div>

      {/* Create Team Form */}
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

              {/* Additional Information Card */}
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    What happens next?
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Your team will be created and ready for player management</li>
                    <li>• You can add players and assign roles (captain, vice-captain)</li>
                    <li>• Team statistics will be tracked automatically through matches</li>
                    <li>• You can edit team information anytime from the team details page</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex items-center gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={createTeamMutation.isPending}
                  className="flex items-center gap-2"
                  data-testid="button-submit-team"
                >
                  {createTeamMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Team...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Create Team
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/teams')}
                  disabled={createTeamMutation.isPending}
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