import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Calendar, Users, BarChart3, Bell, Trophy, Plus } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      {/* Navigation for logged out users */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-primary">Playkers</h1>
            <Button onClick={() => window.location.href = '/api/login'} data-testid="button-login">
              Login
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 to-accent/10 py-20" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Book Venues, Create Matches, Track Stats
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              The ultimate platform for sports enthusiasts to book venues, organize matches, and track performance across cricket, football, volleyball, tennis, and kabaddi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-find-venues"
              >
                Find Venues Near You
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-create-first-match"
              >
                Create Your First Match
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Sports Categories */}
      <section className="py-16 bg-background" data-testid="sports-categories">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Sports We Support</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { name: "Cricket", emoji: "🏏", desc: "Complete scoring system with overs, runs, wickets" },
              { name: "Football", emoji: "⚽", desc: "Track goals, assists, cards, and match time" },
              { name: "Volleyball", emoji: "🏐", desc: "Set-based scoring with serves and spikes" },
              { name: "Tennis", emoji: "🎾", desc: "Game, set, match scoring system" },
              { name: "Kabaddi", emoji: "🤼", desc: "Track raids, tackles, and team points" },
            ].map((sport) => (
              <Card key={sport.name} className="text-center hover:shadow-lg transition-shadow" data-testid={`card-sport-${sport.name.toLowerCase()}`}>
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{sport.emoji}</div>
                  <h3 className="font-semibold text-lg mb-2">{sport.name}</h3>
                  <p className="text-muted-foreground text-sm">{sport.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Venues */}
      <section className="py-16 bg-muted/30" data-testid="sample-venues">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Popular Venues</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "SportsPlex Cricket Ground",
                rating: 4.8,
                location: "2.5 km • Central Delhi",
                sports: ["Cricket", "Football"],
                price: "₹1,200",
                image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250"
              },
              {
                name: "Elite Football Arena",
                rating: 4.6,
                location: "1.8 km • South Delhi",
                sports: ["Football", "Volleyball"],
                price: "₹800",
                image: "https://images.unsplash.com/photo-1459865264687-595d652de67e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250"
              },
              {
                name: "Premium Tennis Club",
                rating: 4.9,
                location: "3.2 km • West Delhi",
                sports: ["Tennis"],
                price: "₹1,500",
                image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250"
              },
            ].map((venue, index) => (
              <Card key={index} className="overflow-hidden shadow-lg" data-testid={`card-venue-${index}`}>
                <img src={venue.image} alt={venue.name} className="w-full h-48 object-cover" />
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold">{venue.name}</h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="h-4 w-4 text-yellow-400 mr-1 fill-yellow-400" />
                      <span>{venue.rating}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {venue.location}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {venue.sports.map((sport) => (
                      <Badge key={sport} variant="secondary">{sport}</Badge>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-lg font-bold text-primary">{venue.price}</span>
                      <span className="text-muted-foreground">/hour</span>
                    </div>
                    <Button onClick={() => window.location.href = '/api/login'} data-testid={`button-book-venue-${index}`}>
                      Book Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Create Match CTA */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-accent/10" data-testid="create-match-cta">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Organize a Match?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Create matches, invite players, and track scores in real-time with our comprehensive scoring system.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Invite Players</h3>
                <p className="text-muted-foreground text-sm">Send invites via email or app notifications</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 text-accent mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Live Scoring</h3>
                <p className="text-muted-foreground text-sm">Real-time score updates for all supported sports</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Track Stats</h3>
                <p className="text-muted-foreground text-sm">Comprehensive player and team statistics</p>
              </CardContent>
            </Card>
          </div>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-create-match"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Your Match
          </Button>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-16 bg-muted/30" data-testid="features-overview">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Playkers?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: MapPin, title: "Location-Based Search", desc: "Find venues near you with Google Maps integration" },
              { icon: BarChart3, title: "Comprehensive Scoring", desc: "Advanced scoring systems for all major sports" },
              { icon: Bell, title: "Smart Notifications", desc: "Email, SMS, and push notifications for updates" },
              { icon: Star, title: "Reviews & Ratings", desc: "Community-driven venue and player ratings" },
            ].map((feature, index) => (
              <div key={index} className="text-center" data-testid={`feature-${index}`}>
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-primary mb-4">Playkers</h3>
              <p className="text-muted-foreground mb-4">
                The ultimate platform for sports venue booking, match organization, and performance tracking.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Book Venues</li>
                <li>Create Matches</li>
                <li>Track Stats</li>
                <li>Shop Equipment</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Sports</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Cricket</li>
                <li>Football</li>
                <li>Tennis</li>
                <li>Volleyball</li>
                <li>Kabaddi</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2023 Playkers. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
