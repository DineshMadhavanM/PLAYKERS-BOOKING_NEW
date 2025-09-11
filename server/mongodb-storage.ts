import { v4 as uuidv4 } from 'uuid';
import { 
  connectToDatabase, 
  UserDocument, 
  VenueDocument, 
  MatchDocument, 
  ProductDocument, 
  BookingDocument, 
  ReviewDocument, 
  CartItemDocument, 
  UserStatsDocument, 
  MatchParticipantDocument 
} from './mongodb';
import { MongoClient, Db, Collection } from 'mongodb';

// Re-export types for compatibility with existing code  
export type User = UserDocument;
export type UpsertUser = Omit<UserDocument, '_id' | 'createdAt' | 'updatedAt'>; // Include id for replitAuth
export type Venue = VenueDocument;
export type InsertVenue = Omit<VenueDocument, '_id' | 'id' | 'createdAt' | 'updatedAt'>;
export type Match = MatchDocument;
export type InsertMatch = Omit<MatchDocument, '_id' | 'id' | 'createdAt' | 'updatedAt'>;
export type Product = ProductDocument;
export type InsertProduct = Omit<ProductDocument, '_id' | 'id' | 'createdAt' | 'updatedAt'>;
export type Booking = BookingDocument;
export type InsertBooking = Omit<BookingDocument, '_id' | 'id' | 'createdAt' | 'updatedAt'>;
export type Review = ReviewDocument;
export type InsertReview = Omit<ReviewDocument, '_id' | 'id' | 'createdAt' | 'updatedAt'>;
export type CartItem = CartItemDocument;
export type InsertCartItem = Omit<CartItemDocument, '_id' | 'id' | 'createdAt' | 'updatedAt'>;
export type UserStats = UserStatsDocument;
export type MatchParticipant = MatchParticipantDocument;
export type InsertMatchParticipant = Omit<MatchParticipantDocument, '_id' | 'id' | 'joinedAt'>;

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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

export class MongoDBStorage implements IStorage {
  private db: Db | null = null;
  private initialized: Promise<void> | null = null;

  private async ensureInitialized() {
    if (!this.initialized) {
      this.initialized = this.initializeCollections();
    }
    await this.initialized;
  }

  private async initializeCollections() {
    this.db = await connectToDatabase();
    
    // Create indexes for better performance
    await this.createIndexes();
  }

  private getCollection<T extends import('mongodb').Document>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.collection<T>(name);
  }

  // Collection getters
  private get users() { return this.getCollection<UserDocument>('users'); }
  private get venues() { return this.getCollection<VenueDocument>('venues'); }
  private get matches() { return this.getCollection<MatchDocument>('matches'); }
  private get products() { return this.getCollection<ProductDocument>('products'); }
  private get bookings() { return this.getCollection<BookingDocument>('bookings'); }
  private get reviews() { return this.getCollection<ReviewDocument>('reviews'); }
  private get cartItems() { return this.getCollection<CartItemDocument>('cartItems'); }
  private get userStats() { return this.getCollection<UserStatsDocument>('userStats'); }
  private get matchParticipants() { return this.getCollection<MatchParticipantDocument>('matchParticipants'); }

  private async createIndexes() {
    try {
      // User indexes
      await this.users.createIndex({ email: 1 }, { unique: true });
      await this.users.createIndex({ id: 1 }, { unique: true });

      // Venue indexes
      await this.venues.createIndex({ id: 1 }, { unique: true });
      await this.venues.createIndex({ city: 1 });
      await this.venues.createIndex({ sports: 1 });
      await this.venues.createIndex({ name: "text", address: "text" });

      // Match indexes
      await this.matches.createIndex({ id: 1 }, { unique: true });
      await this.matches.createIndex({ sport: 1 });
      await this.matches.createIndex({ status: 1 });
      await this.matches.createIndex({ organizerId: 1 });
      await this.matches.createIndex({ scheduledAt: 1 });

      // Product indexes
      await this.products.createIndex({ id: 1 }, { unique: true });
      await this.products.createIndex({ category: 1 });
      await this.products.createIndex({ name: "text", description: "text" });

      console.log('✅ MongoDB indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating MongoDB indexes:', error);
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const user = await this.users.findOne({ id });
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = new Date();
    const user: UserDocument = {
      id: uuidv4(),
      ...userData,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.users.findOneAndUpdate(
      { email: userData.email },
      { 
        $set: { ...user, updatedAt: now },
        $setOnInsert: { id: user.id, createdAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    );

    return result!;
  }

  // Venue operations
  async getVenues(filters?: { sport?: string; city?: string; search?: string }): Promise<Venue[]> {
    const query: any = {};

    if (filters?.sport) {
      query.sports = { $in: [filters.sport] };
    }

    if (filters?.city) {
      query.city = new RegExp(filters.city, 'i');
    }

    if (filters?.search) {
      query.$or = [
        { name: new RegExp(filters.search, 'i') },
        { address: new RegExp(filters.search, 'i') },
        { description: new RegExp(filters.search, 'i') }
      ];
    }

    return await this.venues.find(query).sort({ rating: -1, createdAt: -1 }).toArray();
  }

  async getVenue(id: string): Promise<Venue | undefined> {
    return await this.venues.findOne({ id }) || undefined;
  }

  async createVenue(venueData: InsertVenue): Promise<Venue> {
    const now = new Date();
    const venue: VenueDocument = {
      id: uuidv4(),
      ...venueData,
      rating: venueData.rating || "0",
      totalReviews: venueData.totalReviews || 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.venues.insertOne(venue);
    return venue;
  }

  async updateVenue(id: string, venueData: Partial<InsertVenue>): Promise<Venue | undefined> {
    const result = await this.venues.findOneAndUpdate(
      { id },
      { $set: { ...venueData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  async deleteVenue(id: string): Promise<boolean> {
    const result = await this.venues.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Match operations
  async getMatches(filters?: { sport?: string; status?: string; isPublic?: boolean }): Promise<Match[]> {
    const query: any = {};

    if (filters?.sport) {
      query.sport = filters.sport;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.isPublic !== undefined) {
      query.isPublic = filters.isPublic;
    }

    return await this.matches.find(query).sort({ scheduledAt: 1 }).toArray();
  }

  async getMatch(id: string): Promise<Match | undefined> {
    return await this.matches.findOne({ id }) || undefined;
  }

  async createMatch(matchData: InsertMatch): Promise<Match> {
    const now = new Date();
    const match: MatchDocument = {
      id: uuidv4(),
      ...matchData,
      currentPlayers: matchData.currentPlayers || 0,
      status: matchData.status || "upcoming",
      createdAt: now,
      updatedAt: now,
    };

    await this.matches.insertOne(match);
    return match;
  }

  async updateMatch(id: string, matchData: Partial<InsertMatch>): Promise<Match | undefined> {
    const result = await this.matches.findOneAndUpdate(
      { id },
      { $set: { ...matchData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  async deleteMatch(id: string): Promise<boolean> {
    const result = await this.matches.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async getUserMatches(userId: string): Promise<Match[]> {
    // Find matches where user is organizer or participant
    const organizedMatches = await this.matches.find({ organizerId: userId }).toArray();
    
    const participantMatches = await this.matchParticipants.find({ userId }).toArray();
    const participantMatchIds = participantMatches.map(p => p.matchId);
    const joinedMatches = await this.matches.find({ id: { $in: participantMatchIds } }).toArray();

    // Combine and deduplicate
    const allMatches = [...organizedMatches, ...joinedMatches];
    const uniqueMatches = allMatches.filter((match, index, self) => 
      index === self.findIndex(m => m.id === match.id)
    );

    return uniqueMatches.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  // Match participant operations
  async addMatchParticipant(participantData: InsertMatchParticipant): Promise<MatchParticipant> {
    const participant: MatchParticipantDocument = {
      id: uuidv4(),
      ...participantData,
      role: participantData.role || "player",
      status: participantData.status || "joined",
      joinedAt: new Date(),
    };

    await this.matchParticipants.insertOne(participant);
    return participant;
  }

  async removeMatchParticipant(matchId: string, userId: string): Promise<boolean> {
    const result = await this.matchParticipants.deleteOne({ matchId, userId });
    return result.deletedCount > 0;
  }

  async getMatchParticipants(matchId: string): Promise<MatchParticipant[]> {
    return await this.matchParticipants.find({ matchId }).toArray();
  }

  // Continue with other operations (products, bookings, etc.)
  // Product operations
  async getProducts(filters?: { category?: string; search?: string }): Promise<Product[]> {
    const query: any = {};

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.search) {
      query.$or = [
        { name: new RegExp(filters.search, 'i') },
        { description: new RegExp(filters.search, 'i') },
        { brand: new RegExp(filters.search, 'i') }
      ];
    }

    return await this.products.find(query).sort({ rating: -1, createdAt: -1 }).toArray();
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return await this.products.findOne({ id }) || undefined;
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const now = new Date();
    const product: ProductDocument = {
      id: uuidv4(),
      ...productData,
      rating: productData.rating || "0",
      totalReviews: productData.totalReviews || 0,
      inStock: productData.inStock !== undefined ? productData.inStock : true,
      stockQuantity: productData.stockQuantity || 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.products.insertOne(product);
    return product;
  }

  async updateProduct(id: string, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await this.products.findOneAndUpdate(
      { id },
      { $set: { ...productData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await this.products.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Booking operations
  async getBookings(userId?: string): Promise<Booking[]> {
    const query = userId ? { userId } : {};
    return await this.bookings.find(query).sort({ createdAt: -1 }).toArray();
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return await this.bookings.findOne({ id }) || undefined;
  }

  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const now = new Date();
    const booking: BookingDocument = {
      id: uuidv4(),
      ...bookingData,
      status: bookingData.status || "confirmed",
      paymentStatus: bookingData.paymentStatus || "pending",
      createdAt: now,
      updatedAt: now,
    };

    await this.bookings.insertOne(booking);
    return booking;
  }

  async updateBooking(id: string, bookingData: Partial<InsertBooking>): Promise<Booking | undefined> {
    const result = await this.bookings.findOneAndUpdate(
      { id },
      { $set: { ...bookingData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  async deleteBooking(id: string): Promise<boolean> {
    const result = await this.bookings.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Cart operations
  async getCartItems(userId: string): Promise<CartItem[]> {
    return await this.cartItems.find({ userId }).toArray();
  }

  async addToCart(itemData: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const existingItem = await this.cartItems.findOne({ 
      userId: itemData.userId, 
      productId: itemData.productId 
    });

    if (existingItem) {
      // Update quantity
      const result = await this.cartItems.findOneAndUpdate(
        { id: existingItem.id },
        { 
          $set: { 
            quantity: (existingItem.quantity || 0) + (itemData.quantity || 1),
            updatedAt: new Date() 
          } 
        },
        { returnDocument: 'after' }
      );
      return result!;
    } else {
      // Create new cart item
      const now = new Date();
      const cartItem: CartItemDocument = {
        id: uuidv4(),
        ...itemData,
        quantity: itemData.quantity || 1,
        createdAt: now,
        updatedAt: now,
      };

      await this.cartItems.insertOne(cartItem);
      return cartItem;
    }
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem | undefined> {
    if (quantity <= 0) {
      await this.cartItems.deleteOne({ id });
      return undefined;
    }

    const result = await this.cartItems.findOneAndUpdate(
      { id },
      { $set: { quantity, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  async removeFromCart(id: string): Promise<boolean> {
    const result = await this.cartItems.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    const result = await this.cartItems.deleteMany({ userId });
    return result.deletedCount > 0;
  }

  // Review operations
  async getReviews(venueId?: string, productId?: string): Promise<Review[]> {
    const query: any = {};
    if (venueId) query.venueId = venueId;
    if (productId) query.productId = productId;

    return await this.reviews.find(query).sort({ createdAt: -1 }).toArray();
  }

  async createReview(reviewData: InsertReview): Promise<Review> {
    const now = new Date();
    const review: ReviewDocument = {
      id: uuidv4(),
      ...reviewData,
      createdAt: now,
      updatedAt: now,
    };

    await this.reviews.insertOne(review);
    return review;
  }

  async updateReview(id: string, reviewData: Partial<InsertReview>): Promise<Review | undefined> {
    const result = await this.reviews.findOneAndUpdate(
      { id },
      { $set: { ...reviewData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result || undefined;
  }

  async deleteReview(id: string): Promise<boolean> {
    const result = await this.reviews.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // User stats operations
  async getUserStats(userId: string): Promise<UserStats[]> {
    return await this.userStats.find({ userId }).toArray();
  }

  async updateUserStats(userId: string, sport: string, stats: any): Promise<UserStats> {
    const existingStat = await this.userStats.findOne({ userId, sport });

    if (existingStat) {
      const result = await this.userStats.findOneAndUpdate(
        { id: existingStat.id },
        { $set: { ...stats, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      return result!;
    } else {
      const newStats: UserStatsDocument = {
        id: uuidv4(),
        userId,
        sport,
        matchesPlayed: 0,
        matchesWon: 0,
        totalScore: 0,
        ...stats,
        updatedAt: new Date(),
      };

      await this.userStats.insertOne(newStats);
      return newStats;
    }
  }
}

// Create and export storage instance
export const storage = new MongoDBStorage();