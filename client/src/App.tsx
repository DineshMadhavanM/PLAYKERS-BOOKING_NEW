import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Venues from "@/pages/venues";
import Matches from "@/pages/matches";
import Teams from "@/pages/teams";
import CreateTeam from "@/pages/create-team";
import EditTeam from "@/pages/edit-team";
import TeamDetail from "@/pages/team-detail";
import Profile from "@/pages/profile";
import Shop from "@/pages/shop";
import CreateMatch from "@/pages/create-match";
import MatchScorer from "@/pages/match-scorer";
import MatchSpectator from "@/pages/match-spectator";
import Admin from "@/pages/admin";
import PlayerProfile from "@/pages/player-profile";
import AcceptInvite from "@/pages/accept-invite";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Public route for accepting invitations
  if (window.location.pathname.startsWith('/accept-invite/')) {
    return <AcceptInvite />;
  }

  // If not authenticated, redirect all routes to landing page
  if (isLoading || !isAuthenticated) {
    return <Landing />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/venues" component={Venues} />
      <Route path="/matches" component={Matches} />
      <Route path="/teams" component={Teams} />
      <Route path="/teams/create" component={CreateTeam} />
      <Route path="/teams/:id/edit" component={EditTeam} />
      <Route path="/teams/:id" component={TeamDetail} />
      <Route path="/players/:id" component={PlayerProfile} />
      <Route path="/profile" component={Profile} />
      <Route path="/shop" component={Shop} />
      <Route path="/create-match" component={CreateMatch} />
      <Route path="/match/:id/score" component={MatchScorer} />
      <Route path="/match/:id/spectate" component={MatchSpectator} />
      <Route path="/admin" component={Admin} />
      <Route path="/accept-invite/:token" component={AcceptInvite} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
