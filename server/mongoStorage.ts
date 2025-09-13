import { MongoClient, Db, Collection } from 'mongodb';
import type {
  User,
  Venue,
  Match,
  MatchParticipant,
  Booking,
  Product,
  Review,
  CartItem,
  UserStats,
  InsertVenue,
  InsertMatch,
  InsertMatchParticipant,
  InsertBooking,
  InsertProduct,
  InsertReview,
  InsertCartItem,
  InsertUserStats,
  UpsertUser,
} from "@shared/schema";
import type { IStorage } from "./storage";

export class MongoStorage implements IStorage {
  private client: MongoClient;
  private db: Db;
  private users: Collection<User>;
  private venues: Collection<Venue>;
  private matches: Collection<Match>;
  private matchParticipants: Collection<MatchParticipant>;
  private bookings: Collection<Booking>;
  private products: Collection<Product>;
  private reviews: Collection<Review>;
  private cartItems: Collection<CartItem>;
  private userStats: Collection<UserStats>;

  constructor(uri: string) {
    // Configure MongoDB client options for Replit compatibility
    const options = {
      serverApi: { version: '1' as const },
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority' as const
    };
    
    this.client = new MongoClient(uri, options);
    this.db = this.client.db('playkers');
    this.users = this.db.collection<User>('users');
    this.venues = this.db.collection<Venue>('venues');
    this.matches = this.db.collection<Match>('matches');
    this.matchParticipants = this.db.collection<MatchParticipant>('matchParticipants');
    this.bookings = this.db.collection<Booking>('bookings');
    this.products = this.db.collection<Product>('products');
    this.reviews = this.db.collection<Review>('reviews');
    this.cartItems = this.db.collection<CartItem>('cartItems');
    this.userStats = this.db.collection<UserStats>('userStats');
  }

  async connect(): Promise<void> {
    await this.client.connect();
    console.log('✅ Connected to MongoDB');
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  // Helper function to generate unique IDs
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const user = await this.users.findOne({ id } as any);
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await this.users.findOne({ email } as any);
    return user || undefined;
  }

  async createUser(userData: { 
    email: string; 
    password: string; 
    firstName?: string | null; 
    lastName?: string | null; 
    profileImageUrl?: string | null; 
    dateOfBirth?: string | null; 
    location?: string | null; 
    phoneNumber?: string | null; 
    isAdmin?: boolean;
  }): Promise<User> {
    const id = `user-${this.generateId()}`;
    const user: User = {
      id,
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : null,
      location: userData.location || null,
      phoneNumber: userData.phoneNumber || null,
      isAdmin: userData.isAdmin || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.users.insertOne(user as any);
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await this.users.findOneAndUpdate(
      { id: userData.id } as any,
      {
        $set: {
          ...userData,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Failed to upsert user');
    }

    return result.value as User;
  }

  // Admin-specific methods
  async getAllUsers(): Promise<User[]> {
    const users = await this.users.find({}).sort({ createdAt: -1 }).toArray();
    return users;
  }

  async getUserCount(): Promise<number> {
    return await this.users.countDocuments();
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.users.deleteOne({ id } as any);
    return result.deletedCount > 0;
  }

  // Venue operations (simplified for admin)
  async getVenues(filters?: { sport?: string; city?: string; search?: string }): Promise<Venue[]> {
    let query: any = {};
    
    if (filters) {
      if (filters.sport) {
        query.sports = { $in: [filters.sport] };
      }
      if (filters.city) {
        query.city = new RegExp(filters.city, 'i');
      }
      if (filters.search) {
        query.name = new RegExp(filters.search, 'i');
      }
    }
    
    const venues = await this.venues.find(query).sort({ createdAt: -1 }).toArray();
    return venues;
  }

  async getVenue(id: string): Promise<Venue | undefined> {
    const venue = await this.venues.findOne({ id } as any);
    return venue || undefined;
  }

  async createVenue(venue: InsertVenue): Promise<Venue> {
    const id = `venue-${this.generateId()}`;
    const newVenue: Venue = {
      id,
      ...venue,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Venue;

    await this.venues.insertOne(newVenue as any);
    return newVenue;
  }

  async updateVenue(id: string, venue: Partial<InsertVenue>): Promise<Venue | undefined> {
    const result = await this.venues.findOneAndUpdate(
      { id } as any,
      { $set: { ...venue, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result.value || undefined;
  }

  async deleteVenue(id: string): Promise<boolean> {
    const result = await this.venues.deleteOne({ id } as any);
    return result.deletedCount > 0;
  }

  // Match operations (simplified)
  async getMatches(filters?: { sport?: string; status?: string; isPublic?: boolean }): Promise<Match[]> {
    let query: any = {};
    
    if (filters) {
      if (filters.sport) {
        query.sport = filters.sport;
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.isPublic !== undefined) {
        query.isPublic = filters.isPublic;
      }
    }
    
    const matches = await this.matches.find(query).sort({ createdAt: -1 }).toArray();
    return matches;
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const match = await this.matches.findOne({ id } as any);
    return match || undefined;
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const id = `match-${this.generateId()}`;
    const newMatch: Match = {
      id,
      ...match,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Match;

    await this.matches.insertOne(newMatch as any);
    return newMatch;
  }

  async updateMatch(id: string, match: Partial<InsertMatch>): Promise<Match | undefined> {
    const result = await this.matches.findOneAndUpdate(
      { id } as any,
      { $set: { ...match, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result.value || undefined;
  }

  async deleteMatch(id: string): Promise<boolean> {
    const result = await this.matches.deleteOne({ id } as any);
    return result.deletedCount > 0;
  }

  async getUserMatches(userId: string): Promise<Match[]> {
    // Find matches where user is a participant
    const participants = await this.matchParticipants.find({ userId } as any).toArray();
    const matchIds = participants.map(p => p.matchId);
    
    if (matchIds.length === 0) return [];
    
    const matches = await this.matches.find({ id: { $in: matchIds } } as any).toArray();
    return matches;
  }

  // Match participant operations
  async addMatchParticipant(participant: InsertMatchParticipant): Promise<MatchParticipant> {
    const id = `participant-${this.generateId()}`;
    const newParticipant: MatchParticipant = {
      id,
      ...participant,
      team: participant.team ?? null,
      role: participant.role ?? 'player',
      status: participant.status ?? 'joined',
      joinedAt: new Date(),
    };

    await this.matchParticipants.insertOne(newParticipant as any);
    return newParticipant;
  }

  async removeMatchParticipant(matchId: string, userId: string): Promise<boolean> {
    const result = await this.matchParticipants.deleteOne({ matchId, userId } as any);
    return result.deletedCount > 0;
  }

  async getMatchParticipants(matchId: string): Promise<MatchParticipant[]> {
    const participants = await this.matchParticipants.find({ matchId } as any).toArray();
    return participants;
  }

  // Simplified implementations for other entities (for basic admin functionality)
  async getBookings(): Promise<Booking[]> { return []; }
  async getBooking(): Promise<Booking | undefined> { return undefined; }
  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const id = `booking-${this.generateId()}`;
    const booking: Booking = {
      id,
      ...bookingData,
      matchId: bookingData.matchId ?? null,
      status: bookingData.status ?? 'confirmed',
      paymentStatus: bookingData.paymentStatus ?? 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.bookings.insertOne(booking as any);
    return booking;
  }
  async updateBooking(): Promise<Booking | undefined> { return undefined; }
  async deleteBooking(): Promise<boolean> { return false; }

  async getProducts(): Promise<Product[]> { return []; }
  async getProduct(): Promise<Product | undefined> { return undefined; }
  async createProduct(productData: InsertProduct): Promise<Product> {
    const id = `product-${this.generateId()}`;
    const product: Product = {
      id,
      ...productData,
      description: productData.description ?? null,
      subcategory: productData.subcategory ?? null,
      discountPrice: productData.discountPrice ?? null,
      images: productData.images ?? [],
      brand: productData.brand ?? null,
      specifications: productData.specifications ?? null,
      inStock: productData.inStock ?? true,
      stockQuantity: productData.stockQuantity ?? 0,
      rating: productData.rating ?? null,
      totalReviews: productData.totalReviews ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.products.insertOne(product as any);
    return product;
  }
  async updateProduct(): Promise<Product | undefined> { return undefined; }
  async deleteProduct(): Promise<boolean> { return false; }

  async getCartItems(): Promise<CartItem[]> { return []; }
  async addToCart(cartData: InsertCartItem): Promise<CartItem> {
    const id = `cart-${this.generateId()}`;
    const cartItem: CartItem = {
      id,
      ...cartData,
      quantity: cartData.quantity ?? 1,
      createdAt: new Date(),
    };

    await this.cartItems.insertOne(cartItem as any);
    return cartItem;
  }
  async updateCartItem(): Promise<CartItem | undefined> { return undefined; }
  async removeFromCart(): Promise<boolean> { return false; }
  async clearCart(): Promise<boolean> { return false; }

  async getReviews(): Promise<Review[]> { return []; }
  async createReview(reviewData: InsertReview): Promise<Review> {
    const id = `review-${this.generateId()}`;
    const review: Review = {
      id,
      ...reviewData,
      venueId: reviewData.venueId ?? null,
      productId: reviewData.productId ?? null,
      comment: reviewData.comment ?? null,
      images: reviewData.images ?? [],
      isVerified: reviewData.isVerified ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.reviews.insertOne(review as any);
    return review;
  }
  async updateReview(): Promise<Review | undefined> { return undefined; }
  async deleteReview(): Promise<boolean> { return false; }

  async getUserStats(): Promise<UserStats[]> { return []; }
  async updateUserStats(userId: string, sport: string, stats: any): Promise<UserStats> {
    const statsData = { userId, sport, ...stats };
    // Separate numeric fields (for increment) from non-numeric fields (for set)
    const { matchesPlayed, matchesWon, totalScore, ...nonNumericFields } = statsData;
    
    const update: any = {
      $set: {
        ...nonNumericFields,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        id: `stats-${this.generateId()}`,
        createdAt: new Date(),
      },
    };

    // Only add $inc if there are numeric values to increment
    const incrementFields: any = {};
    if (matchesPlayed !== undefined) incrementFields.matchesPlayed = matchesPlayed;
    if (matchesWon !== undefined) incrementFields.matchesWon = matchesWon;
    if (totalScore !== undefined) incrementFields.totalScore = totalScore;
    
    if (Object.keys(incrementFields).length > 0) {
      update.$inc = incrementFields;
    }

    const result = await this.userStats.findOneAndUpdate(
      { userId: statsData.userId, sport: statsData.sport },
      update,
      { upsert: true, returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Failed to update user stats');
    }

    return result.value as UserStats;
  }
}