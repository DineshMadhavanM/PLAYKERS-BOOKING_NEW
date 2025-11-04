import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, X, MapPin, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  matchType: string;
  location: string;
  message: string | null;
  status: "unread" | "read" | "accepted" | "declined";
  createdAt: string;
}

export default function NotificationsDropdown() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadCountData } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: isOpen,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "read" | "accepted" | "declined" }) => {
      const response = await apiRequest("PATCH", `/api/notifications/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update notification",
        variant: "destructive",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/notifications/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Notification deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  const handleAccept = (id: string) => {
    updateStatusMutation.mutate({ id, status: "accepted" });
    toast({
      title: "Request accepted",
      description: "The sender has been notified",
    });
  };

  const handleDecline = (id: string) => {
    updateStatusMutation.mutate({ id, status: "declined" });
  };

  const handleMarkAsRead = (id: string) => {
    if (notifications.find(n => n.id === id)?.status === "unread") {
      updateStatusMutation.mutate({ id, status: "read" });
    }
  };

  const unreadCount = unreadCountData?.count || 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid="badge-notification-count"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[500px] overflow-y-auto p-0">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Match Requests</h3>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "No new requests"}
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground" data-testid="text-no-notifications">
            No match requests yet
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`border-0 rounded-none ${notification.status === "unread" ? "bg-accent/20" : ""}`}
                onClick={() => handleMarkAsRead(notification.id)}
                data-testid={`notification-${notification.id}`}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">{notification.senderName}</p>
                        <p className="text-sm text-muted-foreground">
                          {notification.senderEmail}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {notification.senderPhone}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <div className="flex gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                        <span>{notification.matchType}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{notification.location}</span>
                      </div>
                    </div>

                    {notification.message && (
                      <p className="text-sm text-muted-foreground italic">
                        "{notification.message}"
                      </p>
                    )}

                    {notification.status === "unread" || notification.status === "read" ? (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAccept(notification.id);
                          }}
                          className="flex-1"
                          data-testid={`button-accept-${notification.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDecline(notification.id);
                          }}
                          className="flex-1"
                          data-testid={`button-decline-${notification.id}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    ) : (
                      <div className="pt-2">
                        <Badge
                          variant={notification.status === "accepted" ? "default" : "secondary"}
                        >
                          {notification.status === "accepted" ? "Accepted" : "Declined"}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
