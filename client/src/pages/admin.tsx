import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Trash2, User, Users, Calendar, MapPin, Phone, Mail, Link as LinkIcon, Link2Off, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getDisplayName } from "@/lib/authUtils";

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  dateOfBirth?: string | null;
  location?: string | null;
  phoneNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PlayerEmailStatus {
  player: {
    id: string;
    name: string;
    email: string;
    userId: string | null;
    teamId: string | null;
    teamName: string | null;
  };
  isRegistered: boolean;
  matchingUser: User | null;
  isLinked: boolean;
  matchedLinked: boolean;
}

interface EmailCheckResponse {
  summary: {
    totalPlayers: number;
    playersWithEmail: number;
    registeredEmails: number;
    linkedPlayers: number;
    matchedLinkedPlayers: number;
    unlinkableRegisteredPlayers: number;
  };
  players: PlayerEmailStatus[];
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Query all users
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Query user count
  const {
    data: userCountData,
    isLoading: isLoadingCount,
  } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/users/count"],
  });

  // Query player email status
  const {
    data: emailCheckData,
    isLoading: isLoadingEmailCheck,
    error: emailCheckError,
    refetch: refetchEmailCheck
  } = useQuery<EmailCheckResponse>({
    queryKey: ["/api/admin/check-player-emails"],
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/count"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Link player mutation
  const linkPlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const response = await apiRequest("POST", `/api/admin/link-player/${playerId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/check-player-emails"] });
      toast({
        title: "Success",
        description: "Player successfully linked to user account",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unlink player mutation
  const unlinkPlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const response = await apiRequest("POST", `/api/admin/unlink-player/${playerId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/check-player-emails"] });
      toast({
        title: "Success",
        description: "Player successfully unlinked from user account",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  const handleLinkPlayer = (playerId: string) => {
    linkPlayerMutation.mutate(playerId);
  };

  const handleUnlinkPlayer = (playerId: string) => {
    unlinkPlayerMutation.mutate(playerId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (usersError) {
    return (
      <div className="container mx-auto p-6" data-testid="admin-error">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="admin-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-title">
            Admin Panel
          </h1>
          <p className="text-muted-foreground" data-testid="text-admin-subtitle">
            Manage users and system data
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          data-testid="button-back-home"
        >
          Back to Home
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="email-verification" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Verification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card data-testid="card-total-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-user-count">
                  {isLoadingCount ? "..." : userCountData?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Registered users on the platform
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-new-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Users Today</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter(user => {
                    const today = new Date().toDateString();
                    const userDate = new Date(user.createdAt).toDateString();
                    return today === userDate;
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Users registered today
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-active-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Users with Complete Profiles</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter(user => 
                    user.firstName && user.lastName && user.dateOfBirth && user.location
                  ).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Users with all profile fields filled
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card data-testid="card-users-table">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage all registered users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="text-center py-8" data-testid="loading-users">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8" data-testid="no-users">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </div>
              ) : (
                <div className="rounded-md border" data-testid="users-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Personal Info</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell>
                            <div className="font-medium" data-testid={`text-user-name-${user.id}`}>
                              {getDisplayName(user as any)}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {user.phoneNumber && (
                                <div className="flex items-center text-sm" data-testid={`text-user-phone-${user.id}`}>
                                  <Phone className="h-3 w-3 mr-1" />
                                  {user.phoneNumber}
                                </div>
                              )}
                              <div className="flex items-center text-sm" data-testid={`text-user-email-contact-${user.id}`}>
                                <Mail className="h-3 w-3 mr-1" />
                                {user.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {user.dateOfBirth && (
                                <div className="flex items-center text-sm" data-testid={`text-user-dob-${user.id}`}>
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatDate(user.dateOfBirth)}
                                </div>
                              )}
                              {user.location && (
                                <div className="flex items-center text-sm" data-testid={`text-user-location-${user.id}`}>
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {user.location}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-user-created-${user.id}`}>
                            {formatDate(user.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.firstName && user.lastName ? "default" : "secondary"}
                              data-testid={`badge-user-status-${user.id}`}
                            >
                              {user.firstName && user.lastName ? "Complete" : "Incomplete"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  data-testid={`button-delete-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent data-testid={`dialog-delete-${user.id}`}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the
                                    user account for {user.email}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid={`button-cancel-delete-${user.id}`}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                    data-testid={`button-confirm-delete-${user.id}`}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email-verification">
          {/* Email Verification Stats */}
          {emailCheckData && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <Card data-testid="card-total-players">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Players</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{emailCheckData.summary.totalPlayers}</div>
                  <p className="text-xs text-muted-foreground">All players in system</p>
                </CardContent>
              </Card>

              <Card data-testid="card-players-with-email">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">With Email</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{emailCheckData.summary.playersWithEmail}</div>
                  <p className="text-xs text-muted-foreground">Players with email addresses</p>
                </CardContent>
              </Card>

              <Card data-testid="card-registered-emails">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Registered</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{emailCheckData.summary.registeredEmails}</div>
                  <p className="text-xs text-muted-foreground">Emails found in user accounts</p>
                </CardContent>
              </Card>

              <Card data-testid="card-linked-players">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Linked</CardTitle>
                  <LinkIcon className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{emailCheckData.summary.linkedPlayers}</div>
                  <p className="text-xs text-muted-foreground">Players linked to user accounts</p>
                </CardContent>
              </Card>

              <Card data-testid="card-matched-linked">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Matched</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{emailCheckData.summary.matchedLinkedPlayers}</div>
                  <p className="text-xs text-muted-foreground">Correctly linked by email</p>
                </CardContent>
              </Card>

              <Card data-testid="card-linkable">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available to Link</CardTitle>
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{emailCheckData.summary.unlinkableRegisteredPlayers}</div>
                  <p className="text-xs text-muted-foreground">Registered players not yet linked</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Player Email Status Table */}
          <Card data-testid="card-player-email-status">
            <CardHeader>
              <CardTitle>Player Email Verification</CardTitle>
              <CardDescription>
                Check which players have registered emails and manage their account linkages
              </CardDescription>
              <div className="flex justify-end">
                <Button 
                  onClick={() => refetchEmailCheck()}
                  variant="outline"
                  size="sm"
                  data-testid="button-refresh-email-check"
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingEmailCheck ? (
                <div className="text-center py-8" data-testid="loading-email-check">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Checking player emails...</p>
                </div>
              ) : emailCheckError ? (
                <div className="text-center py-8" data-testid="error-email-check">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 mb-2">Failed to load player email data</p>
                  <Button onClick={() => refetchEmailCheck()} variant="outline">
                    Try Again
                  </Button>
                </div>
              ) : !emailCheckData || emailCheckData.players.length === 0 ? (
                <div className="text-center py-8" data-testid="no-player-emails">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No players with email addresses found</p>
                </div>
              ) : (
                <div className="rounded-md border" data-testid="player-email-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Email Status</TableHead>
                        <TableHead>Linked User</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailCheckData.players.map((playerStatus) => (
                        <TableRow key={playerStatus.player.id} data-testid={`row-player-${playerStatus.player.id}`}>
                          <TableCell>
                            <div className="font-medium" data-testid={`text-player-name-${playerStatus.player.id}`}>
                              {playerStatus.player.name}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-player-email-${playerStatus.player.id}`}>
                              {playerStatus.player.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {playerStatus.isRegistered ? (
                                <Badge variant="default" className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Registered
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Not Registered
                                </Badge>
                              )}
                              {playerStatus.isLinked && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <LinkIcon className="h-3 w-3" />
                                  Linked
                                </Badge>
                              )}
                              {playerStatus.matchedLinked && (
                                <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                                  <CheckCircle className="h-3 w-3" />
                                  Matched
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {playerStatus.matchingUser ? (
                              <div>
                                <div className="font-medium">
                                  {getDisplayName({
                                    id: playerStatus.matchingUser.id,
                                    firstName: playerStatus.matchingUser.firstName || null,
                                    lastName: playerStatus.matchingUser.lastName || null,
                                    email: playerStatus.matchingUser.email
                                  })}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {playerStatus.matchingUser.email}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {playerStatus.player.teamName ? (
                              <div>
                                <div className="font-medium">{playerStatus.player.teamName}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No team</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {playerStatus.isRegistered && !playerStatus.isLinked && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleLinkPlayer(playerStatus.player.id)}
                                  disabled={linkPlayerMutation.isPending}
                                  data-testid={`button-link-${playerStatus.player.id}`}
                                >
                                  {linkPlayerMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <LinkIcon className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                              {playerStatus.isLinked && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnlinkPlayer(playerStatus.player.id)}
                                  disabled={unlinkPlayerMutation.isPending}
                                  data-testid={`button-unlink-${playerStatus.player.id}`}
                                >
                                  {unlinkPlayerMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Link2Off className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}