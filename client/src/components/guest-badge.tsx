import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface GuestBadgeProps {
  className?: string;
}

export default function GuestBadge({ className }: GuestBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className={className} data-testid="badge-guest">
          <UserPlus className="h-3 w-3 mr-1" />
          Guest
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Temporary guest player</p>
      </TooltipContent>
    </Tooltip>
  );
}
