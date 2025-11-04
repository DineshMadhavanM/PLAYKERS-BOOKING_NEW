import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle, XCircle, UserPlus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const guestPlayerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
});

type GuestPlayerData = z.infer<typeof guestPlayerSchema>;

export default function AcceptInvite() {
  const [, params] = useRoute("/accept-invite/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAccepted, setIsAccepted] = useState(false);
  const token = params?.token;

  const form = useForm<GuestPlayerData>({
    resolver: zodResolver(guestPlayerSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  // Fetch invitation details
  const {
    data: invitation,
    isLoading,
    error,
  } = useQuery<any>({
    queryKey: ["/api/invitations/token", token],
    queryFn: async () => {
      if (!token) throw new Error("No invitation token provided");
      const response = await fetch(`/api/invitations/token/${token}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch invitation");
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async (guestPlayerData?: GuestPlayerData) => {
      if (!token) throw new Error("No invitation token");
      const response = await apiRequest("POST", `/api/invitations/${token}/accept`, {
        guestPlayerData,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsAccepted(true);
      toast({
        title: "Invitation accepted!",
        description: "You have successfully joined.",
      });
      // Redirect after a short delay
      setTimeout(() => {
        if (invitation?.invitationType === "match" && invitation?.matchId) {
          setLocation(`/matches/${invitation.matchId}`);
        } else if (invitation?.invitationType === "team" && invitation?.teamId) {
          setLocation(`/teams/${invitation.teamId}`);
        } else {
          setLocation("/");
        }
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    },
  });

  const handleGuestJoin = (data: GuestPlayerData) => {
    acceptMutation.mutate(data);
  };

  // Pre-fill email if it's in the invitation
  useEffect(() => {
    if (invitation?.email) {
      form.setValue("email", invitation.email);
    }
  }, [invitation, form]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-center">Invitation Not Found</CardTitle>
            <CardDescription className="text-center">
              {error instanceof Error ? error.message : "This invitation link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full" data-testid="button-go-home">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center">Invitation Accepted!</CardTitle>
            <CardDescription className="text-center">
              Redirecting you now...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (invitation.status !== "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-center">Invitation {invitation.status}</CardTitle>
            <CardDescription className="text-center">
              {invitation.status === "accepted" && "This invitation has already been accepted."}
              {invitation.status === "expired" && "This invitation has expired."}
              {invitation.status === "revoked" && "This invitation has been revoked."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <UserPlus className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-center">You're Invited!</CardTitle>
          <CardDescription className="text-center">
            <span className="font-semibold">{invitation.inviterName}</span> has invited you to join{" "}
            <span className="font-semibold">
              {invitation.invitationType === "match" ? invitation.matchTitle : invitation.teamName}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitation.message && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm italic">&quot;{invitation.message}&quot;</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium">Join as a guest player:</p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleGuestJoin)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="John Doe"
                          data-testid="input-guest-name"
                        />
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
                      <FormLabel>Your Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="john@example.com"
                          data-testid="input-guest-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={acceptMutation.isPending}
                  data-testid="button-join-as-guest"
                >
                  {acceptMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Join as Guest
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Expires {new Date(invitation.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
