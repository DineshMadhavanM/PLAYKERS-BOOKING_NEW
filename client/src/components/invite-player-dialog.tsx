import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Copy, Mail, Link as LinkIcon, UserPlus, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InvitePlayerDialogProps {
  invitationType?: "match" | "team";
  matchId?: string;
  teamId?: string;
  matchTitle?: string;
  teamName?: string;
  trigger?: React.ReactNode;
}

export default function InvitePlayerDialog({
  invitationType,
  matchId,
  teamId,
  matchTitle,
  teamName,
  trigger,
}: InvitePlayerDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Dynamic schema based on whether invitationType is provided as prop
  const inviteFormSchema = z.object({
    email: z.string().email("Valid email is required"),
    message: z.string().optional(),
    ...(invitationType ? {} : { 
      invitationType: z.enum(["match", "team"], { required_error: "Please select invitation type" }),
      matchId: z.string().optional(),
      teamId: z.string().optional(),
    }),
  });

  type InviteFormData = z.infer<typeof inviteFormSchema>;

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      message: "",
      ...(invitationType ? {} : { 
        invitationType: undefined as any,
        matchId: undefined,
        teamId: undefined,
      }),
    },
  });

  // Watch the invitationType field to conditionally fetch matches or teams
  const selectedInvitationType = form.watch("invitationType" as any);

  // Fetch available matches for selection
  const { data: matches = [] } = useQuery<any[]>({
    queryKey: ["/api/matches"],
    enabled: isOpen && !invitationType && selectedInvitationType === "match",
  });

  // Fetch available teams for selection (we'll need to add this endpoint)
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
    enabled: isOpen && !invitationType && selectedInvitationType === "team",
  });

  // Build query URL for invitations
  const invitationsQueryUrl = () => {
    if (!matchId && !teamId) return "/api/invitations";
    const params = new URLSearchParams();
    if (matchId) params.append("matchId", matchId);
    if (teamId) params.append("teamId", teamId);
    return `/api/invitations?${params.toString()}`;
  };

  // Fetch existing invitations (always fetch when dialog is open to show user's invitations)
  const { data: invitations = [], isLoading: isLoadingInvitations } = useQuery<any[]>({
    queryKey: [invitationsQueryUrl()],
    enabled: isOpen,
  });

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const payload: any = { ...data };
      // Use prop invitationType if provided, otherwise use form value
      payload.invitationType = invitationType || (data as any).invitationType;
      
      // Use prop values if provided, otherwise use form values
      const finalMatchId = matchId || (data as any).matchId;
      const finalTeamId = teamId || (data as any).teamId;
      
      if (finalMatchId) {
        payload.matchId = finalMatchId;
        // Find the match title from the matches list
        const match = matches.find((m: any) => m.id === finalMatchId);
        payload.matchTitle = matchTitle || match?.title;
      }
      if (finalTeamId) {
        payload.teamId = finalTeamId;
        // Find the team name from the teams list
        const team = teams.find((t: any) => t.id === finalTeamId);
        payload.teamName = teamName || team?.name;
      }
      
      const response = await apiRequest("POST", "/api/invitations", payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [invitationsQueryUrl()] });
      toast({
        title: "Invitation sent!",
        description: `An invitation has been sent to ${form.getValues("email")}`,
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  // Revoke invitation mutation
  const revokeInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await apiRequest("DELETE", `/api/invitations/${invitationId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invitationsQueryUrl()] });
      toast({
        title: "Invitation revoked",
        description: "The invitation has been revoked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke invitation",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: InviteFormData) => {
    createInvitationMutation.mutate(data);
  };

  const copyToClipboard = async (text: string, invitationId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(invitationId);
      toast({
        title: "Link copied!",
        description: "Invitation link copied to clipboard",
      });
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "default";
      case "accepted":
        return "default";
      case "expired":
        return "secondary";
      case "revoked":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button data-testid="button-invite-player">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Player
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-invite-player">
        <DialogHeader>
          <DialogTitle>
            {invitationType === "match" && matchTitle
              ? `Invite Players to ${matchTitle}`
              : invitationType === "team" && teamName
              ? `Invite Players to ${teamName}`
              : "Invite Player"}
          </DialogTitle>
          <DialogDescription>
            {matchId || teamId
              ? "Send email invitations or share a link for players to join"
              : "Send an email invitation to a player"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" data-testid="tab-email-invite">Email Invitation</TabsTrigger>
            <TabsTrigger value="manage" data-testid="tab-manage-invites">Manage Invites</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {!invitationType && (
                  <>
                    <FormField
                      control={form.control}
                      name="invitationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invitation Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-invitation-type">
                                <SelectValue placeholder="Select invitation type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="match" data-testid="option-match">Match Invitation</SelectItem>
                              <SelectItem value="team" data-testid="option-team">Team Invitation</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedInvitationType === "match" && (
                      <FormField
                        control={form.control}
                        name="matchId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Match</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-match">
                                  <SelectValue placeholder="Select a match" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {matches.map((match: any) => (
                                  <SelectItem key={match.id} value={match.id} data-testid={`option-match-${match.id}`}>
                                    {match.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {selectedInvitationType === "team" && (
                      <FormField
                        control={form.control}
                        name="teamId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Team</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-team">
                                  <SelectValue placeholder="Select a team" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {teams.map((team: any) => (
                                  <SelectItem key={team.id} value={team.id} data-testid={`option-team-${team.id}`}>
                                    {team.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="player@example.com"
                          data-testid="input-invite-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Add a personal message to the invitation..."
                          rows={3}
                          data-testid="input-invite-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createInvitationMutation.isPending}
                  className="w-full"
                  data-testid="button-send-invite"
                >
                  {createInvitationMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            {isLoadingInvitations ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : invitations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No invitations yet. Send your first invitation using the email tab.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <Card key={invitation.id} data-testid={`invitation-${invitation.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {invitation.email}
                          </CardTitle>
                          <div className="space-y-1 mt-1">
                            <p className="text-sm text-muted-foreground">
                              Sent {new Date(invitation.createdAt).toLocaleDateString()}
                            </p>
                            {invitation.invitationType && (
                              <p className="text-sm text-muted-foreground">
                                Type: <span className="font-medium capitalize">{invitation.invitationType}</span>
                                {invitation.invitationType === "match" && invitation.matchTitle && (
                                  <span> - {invitation.matchTitle}</span>
                                )}
                                {invitation.invitationType === "team" && invitation.teamName && (
                                  <span> - {invitation.teamName}</span>
                                )}
                              </p>
                            )}
                            {invitation.inviterName && (
                              <div className="text-sm text-muted-foreground">
                                <p>Invited by: {invitation.inviterName}</p>
                                {invitation.inviterId && (
                                  <p className="text-xs" data-testid={`text-sender-id-${invitation.id}`}>
                                    Sender ID: <span className="font-mono font-medium">{invitation.inviterId}</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant={getStatusColor(invitation.status)}>
                          {invitation.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {invitation.status === "pending" && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={invitation.invitationLink}
                              readOnly
                              className="text-sm"
                              data-testid={`input-link-${invitation.id}`}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                copyToClipboard(invitation.invitationLink, invitation.id)
                              }
                              data-testid={`button-copy-${invitation.id}`}
                            >
                              {copiedLink === invitation.id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => revokeInvitationMutation.mutate(invitation.id)}
                            disabled={revokeInvitationMutation.isPending}
                            data-testid={`button-revoke-${invitation.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        </div>
                      )}
                      {invitation.status === "accepted" && invitation.acceptedAt && (
                        <div className="space-y-2 bg-muted/50 p-3 rounded-md">
                          <p className="text-sm font-medium text-foreground">
                            ✓ Accepted on {new Date(invitation.acceptedAt).toLocaleDateString()}
                          </p>
                          <div className="space-y-1 text-sm">
                            {invitation.acceptedByUserId && (
                              <p className="text-muted-foreground" data-testid={`text-receiver-user-id-${invitation.id}`}>
                                Receiver User ID: <span className="font-mono font-medium text-foreground">{invitation.acceptedByUserId}</span>
                              </p>
                            )}
                            {invitation.acceptedByPlayerId && (
                              <p className="text-muted-foreground" data-testid={`text-receiver-player-id-${invitation.id}`}>
                                Receiver Player ID: <span className="font-mono font-medium text-foreground">{invitation.acceptedByPlayerId}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {invitation.status === "expired" && (
                        <p className="text-sm text-muted-foreground">
                          Expired on {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
