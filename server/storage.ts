import type {
  User,
  UpsertUser,
  Venue,
  InsertVenue,
  Match,
  InsertMatch,
  MatchParticipant,
  InsertMatchParticipant,
  Booking,
  InsertBooking,
  Product,
  InsertProduct,
  Review,
  InsertReview,
  CartItem,
  InsertCartItem,
  UserStats,
} from "@shared/schema";

export interface IStorage {
  // User operations (mandatory for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { email: string; password: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null; dateOfBirth?: string | null; location?: string | null; phoneNumber?: string | null; isAdmin?: boolean }): Promise<User>;
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

// PostgreSQL Storage Implementation
import { getDb } from './db';
import { eq, ilike, and, desc } from 'drizzle-orm';
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
} from '@shared/schema';
import bcrypt from 'bcrypt';

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await getDb().select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await getDb().select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: { email: string; password: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null; dateOfBirth?: string | null; location?: string | null; phoneNumber?: string | null; isAdmin?: boolean }): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const [newUser] = await db
      .insert(users)
      .values({
        ...user,
        password: hashedPassword,
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null,
      })
      .returning();
    return newUser;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const [upsertedUser] = await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          dateOfBirth: user.dateOfBirth,
          location: user.location,
          phoneNumber: user.phoneNumber,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedUser;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await getDb().select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserCount(): Promise<number> {
    const result = await getDb().select().from(users);
    return result.length;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await getDb().delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Venue operations
  async getVenues(filters?: { sport?: string; city?: string; search?: string }): Promise<Venue[]> {
    let query = db.select().from(venues);
    
    if (filters) {
      const conditions = [];
      if (filters.sport) {
        // For now, search in venue name/description for sport instead of array field
        conditions.push(ilike(venues.name, `%${filters.sport}%`));
      }
      if (filters.city) {
        conditions.push(ilike(venues.city, `%${filters.city}%`));
      }
      if (filters.search) {
        conditions.push(ilike(venues.name, `%${filters.search}%`));
      }
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }
    
    return await query.orderBy(desc(venues.createdAt));
  }

  async getVenue(id: string): Promise<Venue | undefined> {
    const [venue] = await getDb().select().from(venues).where(eq(venues.id, id));
    return venue || undefined;
  }

  async createVenue(venue: InsertVenue): Promise<Venue> {
    const [newVenue] = await getDb().insert(venues).values(venue).returning();
    return newVenue;
  }

  async updateVenue(id: string, venue: Partial<InsertVenue>): Promise<Venue | undefined> {
    const [updatedVenue] = await db
      .update(venues)
      .set({ ...venue, updatedAt: new Date() })
      .where(eq(venues.id, id))
      .returning();
    return updatedVenue || undefined;
  }

  async deleteVenue(id: string): Promise<boolean> {
    const result = await getDb().delete(venues).where(eq(venues.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Match operations
  async getMatches(filters?: { sport?: string; status?: string; isPublic?: boolean }): Promise<Match[]> {
    let query = db.select().from(matches);
    
    if (filters) {
      const conditions = [];
      if (filters.sport) {
        conditions.push(eq(matches.sport, filters.sport));
      }
      if (filters.status) {
        conditions.push(eq(matches.status, filters.status));
      }
      if (filters.isPublic !== undefined) {
        conditions.push(eq(matches.isPublic, filters.isPublic));
      }
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }
    
    return await query.orderBy(desc(matches.createdAt));
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const [match] = await getDb().select().from(matches).where(eq(matches.id, id));
    return match || undefined;
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await getDb().insert(matches).values(match).returning();
    return newMatch;
  }

  async updateMatch(id: string, match: Partial<InsertMatch>): Promise<Match | undefined> {
    const [updatedMatch] = await db
      .update(matches)
      .set({ ...match, updatedAt: new Date() })
      .where(eq(matches.id, id))
      .returning();
    return updatedMatch || undefined;
  }

  async deleteMatch(id: string): Promise<boolean> {
    const result = await getDb().delete(matches).where(eq(matches.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getUserMatches(userId: string): Promise<Match[]> {
    const userMatches = await db
      .select({ match: matches })
      .from(matchParticipants)
      .innerJoin(matches, eq(matchParticipants.matchId, matches.id))
      .where(eq(matchParticipants.userId, userId))
      .orderBy(desc(matches.scheduledAt));
    
    return userMatches.map(um => um.match);
  }

  // Match participant operations
  async addMatchParticipant(participant: InsertMatchParticipant): Promise<MatchParticipant> {
    const [newParticipant] = await getDb().insert(matchParticipants).values(participant).returning();
    return newParticipant;
  }

  async removeMatchParticipant(matchId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(matchParticipants)
      .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getMatchParticipants(matchId: string): Promise<MatchParticipant[]> {
    return await getDb().select().from(matchParticipants).where(eq(matchParticipants.matchId, matchId));
  }

  // Booking operations
  async getBookings(userId?: string): Promise<Booking[]> {
    if (userId) {
      return await getDb().select().from(bookings)
        .where(eq(bookings.userId, userId))
        .orderBy(desc(bookings.createdAt));
    }
    
    return await getDb().select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await getDb().select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await getDb().insert(bookings).values(booking).returning();
    return newBooking;
  }

  async updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [updatedBooking] = await db
      .update(bookings)
      .set({ ...booking, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updatedBooking || undefined;
  }

  async deleteBooking(id: string): Promise<boolean> {
    const result = await getDb().delete(bookings).where(eq(bookings.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Product operations
  async getProducts(filters?: { category?: string; search?: string }): Promise<Product[]> {
    let query = db.select().from(products);
    
    if (filters) {
      const conditions = [];
      if (filters.category) {
        conditions.push(eq(products.category, filters.category));
      }
      if (filters.search) {
        conditions.push(ilike(products.name, `%${filters.search}%`));
      }
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }
    
    return await query.orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await getDb().select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await getDb().insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await getDb().delete(products).where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Cart operations
  async getCartItems(userId: string): Promise<CartItem[]> {
    return await getDb().select().from(cartItems).where(eq(cartItems.userId, userId));
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const [newItem] = await getDb().insert(cartItems).values(item).returning();
    return newItem;
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem | undefined> {
    const [updatedItem] = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, id))
      .returning();
    return updatedItem || undefined;
  }

  async removeFromCart(id: string): Promise<boolean> {
    const result = await getDb().delete(cartItems).where(eq(cartItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    const result = await getDb().delete(cartItems).where(eq(cartItems.userId, userId));
    return (result.rowCount ?? 0) > 0;
  }

  // Review operations
  async getReviews(venueId?: string, productId?: string): Promise<Review[]> {
    let query = db.select().from(reviews);
    
    if (venueId || productId) {
      const conditions = [];
      if (venueId) {
        conditions.push(eq(reviews.venueId, venueId));
      }
      if (productId) {
        conditions.push(eq(reviews.productId, productId));
      }
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await getDb().insert(reviews).values(review).returning();
    return newReview;
  }

  async updateReview(id: string, review: Partial<InsertReview>): Promise<Review | undefined> {
    const [updatedReview] = await db
      .update(reviews)
      .set({ ...review, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return updatedReview || undefined;
  }

  async deleteReview(id: string): Promise<boolean> {
    const result = await getDb().delete(reviews).where(eq(reviews.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // User stats operations
  async getUserStats(userId: string): Promise<UserStats[]> {
    return await getDb().select().from(userStats).where(eq(userStats.userId, userId));
  }

  async updateUserStats(userId: string, sport: string, stats: any): Promise<UserStats> {
    const [updatedStats] = await db
      .insert(userStats)
      .values({ userId, sport, stats, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [userStats.userId, userStats.sport],
        set: { stats, updatedAt: new Date() },
      })
      .returning();
    return updatedStats;
  }
}

async function initializeStorage(): Promise<IStorage> {
  console.log('🔍 PostgreSQL DATABASE_URL found, initializing database storage...');
  try {
    const storage = new DatabaseStorage();
    return storage;
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    throw new Error('Failed to initialize PostgreSQL storage. Please check your DATABASE_URL configuration.');
  }
}

// Initialize storage async
export let storage: IStorage;
let storageInitialized = false;
let initializationPromise: Promise<void>;

async function initStorage() {
  try {
    storage = await initializeStorage();
    storageInitialized = true;
    console.log('✅ PostgreSQL storage initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize storage:', error);
    throw error;
  }
}

// Initialize storage immediately and expose promise for dependent code
initializationPromise = initStorage();

// Export a function to ensure storage is ready before use
export async function ensureStorageReady(): Promise<void> {
  if (!storageInitialized) {
    await initializationPromise;
  }
}