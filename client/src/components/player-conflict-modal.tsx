import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, User, Mail, Shield, Crown, Zap, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Player, InsertPlayer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ConflictData {
  conflictType: "email_exists";
  existingPlayer: {
    id: string;
    name: string;
    email: string;
    teamName: string | null;
    role: string | null;
  };
  suggestedAction: "merge_profiles";
}

interface PlayerConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictData: ConflictData | null;
  newPlayerData: Partial<InsertPlayer>;
  onResolutionComplete: () => void;
}

export default function PlayerConflictModal({ 
  isOpen, 
  onClose, 
  conflictData, 
  newPlayerData, 
  onResolutionComplete 
}: PlayerConflictModalProps) {
  const { toast } = useToast();
  const [selectedFields, setSelectedFields] = useState<Record<string, 'existing' | 'new'>>({});

  // Update existing player mutation
  const updatePlayerMutation = useMutation({
    mutationFn: async (data: Partial<InsertPlayer>): Promise<Player> => {
      if (!conflictData) throw new Error("No conflict data available");
      const response = await apiRequest('PUT', `/api/players/${conflictData.existingPlayer.id}`, data);
      return response.json();
    },
    onSuccess: (updatedPlayer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      toast({
        title: "Player profile updated successfully!",
        description: `${updatedPlayer.name}'s information has been updated with the new data.`,
      });
      onResolutionComplete();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating player",
        description: error.message || "Failed to update player. Please try again.",
        variant: "destructive",
      });
    },
  });

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
        return <User className="h-4 w-4 text-gray-600" />;
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

  const handleFieldSelection = (field: string, value: 'existing' | 'new') => {
    setSelectedFields(prev => ({ ...prev, [field]: value }));
  };

  const buildUpdateData = (): Partial<InsertPlayer> => {
    if (!conflictData) throw new Error("No conflict data available");

    // Start with empty object and only include fields that are explicitly changed
    const updateData: Partial<InsertPlayer> = {};
    
    // Always use the existing email since that's what caused the conflict
    updateData.email = conflictData.existingPlayer.email;
    
    // Only include fields that have explicit selections or need to be changed
    ['name', 'teamName', 'role', 'battingStyle', 'bowlingStyle', 'jerseyNumber'].forEach(field => {
      const existingValue = (conflictData.existingPlayer as any)[field];
      const newValue = (newPlayerData as any)[field];
      
      // Skip fields that were not displayed in the UI (same logic as UI filter)
      if (existingValue === newValue || (!existingValue && !newValue)) {
        return; // Skip this field entirely
      }
      
      const selection = selectedFields[field] || 'existing';
      
      if (selection === 'new') {
        // Include new value since it differs from existing
        if (newValue !== undefined) {
          (updateData as any)[field] = newValue;
        }
      } else if (selection === 'existing') {
        // Include existing value since it differs from new
        if (existingValue !== undefined) {
          (updateData as any)[field] = existingValue;
        }
      }
    });

    return updateData;
  };

  const handleUpdatePlayer = () => {
    if (!conflictData) return;
    
    try {
      const updateData = buildUpdateData();
      updatePlayerMutation.mutate(updateData);
    } catch (error: any) {
      toast({
        title: "Error preparing update",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateNew = () => {
    // Close modal and let the parent component handle creating with a different email
    onClose();
    toast({
      title: "Please update the email address",
      description: "Change the email address to create a new player profile.",
      variant: "default",
    });
  };

  if (!conflictData || !isOpen) return null;

  const existingPlayer = conflictData.existingPlayer;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Player Email Already Exists
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Warning */}
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                  Email Address Already Exists
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  A player with email "{existingPlayer.email}" already exists. 
                  You can update their profile with the new information or create a separate player with a different email.
                </p>
              </div>
            </div>
          </div>

          {/* Profile Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Existing Player */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Current Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{existingPlayer.name}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{existingPlayer.email}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Team</Label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {existingPlayer.teamName || 'Not assigned'}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Role</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {existingPlayer.role ? (
                        <Badge className={getRoleBadgeColor(existingPlayer.role)}>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(existingPlayer.role)}
                            {existingPlayer.role.replace('-', ' ')}
                          </div>
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-500">Not specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  New Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {newPlayerData.name || 'Not provided'}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {newPlayerData.email || 'Not provided'}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Team</Label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {newPlayerData.teamName || 'Not provided'}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Role</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {newPlayerData.role ? (
                        <Badge className={getRoleBadgeColor(newPlayerData.role)}>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(newPlayerData.role)}
                            {newPlayerData.role.replace('-', ' ')}
                          </div>
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-500">Not specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Field Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Which Information to Keep</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {['name', 'teamName', 'role', 'battingStyle', 'bowlingStyle', 'jerseyNumber'].map((field) => {
                const existingValue = (existingPlayer as any)[field];
                const newValue = (newPlayerData as any)[field];
                
                // Only show fields that have different values
                if (existingValue === newValue || (!existingValue && !newValue)) {
                  return null;
                }
                
                return (
                  <div key={field} className="border rounded-lg p-4">
                    <Label className="text-sm font-medium capitalize mb-3 block">
                      {field.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </Label>
                    <RadioGroup
                      value={selectedFields[field] || 'existing'}
                      onValueChange={(value) => handleFieldSelection(field, value as 'existing' | 'new')}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="existing" id={`${field}-existing`} />
                        <Label htmlFor={`${field}-existing`} className="flex-1">
                          Keep current: <strong>{existingValue || 'Not set'}</strong>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id={`${field}-new`} />
                        <Label htmlFor={`${field}-new`} className="flex-1">
                          Use new: <strong>{newValue || 'Not set'}</strong>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleCreateNew} data-testid="button-create-new">
              Create New Player
            </Button>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                onClick={handleUpdatePlayer}
                disabled={updatePlayerMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
                data-testid="button-update-existing"
              >
                {updatePlayerMutation.isPending ? (
                  "Updating..."
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Update Existing Player
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}