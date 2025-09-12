import {
  users,
  venues,
  matches,
  matchParticipants,
  bookings,
  products,
  reviews,
  cartItems,
  userStats,
  type User,
  type UpsertUser,
  type Venue,
  type InsertVenue,
  type Match,
  type InsertMatch,
  type MatchParticipant,
  type InsertMatchParticipant,
  type Booking,
  type InsertBooking,
  type Product,
  type InsertProduct,
  type Review,
  type InsertReview,
  type CartItem,
  type InsertCartItem,
  type UserStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { email: string; password: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null; dateOfBirth?: string | null; location?: string | null; phoneNumber?: string | null }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Admin operations
  getAllUsers?(): Promise<User[]>;
  getUserCount?(): Promise<number>;
  deleteUser?(id: string): Promise<boolean>;

  // Venue operations
  getVenues(filters?: { sport?: string; city?: string; search?: string }): Promise<Venue[]>;
  getVenue(id: string): Promise<Venue | undefined>;
  createVenue(venue: InsertVenue): Promise<Venue>;
  updateVenue(id: string, venue: Partial<InsertVenue>): Promise<Venue | undefined>;
  deleteVenue(id: string): Promise<boolean>;

  // Match operations
  getMatches(filters?: { sport?: string; status?: string; isPublic?: boolean }): Promise<Match[]>;
  getMatch(id: string): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: string, match: Partial<InsertMatch>): Promise<Match | undefined>;
  deleteMatch(id: string): Promise<boolean>;
  getUserMatches(userId: string): Promise<Match[]>;

  // Match participant operations
  addMatchParticipant(participant: InsertMatchParticipant): Promise<MatchParticipant>;
  removeMatchParticipant(matchId: string, userId: string): Promise<boolean>;
  getMatchParticipants(matchId: string): Promise<MatchParticipant[]>;

  // Booking operations
  getBookings(userId?: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;

  // Product operations
  getProducts(filters?: { category?: string; search?: string }): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Cart operations
  getCartItems(userId: string): Promise<CartItem[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<boolean>;
  clearCart(userId: string): Promise<boolean>;

  // Review operations
  getReviews(venueId?: string, productId?: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: string, review: Partial<InsertReview>): Promise<Review | undefined>;
  deleteReview(id: string): Promise<boolean>;

  // User stats operations
  getUserStats(userId: string): Promise<UserStats[]>;
  updateUserStats(userId: string, sport: string, stats: any): Promise<UserStats>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    if (!db) {
      throw new Error("Database not available. Please configure database credentials.");
    }
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!db) {
      throw new Error("Database not available. Please configure database credentials.");
    }
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: { email: string; password: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null; dateOfBirth?: string | null; location?: string | null; phoneNumber?: string | null }): Promise<User> {
    if (!db) {
      throw new Error("Database not available. Please configure database credentials.");
    }
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        dateOfBirth: userData.dateOfBirth || null,
        location: userData.location || null,
        phoneNumber: userData.phoneNumber || null,
      })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Venue operations
  async getVenues(filters?: { sport?: string; city?: string; search?: string }): Promise<Venue[]> {
    let query = db.select().from(venues);
    
    if (filters?.sport) {
      query = query.where(sql`${filters.sport} = ANY(${venues.sports})`);
    }
    
    if (filters?.city) {
      query = query.where(eq(venues.city, filters.city));
    }
    
    if (filters?.search) {
      query = query.where(
        sql`${venues.name} ILIKE ${`%${filters.search}%`} OR ${venues.address} ILIKE ${`%${filters.search}%`}`
      );
    }
    
    return query.orderBy(desc(venues.rating), desc(venues.createdAt));
  }

  async getVenue(id: string): Promise<Venue | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    return venue;
  }

  async createVenue(venue: InsertVenue): Promise<Venue> {
    const [newVenue] = await db.insert(venues).values(venue).returning();
    return newVenue;
  }

  async updateVenue(id: string, venue: Partial<InsertVenue>): Promise<Venue | undefined> {
    const [updatedVenue] = await db
      .update(venues)
      .set({ ...venue, updatedAt: new Date() })
      .where(eq(venues.id, id))
      .returning();
    return updatedVenue;
  }

  async deleteVenue(id: string): Promise<boolean> {
    const result = await db.delete(venues).where(eq(venues.id, id));
    return result.rowCount > 0;
  }

  // Match operations
  async getMatches(filters?: { sport?: string; status?: string; isPublic?: boolean }): Promise<Match[]> {
    let query = db.select().from(matches);
    
    if (filters?.sport) {
      query = query.where(eq(matches.sport, filters.sport));
    }
    
    if (filters?.status) {
      query = query.where(eq(matches.status, filters.status));
    }
    
    if (filters?.isPublic !== undefined) {
      query = query.where(eq(matches.isPublic, filters.isPublic));
    }
    
    return query.orderBy(asc(matches.scheduledAt));
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(match).returning();
    return newMatch;
  }

  async updateMatch(id: string, match: Partial<InsertMatch>): Promise<Match | undefined> {
    const [updatedMatch] = await db
      .update(matches)
      .set({ ...match, updatedAt: new Date() })
      .where(eq(matches.id, id))
      .returning();
    return updatedMatch;
  }

  async deleteMatch(id: string): Promise<boolean> {
    const result = await db.delete(matches).where(eq(matches.id, id));
    return result.rowCount > 0;
  }

  async getUserMatches(userId: string): Promise<Match[]> {
    const userMatches = await db
      .select()
      .from(matches)
      .innerJoin(matchParticipants, eq(matches.id, matchParticipants.matchId))
      .where(eq(matchParticipants.userId, userId))
      .orderBy(desc(matches.scheduledAt));
    
    return userMatches.map(row => row.matches);
  }

  // Match participant operations
  async addMatchParticipant(participant: InsertMatchParticipant): Promise<MatchParticipant> {
    const [newParticipant] = await db.insert(matchParticipants).values(participant).returning();
    
    // Update match current players count
    await db
      .update(matches)
      .set({
        currentPlayers: sql`${matches.currentPlayers} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(matches.id, participant.matchId));
    
    return newParticipant;
  }

  async removeMatchParticipant(matchId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(matchParticipants)
      .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.userId, userId)));
    
    if (result.rowCount > 0) {
      // Update match current players count
      await db
        .update(matches)
        .set({
          currentPlayers: sql`${matches.currentPlayers} - 1`,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, matchId));
      
      return true;
    }
    
    return false;
  }

  async getMatchParticipants(matchId: string): Promise<MatchParticipant[]> {
    return db.select().from(matchParticipants).where(eq(matchParticipants.matchId, matchId));
  }

  // Booking operations
  async getBookings(userId?: string): Promise<Booking[]> {
    let query = db.select().from(bookings);
    
    if (userId) {
      query = query.where(eq(bookings.userId, userId));
    }
    
    return query.orderBy(desc(bookings.startTime));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [updatedBooking] = await db
      .update(bookings)
      .set({ ...booking, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updatedBooking;
  }

  async deleteBooking(id: string): Promise<boolean> {
    const result = await db.delete(bookings).where(eq(bookings.id, id));
    return result.rowCount > 0;
  }

  // Product operations
  async getProducts(filters?: { category?: string; search?: string }): Promise<Product[]> {
    let query = db.select().from(products);
    
    if (filters?.category) {
      query = query.where(eq(products.category, filters.category));
    }
    
    if (filters?.search) {
      query = query.where(
        sql`${products.name} ILIKE ${`%${filters.search}%`} OR ${products.description} ILIKE ${`%${filters.search}%`}`
      );
    }
    
    return query.orderBy(desc(products.rating), desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount > 0;
  }

  // Cart operations
  async getCartItems(userId: string): Promise<CartItem[]> {
    return db.select().from(cartItems).where(eq(cartItems.userId, userId));
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, item.userId), eq(cartItems.productId, item.productId)));
    
    if (existingItem) {
      // Update quantity
      const [updatedItem] = await db
        .update(cartItems)
        .set({ quantity: existingItem.quantity + item.quantity })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return updatedItem;
    } else {
      // Add new item
      const [newItem] = await db.insert(cartItems).values(item).returning();
      return newItem;
    }
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem | undefined> {
    const [updatedItem] = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, id))
      .returning();
    return updatedItem;
  }

  async removeFromCart(id: string): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id));
    return result.rowCount > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.userId, userId));
    return result.rowCount > 0;
  }

  // Review operations
  async getReviews(venueId?: string, productId?: string): Promise<Review[]> {
    let query = db.select().from(reviews);
    
    if (venueId) {
      query = query.where(eq(reviews.venueId, venueId));
    }
    
    if (productId) {
      query = query.where(eq(reviews.productId, productId));
    }
    
    return query.orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async updateReview(id: string, review: Partial<InsertReview>): Promise<Review | undefined> {
    const [updatedReview] = await db
      .update(reviews)
      .set({ ...review, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return updatedReview;
  }

  async deleteReview(id: string): Promise<boolean> {
    const result = await db.delete(reviews).where(eq(reviews.id, id));
    return result.rowCount > 0;
  }

  // User stats operations
  async getUserStats(userId: string): Promise<UserStats[]> {
    return db.select().from(userStats).where(eq(userStats.userId, userId));
  }

  async updateUserStats(userId: string, sport: string, stats: any): Promise<UserStats> {
    const [existingStat] = await db
      .select()
      .from(userStats)
      .where(and(eq(userStats.userId, userId), eq(userStats.sport, sport)));
    
    if (existingStat) {
      const [updatedStats] = await db
        .update(userStats)
        .set({
          ...stats,
          updatedAt: new Date(),
        })
        .where(eq(userStats.id, existingStat.id))
        .returning();
      return updatedStats;
    } else {
      const [newStats] = await db
        .insert(userStats)
        .values({
          userId,
          sport,
          ...stats,
        })
        .returning();
      return newStats;
    }
  }
}

// Simple memory storage for when database is not available
class MemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private venues = new Map<string, Venue>();
  private matches = new Map<string, Match>();
  private matchParticipants = new Map<string, MatchParticipant>();
  private bookings = new Map<string, Booking>();
  private products = new Map<string, Product>();
  private reviews = new Map<string, Review>();
  private cartItems = new Map<string, CartItem>();
  private userStats = new Map<string, UserStats>();

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Search through all users to find one with matching email
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(userData: { email: string; password: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null; dateOfBirth?: string | null; location?: string | null; phoneNumber?: string | null }): Promise<User> {
    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const user: User = {
      id,
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      dateOfBirth: userData.dateOfBirth || null,
      location: userData.location || null,
      phoneNumber: userData.phoneNumber || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user: User = {
      ...userData,
      id: userData.id,
      createdAt: this.users.get(userData.id)?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(userData.id, user);
    return user;
  }

  // Venue operations - just return empty arrays for now since this is fallback mode
  async getVenues(): Promise<Venue[]> { return []; }
  async getVenue(): Promise<Venue | undefined> { return undefined; }
  async createVenue(): Promise<Venue> { throw new Error("Database required for venue operations"); }
  async updateVenue(): Promise<Venue | undefined> { return undefined; }
  async deleteVenue(): Promise<boolean> { return false; }

  // Match operations - just return empty arrays for now since this is fallback mode
  async getMatches(): Promise<Match[]> { return []; }
  async getMatch(): Promise<Match | undefined> { return undefined; }
  async createMatch(): Promise<Match> { throw new Error("Database required for match operations"); }
  async updateMatch(): Promise<Match | undefined> { return undefined; }
  async deleteMatch(): Promise<boolean> { return false; }
  async getUserMatches(): Promise<Match[]> { return []; }

  // Match participant operations
  async addMatchParticipant(): Promise<MatchParticipant> { throw new Error("Database required for match operations"); }
  async removeMatchParticipant(): Promise<boolean> { return false; }
  async getMatchParticipants(): Promise<MatchParticipant[]> { return []; }

  // Booking operations
  async getBookings(): Promise<Booking[]> { return []; }
  async getBooking(): Promise<Booking | undefined> { return undefined; }
  async createBooking(): Promise<Booking> { throw new Error("Database required for booking operations"); }
  async updateBooking(): Promise<Booking | undefined> { return undefined; }
  async deleteBooking(): Promise<boolean> { return false; }

  // Product operations
  async getProducts(): Promise<Product[]> { return []; }
  async getProduct(): Promise<Product | undefined> { return undefined; }
  async createProduct(): Promise<Product> { throw new Error("Database required for product operations"); }
  async updateProduct(): Promise<Product | undefined> { return undefined; }
  async deleteProduct(): Promise<boolean> { return false; }

  // Cart operations
  async getCartItems(): Promise<CartItem[]> { return []; }
  async addToCart(): Promise<CartItem> { throw new Error("Database required for cart operations"); }
  async updateCartItem(): Promise<CartItem | undefined> { return undefined; }
  async removeFromCart(): Promise<boolean> { return false; }
  async clearCart(): Promise<boolean> { return false; }

  // Review operations
  async getReviews(): Promise<Review[]> { return []; }
  async createReview(): Promise<Review> { throw new Error("Database required for review operations"); }
  async updateReview(): Promise<Review | undefined> { return undefined; }
  async deleteReview(): Promise<boolean> { return false; }

  // User stats operations
  async getUserStats(): Promise<UserStats[]> { return []; }
  async updateUserStats(): Promise<UserStats> { throw new Error("Database required for user stats operations"); }
}

// Use MongoDB if available, otherwise fallback to PostgreSQL or memory storage
import { MongoStorage } from './mongoStorage';

async function initializeStorage(): Promise<IStorage> {
  if (process.env.MONGODB_URI) {
    console.log('🔍 MongoDB URI found, initializing MongoDB storage...');
    try {
      const mongoStorage = new MongoStorage(process.env.MONGODB_URI);
      await mongoStorage.connect();
      return mongoStorage;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      console.log('⚠️  Falling back to PostgreSQL or memory storage');
    }
  }
  
  // Fallback to existing storage
  return db ? new DatabaseStorage() : new MemoryStorage();
}

// Initialize storage async
export let storage: IStorage;
initializeStorage().then(s => {
  storage = s;
}).catch(error => {
  console.error('❌ Failed to initialize storage:', error);
  storage = new MemoryStorage();
});
