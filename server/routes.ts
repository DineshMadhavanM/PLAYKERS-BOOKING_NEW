import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeEmailAuth, requireAuth, registerUser, loginUser } from "./emailAuth";
import {
  insertVenueSchema,
  insertMatchSchema,
  insertCricketMatchSchema,
  insertBookingSchema,
  insertProductSchema,
  insertReviewSchema,
  insertMatchParticipantSchema,
  insertCartItemSchema,
  insertTeamSchema,
  insertPlayerSchema,
  matchCompletionSchema,
  MatchCompletionInput,
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

  // Profile update schema
  const profileUpdateSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be at most 30 characters").regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens").optional().or(z.literal("")),
    dateOfBirth: z.string().optional(),
    location: z.string().optional(),
    phoneNumber: z.string().optional(),
  });

  app.put('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const updateData = profileUpdateSchema.parse(req.body);
      
      // Convert empty string username to null for database
      const processedData = {
        ...updateData,
        username: updateData.username === "" ? null : updateData.username,
        dateOfBirth: updateData.dateOfBirth ? updateData.dateOfBirth : null,
        location: updateData.location || null,
        phoneNumber: updateData.phoneNumber || null,
      };
      
      // Get current user to preserve existing data
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Use upsertUser to update the profile
      const updatedUser = await storage.upsertUser({
        id: userId,
        email: processedData.email,
        username: processedData.username || null,
        firstName: processedData.firstName || null,
        lastName: processedData.lastName || null,
        profileImageUrl: currentUser.profileImageUrl, // Preserve existing image
        dateOfBirth: processedData.dateOfBirth ? new Date(processedData.dateOfBirth) : null,
        location: processedData.location || null,
        phoneNumber: processedData.phoneNumber || null,
        isAdmin: currentUser.isAdmin || false, // Preserve existing admin status
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ message: "Profile updated successfully", user: userWithoutPassword });
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      
      if (error.code === 'ER_DUP_ENTRY' || error.message.includes('duplicate')) {
        return res.status(400).json({ message: "Username already exists. Please choose a different username." });
      }
      
      res.status(400).json({ message: error.message || "Failed to update profile" });
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

  // Team routes
  app.get('/api/teams', async (req, res) => {
    try {
      const { search } = req.query;
      const teams = await storage.getTeams({
        search: search as string,
      });
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get('/api/teams/:id', async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.post('/api/teams', requireAuth, async (req: any, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(teamData);
      res.status(201).json(team);
    } catch (error: any) {
      console.error("Error creating team:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", issues: error.issues });
      }
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.put('/api/teams/:id', requireAuth, async (req, res) => {
    try {
      const teamData = insertTeamSchema.partial().parse(req.body);
      const team = await storage.updateTeam(req.params.id, teamData);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error: any) {
      console.error("Error updating team:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", issues: error.issues });
      }
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  app.delete('/api/teams/:id', requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteTeam(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Get team match history
  app.get('/api/teams/:id/matches', async (req, res) => {
    try {
      const matches = await storage.getTeamMatchHistory(req.params.id);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching team match history:", error);
      res.status(500).json({ message: "Failed to fetch team match history" });
    }
  });

  // Player routes
  app.get('/api/players', async (req, res) => {
    try {
      const { teamId, role, search } = req.query;
      const players = await storage.getPlayers({
        teamId: teamId as string,
        role: role as string,
        search: search as string,
      });
      res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  app.get('/api/players/:id', async (req, res) => {
    try {
      const player = await storage.getPlayer(req.params.id);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      res.json(player);
    } catch (error) {
      console.error("Error fetching player:", error);
      res.status(500).json({ message: "Failed to fetch player" });
    }
  });

  app.post('/api/players', requireAuth, async (req: any, res) => {
    try {
      const playerData = insertPlayerSchema.parse(req.body);
      const player = await storage.createPlayer(playerData);
      res.status(201).json(player);
    } catch (error: any) {
      console.error("Error creating player:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", issues: error.issues });
      }
      res.status(500).json({ message: "Failed to create player" });
    }
  });

  app.put('/api/players/:id', requireAuth, async (req, res) => {
    try {
      const playerData = insertPlayerSchema.partial().parse(req.body);
      const player = await storage.updatePlayer(req.params.id, playerData);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      res.json(player);
    } catch (error: any) {
      console.error("Error updating player:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", issues: error.issues });
      }
      res.status(500).json({ message: "Failed to update player" });
    }
  });

  app.delete('/api/players/:id', requireAuth, async (req, res) => {
    try {
      const success = await storage.deletePlayer(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Player not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting player:", error);
      res.status(500).json({ message: "Failed to delete player" });
    }
  });

  // Get player match history
  app.get('/api/players/:id/matches', async (req, res) => {
    try {
      const matches = await storage.getPlayerMatchHistory(req.params.id);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching player match history:", error);
      res.status(500).json({ message: "Failed to fetch player match history" });
    }
  });

  // Get player by user ID
  app.get('/api/users/:userId/player', async (req, res) => {
    try {
      const player = await storage.getPlayerByUserId(req.params.userId);
      if (!player) {
        return res.status(404).json({ message: "Player profile not found" });
      }
      res.json(player);
    } catch (error) {
      console.error("Error fetching player by user ID:", error);
      res.status(500).json({ message: "Failed to fetch player profile" });
    }
  });

  // Enhanced cricket match routes
  app.post('/api/matches/cricket', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const requestBody = { ...req.body, organizerId: userId };
      
      // Convert scheduledAt string to Date object if it's a string
      if (requestBody.scheduledAt && typeof requestBody.scheduledAt === 'string') {
        requestBody.scheduledAt = new Date(requestBody.scheduledAt);
      }
      
      const cricketMatchData = insertCricketMatchSchema.parse(requestBody);
      const match = await storage.createCricketMatch(cricketMatchData);
      res.status(201).json(match);
    } catch (error: any) {
      console.error("Error creating cricket match:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", issues: error.issues });
      }
      res.status(500).json({ message: "Failed to create cricket match" });
    }
  });

  // Update match scorecard
  app.put('/api/matches/:id/scorecard', requireAuth, async (req, res) => {
    try {
      const { scorecard } = req.body;
      const match = await storage.updateMatchScorecard(req.params.id, scorecard);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      console.error("Error updating match scorecard:", error);
      res.status(500).json({ message: "Failed to update match scorecard" });
    }
  });

  // Save player profiles with match statistics
  app.post('/api/matches/:id/save-player-profiles', requireAuth, async (req, res) => {
    try {
      const matchId = req.params.id;
      const { playerStats } = req.body;
      
      console.log(`🔄 Saving player profiles for match ${matchId}`);
      
      if (!playerStats || !Array.isArray(playerStats)) {
        return res.status(400).json({ message: "Player stats array is required" });
      }
      
      // Validate and dedupe player stats
      const validatedPlayerStats = [];
      const seenPlayerIds = new Set();
      
      for (const stat of playerStats) {
        // Basic validation
        if (!stat.playerId || !stat.teamId) {
          console.warn('Skipping player stat with missing playerId or teamId:', stat);
          continue;
        }
        
        // Dedupe by playerId (keep first occurrence)
        if (seenPlayerIds.has(stat.playerId)) {
          console.warn(`Duplicate playerId ${stat.playerId} found, skipping`);
          continue;
        }
        
        seenPlayerIds.add(stat.playerId);
        validatedPlayerStats.push({
          playerId: stat.playerId,
          teamId: stat.teamId,
          runsScored: typeof stat.runsScored === 'number' ? stat.runsScored : 0,
          ballsFaced: typeof stat.ballsFaced === 'number' ? stat.ballsFaced : 0,
          fours: typeof stat.fours === 'number' ? stat.fours : 0,
          sixes: typeof stat.sixes === 'number' ? stat.sixes : 0,
          isOut: Boolean(stat.isOut),
          oversBowled: typeof stat.oversBowled === 'number' ? stat.oversBowled : 0,
          runsGiven: typeof stat.runsGiven === 'number' ? stat.runsGiven : 0,
          wicketsTaken: typeof stat.wicketsTaken === 'number' ? stat.wicketsTaken : 0,
          maidens: typeof stat.maidens === 'number' ? stat.maidens : 0,
          manOfMatch: Boolean(stat.manOfMatch)
        });
      }
      
      if (validatedPlayerStats.length === 0) {
        return res.status(400).json({ message: "No valid player statistics found" });
      }
      
      // Save individual player career statistics
      const result = await storage.updatePlayerCareerStats(matchId, validatedPlayerStats);
      
      if (result.success) {
        res.json({
          message: "Player profiles updated successfully",
          playersUpdated: result.playersUpdated,
          cacheInvalidation: result.cacheInvalidation
        });
      } else {
        res.status(500).json({
          message: "Failed to update some player profiles",
          errors: result.errors
        });
      }
      
    } catch (error: any) {
      console.error('Error saving player profiles:', error);
      res.status(500).json({ message: "Failed to save player profiles" });
    }
  });

  // Complete a cricket match with final scorecard and statistics
  app.post('/api/matches/:id/complete', requireAuth, async (req: any, res) => {
    try {
      const matchId = req.params.id;
      console.log(`📊 DATA FLOW STEP 1: Starting match completion for match ${matchId}`);
      
      // Check if match exists and is not already processed
      const existingMatch = await storage.getMatch(matchId);
      if (!existingMatch) {
        console.log(`❌ DATA FLOW ERROR: Match ${matchId} not found`);
        return res.status(404).json({ message: "Match not found" });
      }

      // Check for idempotency - if already processed, return existing data
      const existingMatchData = existingMatch.matchData as any;
      if (existingMatchData?.processed === true) {
        console.log(`⚠️ DATA FLOW: Match ${matchId} already processed, returning existing data`);
        return res.status(200).json({ 
          message: "Match already completed", 
          match: existingMatch,
          alreadyProcessed: true 
        });
      }

      console.log(`✅ DATA FLOW STEP 1: Match ${matchId} found and ready for completion`);
      console.log(`🏏 Match Details: ${existingMatch.title} - Status: ${existingMatch.status}`);

      // Validate the completion data using our enhanced schema
      console.log(`📊 DATA FLOW STEP 2: Validating scorecard data for match ${matchId}`);
      const completionData: MatchCompletionInput = matchCompletionSchema.parse({
        ...req.body,
        matchId,
      });
      
      console.log(`✅ DATA FLOW STEP 2: Scorecard data validated successfully`);
      console.log(`📈 Scorecard Contains: ${(completionData.finalScorecard.team1Innings || []).length + (completionData.finalScorecard.team2Innings || []).length} innings`);

      console.log(`📊 DATA FLOW STEP 3: Preparing for atomic match completion (scorecard + stats update)`);

      // Extract team and player data from scorecard for statistics updates
      console.log(`📊 DATA FLOW STEP 4: Extracting individual player statistics from scorecard`);
      const { finalScorecard, awards, resultSummary } = completionData;
      
      // Determine team IDs from match data
      const team1Id = (existingMatch.matchData as any)?.team1Id || null;
      const team2Id = (existingMatch.matchData as any)?.team2Id || null;
      const winnerId = resultSummary.winnerId;

      console.log(`🏏 Teams: ${team1Id} vs ${team2Id}, Winner: ${winnerId || 'None'}`);

      // Extract player statistics from scorecard
      const playerStats: any[] = [];
      console.log(`📈 Processing player performance data from innings...`);
      
      // Process both innings for player stats
      [...(finalScorecard.team1Innings || []), ...(finalScorecard.team2Innings || [])].forEach(innings => {
        // Add batting stats
        innings.batsmen?.forEach(batsman => {
          const existingPlayerStat = playerStats.find(p => p.playerId === batsman.playerId);
          if (existingPlayerStat) {
            existingPlayerStat.runsScored = (existingPlayerStat.runsScored || 0) + batsman.runsScored;
            existingPlayerStat.ballsFaced = (existingPlayerStat.ballsFaced || 0) + batsman.ballsFaced;
            existingPlayerStat.fours = (existingPlayerStat.fours || 0) + batsman.fours;
            existingPlayerStat.sixes = (existingPlayerStat.sixes || 0) + batsman.sixes;
          } else {
            playerStats.push({
              playerId: batsman.playerId,
              teamId: innings.battingTeamId,
              runsScored: batsman.runsScored,
              ballsFaced: batsman.ballsFaced,
              fours: batsman.fours,
              sixes: batsman.sixes,
              isOut: batsman.dismissalType !== 'not-out',
            });
          }
        });

        // Add bowling stats
        innings.bowlers?.forEach(bowler => {
          const existingPlayerStat = playerStats.find(p => p.playerId === bowler.playerId);
          if (existingPlayerStat) {
            existingPlayerStat.oversBowled = (existingPlayerStat.oversBowled || 0) + bowler.overs;
            existingPlayerStat.runsGiven = (existingPlayerStat.runsGiven || 0) + bowler.runsGiven;
            existingPlayerStat.wicketsTaken = (existingPlayerStat.wicketsTaken || 0) + bowler.wickets;
            existingPlayerStat.maidens = (existingPlayerStat.maidens || 0) + bowler.maidens;
          } else {
            const existingBattingStat = playerStats.find(p => p.playerId === bowler.playerId);
            if (existingBattingStat) {
              existingBattingStat.oversBowled = bowler.overs;
              existingBattingStat.runsGiven = bowler.runsGiven;
              existingBattingStat.wicketsTaken = bowler.wickets;
              existingBattingStat.maidens = bowler.maidens;
            } else {
              playerStats.push({
                playerId: bowler.playerId,
                teamId: innings.battingTeamId === team1Id ? team2Id : team1Id, // Bowler is from opposite team
                oversBowled: bowler.overs,
                runsGiven: bowler.runsGiven,
                wicketsTaken: bowler.wickets,
                maidens: bowler.maidens,
              });
            }
          }
        });
      });

      console.log(`✅ DATA FLOW STEP 4: Extracted stats for ${playerStats.length} players`);
      
      // Add awards to player stats
      if (awards) {
        console.log(`🏆 Processing player awards...`);
        if (awards.manOfTheMatch) {
          const player = playerStats.find(p => p.playerId === awards.manOfTheMatch);
          if (player) {
            player.manOfMatch = true;
            console.log(`👑 Man of the Match: Player ${awards.manOfTheMatch}`);
          }
        }
        if (awards.bestBatsman) {
          const player = playerStats.find(p => p.playerId === awards.bestBatsman);
          if (player) {
            player.bestBatsman = true;
            console.log(`🏏 Best Batsman: Player ${awards.bestBatsman}`);
          }
        }
        if (awards.bestBowler) {
          const player = playerStats.find(p => p.playerId === awards.bestBowler);
          if (player) {
            player.bestBowler = true;
            console.log(`⚾ Best Bowler: Player ${awards.bestBowler}`);
          }
        }
        if (awards.bestFielder) {
          const player = playerStats.find(p => p.playerId === awards.bestFielder);
          if (player) {
            player.bestFielder = true;
            console.log(`🥅 Best Fielder: Player ${awards.bestFielder}`);
          }
        }
      }

      // Apply match results atomically - updates match, teams, and player statistics
      console.log(`📊 DATA FLOW STEP 4-5: Atomically updating match + team + player statistics`);
      let applyResult;
      if (team1Id && team2Id && playerStats.length > 0) {
        const matchResultsData = {
          matchId,
          status: 'completed' as const,
          team1Id,
          team2Id,
          winnerTeamId: winnerId,
          scorecard: finalScorecard,
          awards,
          resultSummary,
          playerStats
        };
        applyResult = await storage.applyMatchResults(matchResultsData);

        if (!applyResult.success) {
          console.log(`❌ DATA FLOW ERROR: Failed atomic update - match, teams, and players`);
          console.error("Error applying match results:", applyResult.errors);
          return res.status(500).json({ 
            message: "Failed to complete match and update statistics", 
            errors: applyResult.errors 
          });
        }
        
        console.log(`✅ DATA FLOW STEP 4-5: Atomic update successful - match, teams, and players updated`);
        console.log(`📈 Stats Update Summary: ${playerStats.length} players updated`);
        
        // Log cache invalidation information for frontend
        const cacheInfo = (applyResult as any).cacheInvalidation;
        if (cacheInfo) {
          console.log(`🔄 DATA FLOW: Cache invalidation required for:`);
          console.log(`   - Teams: ${cacheInfo.teams.join(', ')}`);
          console.log(`   - Players: ${cacheInfo.players.join(', ')}`);
          console.log(`   - Matches: ${cacheInfo.matches.join(', ')}`);
        }
      } else {
        console.log(`⚠️ DATA FLOW: Skipping atomic update - missing teams or no player stats`);
        // If no stats to update, just mark match as completed
        const matchResultsData = {
          matchId,
          status: 'completed' as const,
          scorecard: finalScorecard,
          awards,
          resultSummary,
          playerStats: []
        };
        applyResult = await storage.applyMatchResults(matchResultsData);
      }

      console.log(`🎉 DATA FLOW COMPLETE: Match ${matchId} processing finished successfully`);
      console.log(`📊 FINAL SUMMARY: Match → Scorecard → ${playerStats.length} Player Stats → Career Updates → Profile Ready`);
      
      res.status(200).json({
        message: "Match completed successfully",
        match: applyResult.updatedMatch,
        statistics: {
          teamsUpdated: team1Id && team2Id ? 2 : 0,
          playersUpdated: playerStats.length,
          awardsProcessed: awards ? Object.keys(awards).length : 0
        },
        dataFlow: {
          matchProcessed: true,
          scorecardStored: true,
          playerStatsExtracted: playerStats.length,
          careerStatsUpdated: true,
          profilesReady: true,
          atomicUpdate: true
        },
        cacheInvalidation: (applyResult as any).cacheInvalidation || {
          teams: [],
          players: [],
          matches: []
        }
      });

    } catch (error: any) {
      console.log(`❌ DATA FLOW FAILED: Error completing match ${req.params.id}`);
      console.error("Error completing match:", error);
      if (error.name === 'ZodError') {
        console.log(`📊 DATA FLOW ERROR: Scorecard validation failed - ${error.issues?.[0]?.message || 'Invalid data'}`);
        return res.status(400).json({ 
          message: "Validation error", 
          issues: error.issues 
        });
      }
      res.status(500).json({ message: "Failed to complete match" });
    }
  });

  // Player stats update route (for post-match statistics)
  app.put('/api/players/:id/stats', requireAuth, async (req, res) => {
    try {
      const { matchStats } = req.body;
      const player = await storage.updatePlayerStats(req.params.id, matchStats);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      res.json(player);
    } catch (error) {
      console.error("Error updating player stats:", error);
      res.status(500).json({ message: "Failed to update player stats" });
    }
  });

  // Team stats update route (for post-match statistics)
  app.put('/api/teams/:id/stats', requireAuth, async (req, res) => {
    try {
      const { stats } = req.body;
      const team = await storage.updateTeamStats(req.params.id, stats);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      console.error("Error updating team stats:", error);
      res.status(500).json({ message: "Failed to update team stats" });
    }
  });

  // Development route to seed sample completed matches with result data
  app.post('/api/dev/seed-completed-matches', requireAuth, async (req, res) => {
    try {
      // Get some live matches to convert to completed
      const allMatches = await storage.getMatches();
      const liveMatches = allMatches.filter(match => 
        match.status === 'live' && 
        (match.matchData as any)?.team1Id && 
        (match.matchData as any)?.team2Id
      ).slice(0, 3); // Take first 3 live matches

      const completedMatches = [];

      for (let i = 0; i < liveMatches.length; i++) {
        const match = liveMatches[i];
        const matchData = match.matchData as any;
        
        // Create different result types for variety
        let resultSummary;
        const team1Id = matchData.team1Id;
        const team2Id = matchData.team2Id;
        
        if (i === 0) {
          // Team 1 wins by runs
          resultSummary = {
            winnerId: team1Id,
            resultType: "won-by-runs" as const,
            marginRuns: 25
          };
        } else if (i === 1) {
          // Team 2 wins by wickets  
          resultSummary = {
            winnerId: team2Id,
            resultType: "won-by-wickets" as const,
            marginWickets: 4
          };
        } else {
          // Tied match
          resultSummary = {
            resultType: "tied" as const
          };
        }

        // Update the match to completed with result summary
        const updatedMatch = await storage.updateMatch(match.id, {
          status: 'completed',
          matchData: {
            ...matchData,
            resultSummary,
            processed: true
          }
        });

        if (updatedMatch) {
          completedMatches.push(updatedMatch);
        }
      }

      res.json({
        message: `Successfully created ${completedMatches.length} completed matches with result data`,
        matches: completedMatches.map(m => ({ 
          id: m.id, 
          title: m.title, 
          status: m.status,
          resultSummary: (m.matchData as any).resultSummary 
        }))
      });

    } catch (error) {
      console.error("Error seeding completed matches:", error);
      res.status(500).json({ message: "Failed to seed completed matches" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
