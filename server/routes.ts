import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeEmailAuth, requireAuth, registerUser, loginUser } from "./emailAuth";
import {
  insertVenueSchema,
  insertMatchSchema,
  insertBookingSchema,
  insertProductSchema,
  insertReviewSchema,
  insertMatchParticipantSchema,
  insertCartItemSchema,
} from "@shared/schema";
import { z } from "zod";

// CSRF protection middleware
function csrfProtection(req: any, res: any, next: any) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  const host = req.get('Host');
  
  if (!origin && !referer) {
    return res.status(403).json({ message: 'Missing Origin or Referer header' });
  }
  
  const allowedOrigins = [
    `http://${host}`,
    `https://${host}`,
    `http://localhost:5000`,
    `https://localhost:5000`
  ];
  
  const isValidOrigin = origin && allowedOrigins.some(allowed => origin.startsWith(allowed));
  const isValidReferer = referer && allowedOrigins.some(allowed => referer.startsWith(allowed));
  
  if (!isValidOrigin && !isValidReferer) {
    return res.status(403).json({ message: 'Invalid origin or referer' });
  }
  
  next();
}

// Validation schemas for authentication
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dateOfBirth: z.string().optional(),
  location: z.string().optional(),
  phoneNumber: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set trust proxy for production
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  
  // Initialize email/password authentication
  initializeEmailAuth(app);
  
  // Apply CSRF protection to all routes
  app.use(csrfProtection);

  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, dateOfBirth, location, phoneNumber } = registerSchema.parse(req.body);
      const user = await registerUser(email, password, firstName, lastName, dateOfBirth, location, phoneNumber);
      
      // Regenerate session to prevent session fixation
      (req as any).session.regenerate((err: any) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({ message: 'Failed to create secure session' });
        }
        
        // Strip password from user object before storing in session
        const { password: _, ...userWithoutPassword } = user;
        (req as any).session.user = userWithoutPassword;
        
        res.status(201).json({ 
          message: "User registered successfully", 
          user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } 
        });
      });
    } catch (error: any) {
      console.error("Error registering user:", error);
      res.status(400).json({ message: error.message || "Failed to register user" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await loginUser(email, password);
      
      // Regenerate session to prevent session fixation
      (req as any).session.regenerate((err: any) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({ message: 'Failed to create secure session' });
        }
        
        // Set user in session (password already stripped by loginUser)
        (req as any).session.user = user;
        
        res.json({ 
          message: "Login successful", 
          user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } 
        });
      });
    } catch (error: any) {
      console.error("Error logging in user:", error);
      res.status(401).json({ message: error.message || "Failed to log in" });
    }
  });

  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((error: any) => {
      if (error) {
        console.error("Error logging out:", error);
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Venue routes
  app.get('/api/venues', async (req, res) => {
    try {
      const { sport, city, search } = req.query;
      const venues = await storage.getVenues({
        sport: sport as string,
        city: city as string,
        search: search as string,
      });
      res.json(venues);
    } catch (error) {
      console.error("Error fetching venues:", error);
      res.status(500).json({ message: "Failed to fetch venues" });
    }
  });

  app.get('/api/venues/:id', async (req, res) => {
    try {
      const venue = await storage.getVenue(req.params.id);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      res.json(venue);
    } catch (error) {
      console.error("Error fetching venue:", error);
      res.status(500).json({ message: "Failed to fetch venue" });
    }
  });

  app.post('/api/venues', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const venueData = insertVenueSchema.parse({ ...req.body, ownerId: userId });
      const venue = await storage.createVenue(venueData);
      res.status(201).json(venue);
    } catch (error) {
      console.error("Error creating venue:", error);
      res.status(500).json({ message: "Failed to create venue" });
    }
  });

  // Match routes
  app.get('/api/matches', async (req, res) => {
    try {
      const { sport, status, isPublic } = req.query;
      const matches = await storage.getMatches({
        sport: sport as string,
        status: status as string,
        isPublic: isPublic === 'true',
      });
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.get('/api/matches/:id', async (req, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      console.error("Error fetching match:", error);
      res.status(500).json({ message: "Failed to fetch match" });
    }
  });

  app.post('/api/matches', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      
      // Convert scheduledAt string to Date object if it's a string
      const requestBody = { ...req.body, organizerId: userId };
      if (requestBody.scheduledAt && typeof requestBody.scheduledAt === 'string') {
        requestBody.scheduledAt = new Date(requestBody.scheduledAt);
      }
      
      const matchData = insertMatchSchema.parse(requestBody);
      const match = await storage.createMatch(matchData);
      res.status(201).json(match);
    } catch (error) {
      console.error("Error creating match:", error);
      res.status(500).json({ message: "Failed to create match" });
    }
  });

  app.put('/api/matches/:id', requireAuth, async (req: any, res) => {
    try {
      // Get the existing match to preserve important data like roster
      const existingMatch = await storage.getMatch(req.params.id);
      if (!existingMatch) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Merge the update data with existing match data
      // Always preserve the existing matchData (which contains roster information) while allowing score updates
      const updateData = { ...req.body };
      
      // Get existing and incoming matchData
      const existingMatchData = (existingMatch.matchData ?? {}) as any;
      const incomingMatchData = (req.body.matchData ?? {}) as any;
      
      // Always preserve roster data, even if the update doesn't include matchData
      updateData.matchData = {
        ...existingMatchData,  // Preserve all existing data (including rosters)
        ...incomingMatchData,  // Apply new updates (like scores)
        // Explicitly preserve roster data to ensure it's never lost
        team1Roster: incomingMatchData.team1Roster ?? existingMatchData.team1Roster,
        team2Roster: incomingMatchData.team2Roster ?? existingMatchData.team2Roster,
      };

      const match = await storage.updateMatch(req.params.id, updateData);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      console.error("Error updating match:", error);
      res.status(500).json({ message: "Failed to update match" });
    }
  });

  // Match participants routes
  app.get('/api/matches/:id/participants', async (req, res) => {
    try {
      const participants = await storage.getMatchParticipants(req.params.id);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching match participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  // Match roster routes (for cricket team rosters)
  app.get('/api/matches/:id/roster', async (req, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Extract roster data from matchData if it exists
      const matchData = match.matchData as any;
      if (matchData && matchData.team1Roster && matchData.team2Roster) {
        // Flatten the rosters and add team information
        const team1Players = matchData.team1Roster.map((player: any) => ({
          ...player,
          team: 'team1',
          matchId: req.params.id
        }));
        
        const team2Players = matchData.team2Roster.map((player: any) => ({
          ...player,
          team: 'team2',
          matchId: req.params.id
        }));
        
        const allPlayers = [...team1Players, ...team2Players];
        res.json(allPlayers);
      } else {
        // Return empty array if no roster data
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching match roster:", error);
      res.status(500).json({ message: "Failed to fetch roster" });
    }
  });

  app.post('/api/matches/:id/join', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const participantData = insertMatchParticipantSchema.parse({
        matchId: req.params.id,
        userId,
        ...req.body,
      });
      const participant = await storage.addMatchParticipant(participantData);
      res.status(201).json(participant);
    } catch (error) {
      console.error("Error joining match:", error);
      res.status(500).json({ message: "Failed to join match" });
    }
  });

  app.delete('/api/matches/:id/leave', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const success = await storage.removeMatchParticipant(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Participation not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error leaving match:", error);
      res.status(500).json({ message: "Failed to leave match" });
    }
  });

  // User matches route
  app.get('/api/user/matches', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const matches = await storage.getUserMatches(userId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching user matches:", error);
      res.status(500).json({ message: "Failed to fetch user matches" });
    }
  });

  // Booking routes
  app.get('/api/bookings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const bookings = await storage.getBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post('/api/bookings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const bookingData = insertBookingSchema.parse({ ...req.body, userId });
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Product routes
  app.get('/api/products', async (req, res) => {
    try {
      const { category, search } = req.query;
      const products = await storage.getProducts({
        category: category as string,
        search: search as string,
      });
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Cart routes
  app.get('/api/cart', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const cartItems = await storage.getCartItems(userId);
      res.json(cartItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.post('/api/cart', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const cartData = insertCartItemSchema.parse({ ...req.body, userId });
      const cartItem = await storage.addToCart(cartData);
      res.status(201).json(cartItem);
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Failed to add to cart" });
    }
  });

  app.put('/api/cart/:id', requireAuth, async (req, res) => {
    try {
      const { quantity } = req.body;
      const cartItem = await storage.updateCartItem(req.params.id, quantity);
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json(cartItem);
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete('/api/cart/:id', requireAuth, async (req, res) => {
    try {
      const success = await storage.removeFromCart(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ message: "Failed to remove from cart" });
    }
  });

  // Review routes
  app.get('/api/reviews', async (req, res) => {
    try {
      const { venueId, productId } = req.query;
      const reviews = await storage.getReviews(venueId as string, productId as string);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post('/api/reviews', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const reviewData = insertReviewSchema.parse({ ...req.body, userId });
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // User stats routes
  app.get('/api/user/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Admin routes for user management
  function requireAdmin(req: any, res: any, next: any) {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Check if user has admin role
    if (!req.session.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    next();
  }

  // Helper function to sanitize user data (remove password)
  function sanitizeUser(user: any) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  // Get all users for admin panel
  app.get('/api/admin/users', requireAdmin, async (req: any, res) => {
    try {
      if (storage.getAllUsers) {
        const users = await storage.getAllUsers();
        // Remove password from response for security
        const sanitizedUsers = users.map(sanitizeUser);
        res.json(sanitizedUsers);
      } else {
        res.status(501).json({ message: "Admin functionality not available" });
      }
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get user count for admin dashboard
  app.get('/api/admin/users/count', requireAdmin, async (req: any, res) => {
    try {
      if (storage.getUserCount) {
        const count = await storage.getUserCount();
        res.json({ count });
      } else {
        res.status(501).json({ message: "Admin functionality not available" });
      }
    } catch (error) {
      console.error("Error fetching user count:", error);
      res.status(500).json({ message: "Failed to fetch user count" });
    }
  });

  // Get single user details for admin
  app.get('/api/admin/users/:id', requireAdmin, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Remove password from response for security
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Delete user for admin
  app.delete('/api/admin/users/:id', requireAdmin, async (req: any, res) => {
    try {
      if (storage.deleteUser) {
        const success = await storage.deleteUser(req.params.id);
        if (!success) {
          return res.status(404).json({ message: "User not found" });
        }
        res.status(204).send();
      } else {
        res.status(501).json({ message: "Admin functionality not available" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
