import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { Eye } from "lucide-react";

interface WatchLiveMatchDialogProps {
  trigger: React.ReactNode;
}

export default function WatchLiveMatchDialog({ trigger }: WatchLiveMatchDialogProps) {
  const [open, setOpen] = useState(false);
  const [matchId, setMatchId] = useState("");
  const [, navigate] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matchId.trim()) {
      navigate(`/match/${matchId.trim()}/spectate`);
      setOpen(false);
      setMatchId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>
        {trigger}
      </div>
      <DialogContent className="sm:max-w-md" data-testid="dialog-watch-live-match">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Watch Live Match
          </DialogTitle>
          <DialogDescription>
            Enter the match ID to watch a live match or view completed match results
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="matchId">Match ID</Label>
              <Input
                id="matchId"
                placeholder="Enter match ID..."
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
                data-testid="input-match-id"
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Ask the match organizer for the match ID to watch live
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setMatchId("");
              }}
              data-testid="button-cancel-watch"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!matchId.trim()}
              data-testid="button-watch-match"
            >
              <Eye className="h-4 w-4 mr-2" />
              Watch Match
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
