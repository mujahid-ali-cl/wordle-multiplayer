import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Lobby from "@/pages/lobby";
import Game from "@/pages/game";
import Results from "@/pages/results";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Lobby} />
      <Route path="/game/:roomCode" component={Game} />
      <Route path="/results/:roomCode" component={Results} />
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
