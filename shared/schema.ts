import { z } from "zod";

// Zod schemas for validation

// User validation schemas
export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be at most 30 characters").regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens").nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  isAdmin: z.boolean().optional(),
});

// Profile update validation schema
export const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be at most 30 characters").regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  location: z.string().optional(),
  phoneNumber: z.string().optional(),
});

// Venue validation schemas
export const insertVenueSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  latitude: z.string().nullable().optional(), // Decimal as string
  longitude: z.string().nullable().optional(), // Decimal as string
  sports: z.array(z.string()),
  pricePerHour: z.string(), // Decimal as string
  facilities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  rating: z.string().optional(), // Decimal as string
  totalReviews: z.number().optional(),
  ownerId: z.string(),
});

// Match validation schemas
export const insertMatchSchema = z.object({
  title: z.string(),
  sport: z.string(),
  matchType: z.string(),
  isPublic: z.boolean().optional(),
  venueId: z.string(),
  organizerId: z.string(),
  scheduledAt: z.coerce.date(),
  duration: z.number().nullable().optional(),
  maxPlayers: z.number(),
  currentPlayers: z.number().optional(),
  status: z.string().optional(),
  team1Name: z.string().nullable().optional(),
  team2Name: z.string().nullable().optional(),
  team1Score: z.any().nullable().optional(), // JSON
  team2Score: z.any().nullable().optional(), // JSON
  matchData: z.any().nullable().optional(), // JSON
  description: z.string().nullable().optional(),
});

// Match participant validation schemas
export const insertMatchParticipantSchema = z.object({
  matchId: z.string(),
  userId: z.string(),
  team: z.string().nullable().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
});

// Booking validation schemas
export const insertBookingSchema = z.object({
  venueId: z.string(),
  userId: z.string(),
  matchId: z.string().nullable().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  totalAmount: z.string(), // Decimal as string
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
});

// Product validation schemas
export const insertProductSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  category: z.string(),
  subcategory: z.string().nullable().optional(),
  price: z.string(), // Decimal as string
  discountPrice: z.string().nullable().optional(), // Decimal as string
  images: z.array(z.string()).optional(),
  brand: z.string().nullable().optional(),
  specifications: z.any().nullable().optional(), // JSON
  inStock: z.boolean().optional(),
  stockQuantity: z.number().optional(),
  rating: z.string().optional(), // Decimal as string
  totalReviews: z.number().optional(),
});

// Review validation schemas
export const insertReviewSchema = z.object({
  userId: z.string(),
  venueId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  isVerified: z.boolean().optional(),
});

// Cart item validation schemas
export const insertCartItemSchema = z.object({
  userId: z.string(),
  productId: z.string(),
  quantity: z.number().optional(),
});

// User stats validation schemas (not used in forms but kept for completeness)
export const insertUserStatsSchema = z.object({
  userId: z.string(),
  sport: z.string(),
  matchesPlayed: z.number().optional(),
  matchesWon: z.number().optional(),
  totalScore: z.number().optional(),
  bestPerformance: z.any().nullable().optional(), // JSON
  stats: z.any().nullable().optional(), // JSON
});

// Team validation schemas
export const insertTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  shortName: z.string().max(4, "Short name must be 4 characters or less").optional(),
  description: z.string().optional(),
  captainId: z.string().optional(),
  viceCaptainId: z.string().optional(),
  logo: z.string().optional(),
  homeVenueId: z.string().optional(),
});

// Player validation schemas
export const insertPlayerSchema = z.object({
  name: z.string().min(1, "Player name is required"),
  email: z.string().email().optional(),
  userId: z.string().optional(), // Link to registered user if available
  teamId: z.string().optional(),
  role: z.enum(["batsman", "bowler", "all-rounder", "wicket-keeper"]).optional(),
  battingStyle: z.enum(["right-handed", "left-handed"]).optional(),
  bowlingStyle: z.enum(["right-arm-fast", "left-arm-fast", "right-arm-medium", "left-arm-medium", "right-arm-spin", "left-arm-spin", "leg-spin", "off-spin"]).optional(),
  jerseyNumber: z.number().optional(),
});

// Enhanced match schema for cricket scorecards
export const insertCricketMatchSchema = insertMatchSchema.extend({
  tossWinnerId: z.string().optional(),
  tossDecision: z.enum(["bat", "bowl"]).optional(),
  overs: z.number().optional(),
  matchFormat: z.enum(["T20", "ODI", "Test", "T10"]).optional(),
  umpire1: z.string().optional(),
  umpire2: z.string().optional(),
  thirdUmpire: z.string().optional(),
  referee: z.string().optional(),
  weather: z.string().optional(),
  pitchCondition: z.string().optional(),
  team1Players: z.array(z.string()).optional(), // Player IDs
  team2Players: z.array(z.string()).optional(), // Player IDs
  scorecard: z.object({
    team1Innings: z.array(z.object({
      inningsNumber: z.number(),
      battingTeamId: z.string(),
      totalRuns: z.number(),
      totalWickets: z.number(),
      totalOvers: z.number(),
      runRate: z.number(),
      extras: z.object({
        wides: z.number(),
        noBalls: z.number(),
        byes: z.number(),
        legByes: z.number(),
        penalties: z.number(),
      }),
      batsmen: z.array(z.object({
        playerId: z.string(),
        runsScored: z.number(),
        ballsFaced: z.number(),
        fours: z.number(),
        sixes: z.number(),
        strikeRate: z.number(),
        dismissalType: z.enum(["not-out", "bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket", "retired", "timed-out"]).optional(),
        bowlerOut: z.string().optional(), // Bowler who got the wicket
        fielderOut: z.string().optional(), // Fielder who took catch/run out
      })),
      bowlers: z.array(z.object({
        playerId: z.string(),
        overs: z.number(),
        maidens: z.number(),
        runsGiven: z.number(),
        wickets: z.number(),
        economy: z.number(),
        wides: z.number(),
        noBalls: z.number(),
      })),
      ballByBall: z.array(z.object({
        overNumber: z.number(),
        ballNumber: z.number(),
        bowlerId: z.string(),
        batsmanId: z.string(),
        runs: z.number(),
        extras: z.number(),
        extraType: z.enum(["wide", "no-ball", "bye", "leg-bye", "penalty"]).optional(),
        wicket: z.boolean(),
        wicketType: z.enum(["bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket"]).optional(),
        fielderOut: z.string().optional(),
      })).optional(),
    })),
    team2Innings: z.array(z.object({
      inningsNumber: z.number(),
      battingTeamId: z.string(),
      totalRuns: z.number(),
      totalWickets: z.number(),
      totalOvers: z.number(),
      runRate: z.number(),
      extras: z.object({
        wides: z.number(),
        noBalls: z.number(),
        byes: z.number(),
        legByes: z.number(),
        penalties: z.number(),
      }),
      batsmen: z.array(z.object({
        playerId: z.string(),
        runsScored: z.number(),
        ballsFaced: z.number(),
        fours: z.number(),
        sixes: z.number(),
        strikeRate: z.number(),
        dismissalType: z.enum(["not-out", "bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket", "retired", "timed-out"]).optional(),
        bowlerOut: z.string().optional(),
        fielderOut: z.string().optional(),
      })),
      bowlers: z.array(z.object({
        playerId: z.string(),
        overs: z.number(),
        maidens: z.number(),
        runsGiven: z.number(),
        wickets: z.number(),
        economy: z.number(),
        wides: z.number(),
        noBalls: z.number(),
      })),
      ballByBall: z.array(z.object({
        overNumber: z.number(),
        ballNumber: z.number(),
        bowlerId: z.string(),
        batsmanId: z.string(),
        runs: z.number(),
        extras: z.number(),
        extraType: z.enum(["wide", "no-ball", "bye", "leg-bye", "penalty"]).optional(),
        wicket: z.boolean(),
        wicketType: z.enum(["bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket"]).optional(),
        fielderOut: z.string().optional(),
      })).optional(),
    })),
  }).optional(),
  awards: z.object({
    manOfTheMatch: z.string().optional(), // Player ID
    bestBatsman: z.string().optional(),
    bestBowler: z.string().optional(),
    bestFielder: z.string().optional(),
  }).optional(),
  resultSummary: z.object({
    winnerId: z.string().optional(), // Team ID
    resultType: z.enum(["won-by-runs", "won-by-wickets", "tied", "no-result", "abandoned"]).optional(),
    marginRuns: z.number().optional(),
    marginWickets: z.number().optional(),
    marginBalls: z.number().optional(),
  }).optional(),
});

// Match roster player validation schemas
export const insertMatchRosterPlayerSchema = z.object({
  matchId: z.string(),
  team: z.enum(["team1", "team2"]),
  playerName: z.string().min(1, "Player name is required"),
  playerEmail: z.string().email().optional().or(z.literal("")),
  role: z.enum(["captain", "vice-captain", "wicket-keeper", "player"]).optional(),
  position: z.number().min(1).max(15),
  isRegisteredUser: z.boolean().optional(),
  userId: z.string().optional(),
});

// TypeScript types for MongoDB documents
export type User = {
  id: string;
  email: string;
  password: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  dateOfBirth: Date | null;
  location: string | null;
  phoneNumber: string | null;
  isAdmin: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Venue = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  latitude: string | null; // Decimal
  longitude: string | null; // Decimal
  sports: string[];
  pricePerHour: string; // Decimal
  facilities: string[];
  images: string[];
  rating: string | null; // Decimal
  totalReviews: number | null;
  ownerId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Match = {
  id: string;
  title: string;
  sport: string;
  matchType: string;
  isPublic: boolean | null;
  venueId: string;
  organizerId: string;
  scheduledAt: Date;
  duration: number | null;
  maxPlayers: number;
  currentPlayers: number | null;
  status: string | null;
  team1Name: string | null;
  team2Name: string | null;
  team1Score: any; // JSON
  team2Score: any; // JSON
  matchData: any; // JSON
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type MatchParticipant = {
  id: string;
  matchId: string;
  userId: string;
  team: string | null;
  role: string | null;
  status: string | null;
  joinedAt: Date | null;
};

export type Booking = {
  id: string;
  venueId: string;
  userId: string;
  matchId: string | null;
  startTime: Date;
  endTime: Date;
  totalAmount: string; // Decimal
  status: string | null;
  paymentStatus: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  price: string; // Decimal
  discountPrice: string | null; // Decimal
  images: string[];
  brand: string | null;
  specifications: any; // JSON
  inStock: boolean | null;
  stockQuantity: number | null;
  rating: string | null; // Decimal
  totalReviews: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Review = {
  id: string;
  userId: string;
  venueId: string | null;
  productId: string | null;
  rating: number;
  comment: string | null;
  images: string[];
  isVerified: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CartItem = {
  id: string;
  userId: string;
  productId: string;
  quantity: number | null;
  createdAt: Date | null;
};

export type UserStats = {
  id: string;
  userId: string;
  sport: string;
  matchesPlayed: number | null;
  matchesWon: number | null;
  totalScore: number | null;
  bestPerformance: any; // JSON
  stats: any; // JSON
  updatedAt: Date | null;
};

// Team type for MongoDB documents
export type Team = {
  id: string;
  name: string;
  shortName: string | null;
  description: string | null;
  captainId: string | null;
  viceCaptainId: string | null;
  logo: string | null;
  homeVenueId: string | null;
  // Team Statistics
  totalMatches: number | null;
  matchesWon: number | null;
  matchesLost: number | null;
  matchesDrawn: number | null;
  totalRunsScored: number | null;
  totalWicketsTaken: number | null;
  tournamentPoints: number | null;
  netRunRate: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

// Player type for MongoDB documents
export type Player = {
  id: string;
  name: string;
  email: string | null;
  userId: string | null; // Link to registered user if available
  teamId: string | null;
  role: string | null; // batsman, bowler, all-rounder, wicket-keeper
  battingStyle: string | null; // right-handed, left-handed
  bowlingStyle: string | null; // right-arm-fast, left-arm-fast, etc.
  jerseyNumber: number | null;
  
  // Career Statistics
  careerStats: {
    // Batting Stats
    totalRuns: number;
    totalBallsFaced: number;
    totalFours: number;
    totalSixes: number;
    highestScore: number;
    centuries: number;
    halfCenturies: number;
    battingAverage: number;
    strikeRate: number;
    
    // Bowling Stats
    totalOvers: number;
    totalRunsGiven: number;
    totalWickets: number;
    totalMaidens: number;
    bestBowlingFigures: string | null; // e.g., "4/25"
    fiveWicketHauls: number;
    bowlingAverage: number;
    economy: number;
    
    // Fielding Stats
    catches: number;
    runOuts: number;
    stumpings: number;
    
    // Match Records
    totalMatches: number;
    matchesWon: number;
    
    // Awards
    manOfTheMatchAwards: number;
    bestBatsmanAwards: number;
    bestBowlerAwards: number;
    bestFielderAwards: number;
  };
  
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type MatchRosterPlayer = {
  id: string;
  matchId: string;
  team: string;
  playerName: string;
  playerEmail: string | null;
  role: string | null;
  position: number;
  isRegisteredUser: boolean | null;
  userId: string | null;
  createdAt: Date | null;
};

// Insert types (inferred from Zod schemas)
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = Omit<User, 'createdAt' | 'updatedAt' | 'password'> & { password?: string }; // Storage handles timestamps, password optional for OAuth users
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type InsertCricketMatch = z.infer<typeof insertCricketMatchSchema>;
export type InsertMatchParticipant = z.infer<typeof insertMatchParticipantSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type InsertMatchRosterPlayer = z.infer<typeof insertMatchRosterPlayerSchema>;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;