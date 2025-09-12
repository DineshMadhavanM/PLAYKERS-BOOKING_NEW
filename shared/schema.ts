import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for email/password authentication and user profiles
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(), // Hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  dateOfBirth: date("date_of_birth"),
  location: varchar("location"),
  phoneNumber: varchar("phone_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Venues table for sports facilities
export const venues = pgTable("venues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  sports: text("sports").array().notNull(), // ['cricket', 'football', etc.]
  pricePerHour: decimal("price_per_hour", { precision: 10, scale: 2 }).notNull(),
  facilities: text("facilities").array(), // ['parking', 'restrooms', etc.]
  images: text("images").array(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: integer("total_reviews").default(0),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Matches table for game management
export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  sport: varchar("sport").notNull(), // 'cricket', 'football', etc.
  matchType: varchar("match_type").notNull(), // 'T20', '90min', etc.
  isPublic: boolean("is_public").default(true),
  venueId: varchar("venue_id").notNull(),
  organizerId: varchar("organizer_id").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration"), // in minutes
  maxPlayers: integer("max_players").notNull(),
  currentPlayers: integer("current_players").default(0),
  status: varchar("status").default("upcoming"), // 'upcoming', 'live', 'completed', 'cancelled'
  team1Name: varchar("team1_name"),
  team2Name: varchar("team2_name"),
  team1Score: jsonb("team1_score"), // flexible scoring data
  team2Score: jsonb("team2_score"),
  matchData: jsonb("match_data"), // detailed match statistics
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Match participants
export const matchParticipants = pgTable("match_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull(),
  userId: varchar("user_id").notNull(),
  team: varchar("team"), // 'team1', 'team2', or null for individual sports
  role: varchar("role").default("player"), // 'player', 'captain', 'scorer'
  status: varchar("status").default("joined"), // 'joined', 'invited', 'declined'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Bookings table for venue reservations
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  venueId: varchar("venue_id").notNull(),
  userId: varchar("user_id").notNull(),
  matchId: varchar("match_id"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default("confirmed"), // 'pending', 'confirmed', 'cancelled'
  paymentStatus: varchar("payment_status").default("pending"), // 'pending', 'paid', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table for e-commerce
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // 'cricket', 'football', etc.
  subcategory: varchar("subcategory"), // 'bats', 'balls', etc.
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discountPrice: decimal("discount_price", { precision: 10, scale: 2 }),
  images: text("images").array(),
  brand: varchar("brand"),
  specifications: jsonb("specifications"),
  inStock: boolean("in_stock").default(true),
  stockQuantity: integer("stock_quantity").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: integer("total_reviews").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reviews table for venues and products
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  venueId: varchar("venue_id"),
  productId: varchar("product_id"),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  images: text("images").array(),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cart items for e-commerce
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// User statistics for profile tracking
export const userStats = pgTable("user_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sport: varchar("sport").notNull(),
  matchesPlayed: integer("matches_played").default(0),
  matchesWon: integer("matches_won").default(0),
  totalScore: integer("total_score").default(0),
  bestPerformance: jsonb("best_performance"),
  stats: jsonb("stats"), // sport-specific statistics
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedVenues: many(venues),
  organizedMatches: many(matches),
  matchParticipations: many(matchParticipants),
  bookings: many(bookings),
  reviews: many(reviews),
  cartItems: many(cartItems),
  userStats: many(userStats),
}));

export const venuesRelations = relations(venues, ({ one, many }) => ({
  owner: one(users, {
    fields: [venues.ownerId],
    references: [users.id],
  }),
  matches: many(matches),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  venue: one(venues, {
    fields: [matches.venueId],
    references: [venues.id],
  }),
  organizer: one(users, {
    fields: [matches.organizerId],
    references: [users.id],
  }),
  participants: many(matchParticipants),
  booking: one(bookings),
}));

export const matchParticipantsRelations = relations(matchParticipants, ({ one }) => ({
  match: one(matches, {
    fields: [matchParticipants.matchId],
    references: [matches.id],
  }),
  user: one(users, {
    fields: [matchParticipants.userId],
    references: [users.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  venue: one(venues, {
    fields: [bookings.venueId],
    references: [venues.id],
  }),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  match: one(matches, {
    fields: [bookings.matchId],
    references: [matches.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  reviews: many(reviews),
  cartItems: many(cartItems),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  venue: one(venues, {
    fields: [reviews.venueId],
    references: [venues.id],
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVenueSchema = createInsertSchema(venues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMatchParticipantSchema = createInsertSchema(matchParticipants).omit({
  id: true,
  joinedAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type MatchParticipant = typeof matchParticipants.$inferSelect;
export type InsertMatchParticipant = z.infer<typeof insertMatchParticipantSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type UserStats = typeof userStats.$inferSelect;
