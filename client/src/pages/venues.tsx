import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import VenueCard from "@/components/venue-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function Venues() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: venues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ["/api/venues", { sport: selectedSport, search: searchTerm, city: selectedCity }],
    enabled: isAuthenticated,
  });

  const handleSearch = () => {
    // The query will automatically refetch when dependencies change
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  const sports = ["cricket", "football", "volleyball", "tennis", "kabaddi"];
  const cities = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad"];

  return (
    <div className="min-h-screen bg-background" data-testid="venues-page">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-6">Find Sports Venues</h1>
          
          {/* Search and Filters */}
          <div className="mb-8 flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input 
                type="text" 
                placeholder="Search venues by name or location..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-venues"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger className="w-[180px]" data-testid="select-sport-filter">
                  <SelectValue placeholder="All Sports" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sports</SelectItem>
                  {sports.map((sport) => (
                    <SelectItem key={sport} value={sport}>
                      {sport.charAt(0).toUpperCase() + sport.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-[180px]" data-testid="select-city-filter">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleSearch} data-testid="button-search-venues">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {venuesLoading && (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p>Searching venues...</p>
            </div>
          </div>
        )}

        {/* Venues Grid */}
        {!venuesLoading && (
          <>
            <div className="mb-4">
              <p className="text-muted-foreground" data-testid="text-venues-count">
                {venues.length} venue{venues.length !== 1 ? 's' : ''} found
              </p>
            </div>
            
            {venues.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-venues">
                <div className="text-6xl mb-4">🏟️</div>
                <h3 className="text-xl font-semibold mb-2">No venues found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search criteria or check back later for new venues.
                </p>
                <Button onClick={() => {
                  setSearchTerm("");
                  setSelectedSport("");
                  setSelectedCity("");
                }} data-testid="button-clear-filters">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {venues.map((venue: any) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
