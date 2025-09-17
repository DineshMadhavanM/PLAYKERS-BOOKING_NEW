import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { UserPlus, Edit, Trash2, Save, X, Crown, Shield, Zap, User } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { insertPlayerSchema } from "@shared/schema";
import type { InsertPlayer, Player } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PlayerManagementProps {
  teamId: string;
  teamName: string;
  players: Player[];
  isLoading?: boolean;
}

export default function PlayerManagement({ teamId, teamName, players, isLoading }: PlayerManagementProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Add player form
  const addForm = useForm<InsertPlayer>({
    resolver: zodResolver(insertPlayerSchema),
    defaultValues: {
      name: "",
      email: "",
      teamId: teamId,
      role: undefined,
      battingStyle: undefined,
      bowlingStyle: undefined,
      jerseyNumber: undefined,
    },
  });

  // Edit player form
  const editForm = useForm<InsertPlayer>({
    resolver: zodResolver(insertPlayerSchema),
  });

  // Add player mutation
  const addPlayerMutation = useMutation({
    mutationFn: async (playerData: InsertPlayer): Promise<Player> => {
      const response = await apiRequest('POST', '/api/players', playerData);
      return response.json();
    },
    onSuccess: (newPlayer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      toast({
        title: "Player added successfully!",
        description: `${newPlayer.name} has been added to ${teamName}.`,
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error adding player",
        description: error.message || "Failed to add player. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update player mutation
  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPlayer> }): Promise<Player> => {
      const response = await apiRequest('PUT', `/api/players/${id}`, data);
      return response.json();
    },
    onSuccess: (updatedPlayer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      toast({
        title: "Player updated successfully!",
        description: `${updatedPlayer.name}'s information has been updated.`,
      });
      setEditingPlayer(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating player",
        description: error.message || "Failed to update player. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete player mutation
  const deletePlayerMutation = useMutation({
    mutationFn: async (playerId: string): Promise<void> => {
      await apiRequest('DELETE', `/api/players/${playerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      toast({
        title: "Player removed",
        description: "Player has been successfully removed from the team.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing player",
        description: error.message || "Failed to remove player. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onAddSubmit = (data: InsertPlayer) => {
    addPlayerMutation.mutate({ ...data, teamId });
  };

  const onEditSubmit = (data: InsertPlayer) => {
    if (editingPlayer) {
      updatePlayerMutation.mutate({ id: editingPlayer.id, data });
    }
  };

  const startEditing = (player: Player) => {
    setEditingPlayer(player);
    editForm.reset({
      name: player.name,
      email: player.email || "",
      role: (player.role as any) || undefined,
      battingStyle: (player.battingStyle as any) || undefined,
      bowlingStyle: (player.bowlingStyle as any) || undefined,
      jerseyNumber: player.jerseyNumber || undefined,
    });
  };

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case 'all-rounder':
        return <Zap className="h-4 w-4 text-purple-600" />;
      case 'batsman':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'bowler':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'wicket-keeper':
        return <Crown className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'all-rounder':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'batsman':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'bowler':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'wicket-keeper':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading players...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Player Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Roster</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage players and their roles
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" data-testid="button-add-player">
              <UserPlus className="h-4 w-4" />
              Add Player
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Player</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter player name" data-testid="input-player-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="player@example.com" data-testid="input-player-email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-player-role">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="batsman">Batsman</SelectItem>
                            <SelectItem value="bowler">Bowler</SelectItem>
                            <SelectItem value="all-rounder">All-rounder</SelectItem>
                            <SelectItem value="wicket-keeper">Wicket-keeper</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="jerseyNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jersey Number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 10"
                            data-testid="input-jersey-number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="battingStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batting Style</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-batting-style">
                              <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="right-handed">Right-handed</SelectItem>
                            <SelectItem value="left-handed">Left-handed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="bowlingStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bowling Style</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-bowling-style">
                              <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="right-arm-fast">Right-arm fast</SelectItem>
                            <SelectItem value="left-arm-fast">Left-arm fast</SelectItem>
                            <SelectItem value="right-arm-medium">Right-arm medium</SelectItem>
                            <SelectItem value="left-arm-medium">Left-arm medium</SelectItem>
                            <SelectItem value="right-arm-spin">Right-arm spin</SelectItem>
                            <SelectItem value="left-arm-spin">Left-arm spin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addPlayerMutation.isPending} data-testid="button-submit-player">
                    {addPlayerMutation.isPending ? "Adding..." : "Add Player"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Players List */}
      {players.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No players yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Add your first player to start building your team roster
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add First Player
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {players.map((player) => (
            <Card key={player.id} className="hover:shadow-md transition-shadow" data-testid={`card-player-${player.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {player.jerseyNumber && (
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                          {player.jerseyNumber}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-lg" data-testid={`text-player-name-${player.id}`}>
                          {player.name}
                        </h4>
                        {player.role && (
                          <Badge className={getRoleBadgeColor(player.role)}>
                            <div className="flex items-center gap-1">
                              {getRoleIcon(player.role)}
                              {player.role.replace('-', ' ')}
                            </div>
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {player.email && (
                          <span>{player.email}</span>
                        )}
                        {player.battingStyle && (
                          <span>Bat: {player.battingStyle}</span>
                        )}
                        {player.bowlingStyle && (
                          <span>Bowl: {player.bowlingStyle}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/players/${player.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-view-player-${player.id}`}
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    </Link>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(player)}
                      data-testid={`button-edit-player-${player.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Player</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove "{player.name}" from the team?
                            This will remove them from all future matches but preserve their statistics.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deletePlayerMutation.mutate(player.id)}
                          >
                            Remove Player
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Player Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
          </DialogHeader>
          {editingPlayer && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter player name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="player@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="batsman">Batsman</SelectItem>
                            <SelectItem value="bowler">Bowler</SelectItem>
                            <SelectItem value="all-rounder">All-rounder</SelectItem>
                            <SelectItem value="wicket-keeper">Wicket-keeper</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="jerseyNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jersey Number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 10"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="battingStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batting Style</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="right-handed">Right-handed</SelectItem>
                            <SelectItem value="left-handed">Left-handed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="bowlingStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bowling Style</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="right-arm-fast">Right-arm fast</SelectItem>
                            <SelectItem value="left-arm-fast">Left-arm fast</SelectItem>
                            <SelectItem value="right-arm-medium">Right-arm medium</SelectItem>
                            <SelectItem value="left-arm-medium">Left-arm medium</SelectItem>
                            <SelectItem value="right-arm-spin">Right-arm spin</SelectItem>
                            <SelectItem value="left-arm-spin">Left-arm spin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingPlayer(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updatePlayerMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {updatePlayerMutation.isPending ? "Updating..." : "Update Player"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}