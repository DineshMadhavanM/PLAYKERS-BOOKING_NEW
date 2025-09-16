import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Play } from "lucide-react";
import { useLocation } from "wouter";
import type { Venue } from "@shared/schema";

interface VenueCardProps {
  venue: Venue;
  isMatchCreationMode?: boolean;
  selectedTeamId?: string | null;
}

export default function VenueCard({ venue, isMatchCreationMode = false, selectedTeamId }: VenueCardProps) {
  const [, navigate] = useLocation();

  const handleBookNow = () => {
    // TODO: Implement booking flow
    console.log("Book venue:", venue.id);
  };

  const handleStartMatch = () => {
    // Navigate to create match page with cricket pre-selected and venue/team info
    const params = new URLSearchParams();
    params.set('sport', 'cricket');
    params.set('venue', venue.id);
    if (selectedTeamId) {
      params.set('team', selectedTeamId);
    }
    navigate(`/create-match?${params.toString()}`);
  };

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow" data-testid={`card-venue-${venue.id}`}>
      {venue.images && venue.images.length > 0 && (
        <img 
          src={venue.images[0]} 
          alt={venue.name} 
          className="w-full h-48 object-cover"
          data-testid={`img-venue-${venue.id}`}
        />
      )}
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-semibold" data-testid={`text-venue-name-${venue.id}`}>
            {venue.name}
          </h3>
          <div className="flex items-center text-sm text-muted-foreground">
            <Star className="h-4 w-4 text-yellow-400 mr-1 fill-yellow-400" />
            <span data-testid={`text-venue-rating-${venue.id}`}>
              {venue.rating ? Number(venue.rating).toFixed(1) : "0.0"}
            </span>
          </div>
        </div>
        
        <p className="text-muted-foreground mb-3 flex items-center" data-testid={`text-venue-address-${venue.id}`}>
          <MapPin className="h-4 w-4 mr-1" />
          {venue.city}, {venue.state}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {venue.sports.map((sport) => (
            <Badge key={sport} variant="secondary" data-testid={`badge-sport-${sport}`}>
              {sport}
            </Badge>
          ))}
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <span className="text-lg font-bold text-primary" data-testid={`text-venue-price-${venue.id}`}>
              ₹{Number(venue.pricePerHour).toLocaleString()}
            </span>
            <span className="text-muted-foreground">/hour</span>
          </div>
          {isMatchCreationMode ? (
            <Button 
              onClick={handleStartMatch} 
              data-testid={`button-start-match-venue-${venue.id}`}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start a Match
            </Button>
          ) : (
            <Button onClick={handleBookNow} data-testid={`button-book-venue-${venue.id}`}>
              Book Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
