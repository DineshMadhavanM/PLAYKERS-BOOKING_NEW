import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, User, Mail, Shield, Crown, Zap, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { Player } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";

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

interface PlayerMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictData: ConflictData | null;
  sourcePlayer: Player;  // The player that was being created/updated
  onMergeComplete: () => void;
}

const mergeFormSchema = z.object({
  targetPlayerId: z.string(),
  sourcePlayerId: z.string(),
  mergeCareerStats: z.boolean(),
  fieldsToUpdate: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    teamName: z.string().optional(),
    role: z.enum(["batsman", "bowler", "all-rounder", "wicket-keeper"]).optional(),
    battingStyle: z.enum(["right-handed", "left-handed"]).optional(),
    bowlingStyle: z.enum(["right-arm-fast", "left-arm-fast", "right-arm-medium", "left-arm-medium", "right-arm-spin", "left-arm-spin", "leg-spin", "off-spin"]).optional(),
    jerseyNumber: z.number().int().optional()
  }).optional()
});

type MergeFormData = z.infer<typeof mergeFormSchema>;

export default function PlayerMergeModal({ 
  isOpen, 
  onClose, 
  conflictData, 
  sourcePlayer, 
  onMergeComplete 
}: PlayerMergeModalProps) {
  const { toast } = useToast();
  const [selectedFields, setSelectedFields] = useState<Record<string, 'target' | 'source'>>({});
  const [mergeCareerStats, setMergeCareerStats] = useState(true);

  const form = useForm<MergeFormData>({
    resolver: zodResolver(mergeFormSchema),
    defaultValues: {
      mergeCareerStats: true,
      fieldsToUpdate: {}
    }
  });

  // Merge players mutation
  const mergePlayersMutation = useMutation({
    mutationFn: async (data: MergeFormData): Promise<any> => {
      const response = await apiRequest('POST', '/api/players/merge', data);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      toast({
        title: "Players merged successfully!",
        description: `${result.mergedPlayer.name}'s profiles have been consolidated.`,
      });
      onMergeComplete();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error merging players",
        description: error.message || "Failed to merge players. Please try again.",
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

  const handleFieldSelection = (field: string, value: 'target' | 'source') => {
    setSelectedFields(prev => ({ ...prev, [field]: value }));
  };

  const buildMergeData = (): MergeFormData => {
    if (!conflictData) throw new Error("No conflict data available");

    const fieldsToUpdate: any = {};
    
    // Build fieldsToUpdate based on selected fields
    Object.entries(selectedFields).forEach(([field, source]) => {
      if (source === 'source') {
        const sourceValue = (sourcePlayer as any)[field];
        if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
          fieldsToUpdate[field] = sourceValue;
        }
      }
      // If 'target' is selected, we don't need to update that field
    });

    return {
      targetPlayerId: conflictData.existingPlayer.id,
      sourcePlayerId: sourcePlayer.id,
      mergeCareerStats,
      fieldsToUpdate: Object.keys(fieldsToUpdate).length > 0 ? fieldsToUpdate : undefined
    };
  };

  const handleMerge = () => {
    if (!conflictData) return;
    
    try {
      const mergeData = buildMergeData();
      mergePlayersMutation.mutate(mergeData);
    } catch (error: any) {
      toast({
        title: "Error preparing merge",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!conflictData || !isOpen) return null;

  const existingPlayer = conflictData.existingPlayer;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Player Profile Conflict Detected
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
                  You can merge the profiles to consolidate their information.
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
                  Existing Player
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

            {/* Source Player Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Source Player
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {sourcePlayer.name || 'Not provided'}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {sourcePlayer.email || 'Not provided'}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Team</Label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {sourcePlayer.teamName || 'Not provided'}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Role</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {sourcePlayer.role ? (
                        <Badge className={getRoleBadgeColor(sourcePlayer.role)}>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(sourcePlayer.role)}
                            {sourcePlayer.role.replace('-', ' ')}
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
                const targetValue = (existingPlayer as any)[field];
                const sourceValue = (sourcePlayer as any)[field];
                
                // Only show fields that have different values
                if (targetValue === sourceValue || (!targetValue && !sourceValue)) {
                  return null;
                }
                
                return (
                  <div key={field} className="border rounded-lg p-4">
                    <Label className="text-sm font-medium capitalize mb-3 block">
                      {field.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </Label>
                    <RadioGroup
                      value={selectedFields[field] || 'target'}
                      onValueChange={(value) => handleFieldSelection(field, value as 'target' | 'source')}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="target" id={`${field}-target`} />
                        <Label htmlFor={`${field}-target`} className="flex-1">
                          Keep target: <strong>{targetValue || 'Not set'}</strong>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="source" id={`${field}-source`} />
                        <Label htmlFor={`${field}-source`} className="flex-1">
                          Use source: <strong>{sourceValue || 'Not set'}</strong>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                );
              })}
              
              {/* Career Stats Option */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="merge-career-stats"
                    checked={mergeCareerStats}
                    onCheckedChange={(checked) => setMergeCareerStats(checked === true)}
                    data-testid="checkbox-merge-stats"
                  />
                  <Label htmlFor="merge-career-stats" className="text-sm font-medium">
                    Merge career statistics (combine performance data from both profiles)
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-merge">
              Cancel
            </Button>
            <Button 
              onClick={handleMerge}
              disabled={mergePlayersMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="button-confirm-merge"
            >
              {mergePlayersMutation.isPending ? (
                "Merging..."
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Merge Profiles
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}