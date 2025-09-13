import { z } from "zod";

// Zod schemas for validation

// User validation schemas
export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  isAdmin: z.boolean().optional(),
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
export type UpsertUser = User; // For compatibility with existing code
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type InsertMatchParticipant = z.infer<typeof insertMatchParticipantSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type InsertMatchRosterPlayer = z.infer<typeof insertMatchRosterPlayerSchema>;