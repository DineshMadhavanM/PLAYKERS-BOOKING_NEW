import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
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
import type { IStorage } from './storage';

export class MemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private venues = new Map<string, Venue>();
  private matches = new Map<string, Match>();
  private matchParticipants = new Map<string, MatchParticipant>();
  private bookings = new Map<string, Booking>();
  private products = new Map<string, Product>();
  private reviews = new Map<string, Review>();
  private cartItems = new Map<string, CartItem>();
  private userStats = new Map<string, UserStats>();

  constructor() {
    // Initialize with some seed data
    this.initializeSeedData();
  }

  private initializeSeedData() {
    // Add some sample venues
    const venue1: Venue = {
      id: uuidv4(),
      name: "Central Sports Complex",
      description: "Modern sports facility with multiple fields",
      address: "123 Main St",
      city: "New York",
      state: "NY",
      latitude: "40.7128",
      longitude: "-74.0060",
      sports: ["football", "soccer"],
      pricePerHour: "50.00",
      facilities: ["parking", "showers", "equipment rental"],
      images: [],
      rating: "4.5",
      totalReviews: 25,
      ownerId: "owner1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const venue2: Venue = {
      id: uuidv4(),
      name: "Tennis Club Elite",
      description: "Premium tennis courts with professional lighting",
      address: "456 Court Ave",
      city: "Los Angeles",
      state: "CA",
      latitude: "34.0522",
      longitude: "-118.2437",
      sports: ["tennis"],
      pricePerHour: "75.00",
      facilities: ["parking", "pro shop", "coaching"],
      images: [],
      rating: "4.8",
      totalReviews: 45,
      ownerId: "owner2",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.venues.set(venue1.id, venue1);
    this.venues.set(venue2.id, venue2);

    // Add some sample products
    const product1: Product = {
      id: uuidv4(),
      name: "Professional Football",
      description: "Official size football for competitive play",
      category: "equipment",
      subcategory: "balls",
      price: "29.99",
      discountPrice: null,
      images: [],
      brand: "SportsPro",
      specifications: null,
      inStock: true,
      stockQuantity: 50,
      rating: "4.2",
      totalReviews: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const product2: Product = {
      id: uuidv4(),
      name: "Tennis Racket Pro",
      description: "High-quality tennis racket for professionals",
      category: "equipment",
      subcategory: "rackets",
      price: "149.99",
      discountPrice: null,
      images: [],
      brand: "TennisPro",
      specifications: null,
      inStock: true,
      stockQuantity: 25,
      rating: "4.7",
      totalReviews: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.products.set(product1.id, product1);
    this.products.set(product2.id, product2);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(userData: { email: string; password: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null; dateOfBirth?: string | null; location?: string | null; phoneNumber?: string | null; isAdmin?: boolean }): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user: User = {
      id: uuidv4(),
      email: userData.email,
      password: hashedPassword,
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
    this.users.set(user.id, user);
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.id && this.users.has(userData.id)) {
      const existing = this.users.get(userData.id)!;
      const updated = { ...existing, ...userData };
      this.users.set(userData.id, updated);
      return updated;
    } else {
      const user: User = {
        id: userData.id || uuidv4(),
        email: userData.email,
        password: userData.password || '',
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        dateOfBirth: userData.dateOfBirth || null,
        location: userData.location || null,
        phoneNumber: userData.phoneNumber || null,
        isAdmin: userData.isAdmin || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(user.id, user);
      return user;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserCount(): Promise<number> {
    return this.users.size;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Venue operations
  async getVenues(filters?: { sport?: string; city?: string; search?: string }): Promise<Venue[]> {
    let venues = Array.from(this.venues.values());
    
    if (filters?.sport) {
      venues = venues.filter(v => v.sports.includes(filters.sport!));
    }
    if (filters?.city) {
      venues = venues.filter(v => v.city.toLowerCase().includes(filters.city!.toLowerCase()));
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      venues = venues.filter(v => 
        v.name.toLowerCase().includes(search) ||
        v.description?.toLowerCase().includes(search)
      );
    }
    
    return venues;
  }

  async getVenue(id: string): Promise<Venue | undefined> {
    return this.venues.get(id);
  }

  async createVenue(venueData: InsertVenue): Promise<Venue> {
    const venue: Venue = {
      id: uuidv4(),
      ...venueData,
      description: venueData.description || null,
      latitude: venueData.latitude || null,
      longitude: venueData.longitude || null,
      facilities: venueData.facilities || [],
      images: venueData.images || [],
      rating: venueData.rating || null,
      totalReviews: venueData.totalReviews || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.venues.set(venue.id, venue);
    return venue;
  }

  async updateVenue(id: string, venueData: Partial<InsertVenue>): Promise<Venue | undefined> {
    const existing = this.venues.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...venueData };
    this.venues.set(id, updated);
    return updated;
  }

  async deleteVenue(id: string): Promise<boolean> {
    return this.venues.delete(id);
  }

  // Match operations
  async getMatches(filters?: { sport?: string; status?: string; isPublic?: boolean }): Promise<Match[]> {
    let matches = Array.from(this.matches.values());
    
    if (filters?.sport) {
      matches = matches.filter(m => m.sport === filters.sport);
    }
    if (filters?.status) {
      matches = matches.filter(m => m.status === filters.status);
    }
    if (filters?.isPublic !== undefined) {
      matches = matches.filter(m => m.isPublic === filters.isPublic);
    }
    
    return matches;
  }

  async getMatch(id: string): Promise<Match | undefined> {
    return this.matches.get(id);
  }

  async createMatch(matchData: InsertMatch): Promise<Match> {
    const match: Match = {
      id: uuidv4(),
      ...matchData,
      isPublic: matchData.isPublic || false,
      duration: matchData.duration || null,
      currentPlayers: matchData.currentPlayers || 0,
      status: matchData.status || 'scheduled',
      team1Name: matchData.team1Name || null,
      team2Name: matchData.team2Name || null,
      team1Score: matchData.team1Score || null,
      team2Score: matchData.team2Score || null,
      matchData: matchData.matchData || null,
      description: matchData.description || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.matches.set(match.id, match);
    return match;
  }

  async updateMatch(id: string, matchData: Partial<InsertMatch>): Promise<Match | undefined> {
    const existing = this.matches.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...matchData };
    this.matches.set(id, updated);
    return updated;
  }

  async deleteMatch(id: string): Promise<boolean> {
    return this.matches.delete(id);
  }

  async getUserMatches(userId: string): Promise<Match[]> {
    const userParticipants = Array.from(this.matchParticipants.values())
      .filter(p => p.userId === userId);
    const matchIds = userParticipants.map(p => p.matchId);
    
    return Array.from(this.matches.values())
      .filter(m => matchIds.includes(m.id) || m.organizerId === userId);
  }

  // Match participant operations
  async addMatchParticipant(participantData: InsertMatchParticipant): Promise<MatchParticipant> {
    const participant: MatchParticipant = {
      id: uuidv4(),
      ...participantData,
      team: participantData.team || null,
      role: participantData.role || 'player',
      status: participantData.status || 'joined',
      joinedAt: new Date(),
    };
    this.matchParticipants.set(participant.id, participant);
    return participant;
  }

  async removeMatchParticipant(matchId: string, userId: string): Promise<boolean> {
    for (const [id, participant] of Array.from(this.matchParticipants.entries())) {
      if (participant.matchId === matchId && participant.userId === userId) {
        this.matchParticipants.delete(id);
        return true;
      }
    }
    return false;
  }

  async getMatchParticipants(matchId: string): Promise<MatchParticipant[]> {
    return Array.from(this.matchParticipants.values())
      .filter(p => p.matchId === matchId);
  }

  // Booking operations
  async getBookings(userId?: string): Promise<Booking[]> {
    let bookings = Array.from(this.bookings.values());
    if (userId) {
      bookings = bookings.filter(b => b.userId === userId);
    }
    return bookings;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const booking: Booking = {
      id: uuidv4(),
      ...bookingData,
      matchId: bookingData.matchId || null,
      status: bookingData.status || 'confirmed',
      paymentStatus: bookingData.paymentStatus || 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.bookings.set(booking.id, booking);
    return booking;
  }

  async updateBooking(id: string, bookingData: Partial<InsertBooking>): Promise<Booking | undefined> {
    const existing = this.bookings.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...bookingData };
    this.bookings.set(id, updated);
    return updated;
  }

  async deleteBooking(id: string): Promise<boolean> {
    return this.bookings.delete(id);
  }

  // Product operations
  async getProducts(filters?: { category?: string; search?: string }): Promise<Product[]> {
    let products = Array.from(this.products.values());
    
    if (filters?.category) {
      products = products.filter(p => p.category === filters.category);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search)
      );
    }
    
    return products;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const product: Product = {
      id: uuidv4(),
      ...productData,
      description: productData.description || null,
      subcategory: productData.subcategory || null,
      discountPrice: productData.discountPrice || null,
      images: productData.images || [],
      brand: productData.brand || null,
      specifications: productData.specifications || null,
      inStock: productData.inStock || true,
      stockQuantity: productData.stockQuantity || 0,
      rating: productData.rating || null,
      totalReviews: productData.totalReviews || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(product.id, product);
    return product;
  }

  async updateProduct(id: string, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...productData };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  // Cart operations
  async getCartItems(userId: string): Promise<CartItem[]> {
    return Array.from(this.cartItems.values())
      .filter(item => item.userId === userId);
  }

  async addToCart(itemData: InsertCartItem): Promise<CartItem> {
    const item: CartItem = {
      id: uuidv4(),
      ...itemData,
      quantity: itemData.quantity || 1,
      createdAt: new Date(),
    };
    this.cartItems.set(item.id, item);
    return item;
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem | undefined> {
    const existing = this.cartItems.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, quantity };
    this.cartItems.set(id, updated);
    return updated;
  }

  async removeFromCart(id: string): Promise<boolean> {
    return this.cartItems.delete(id);
  }

  async clearCart(userId: string): Promise<boolean> {
    let cleared = false;
    for (const [id, item] of Array.from(this.cartItems.entries())) {
      if (item.userId === userId) {
        this.cartItems.delete(id);
        cleared = true;
      }
    }
    return cleared;
  }

  // Review operations
  async getReviews(venueId?: string, productId?: string): Promise<Review[]> {
    let reviews = Array.from(this.reviews.values());
    
    if (venueId) {
      reviews = reviews.filter(r => r.venueId === venueId);
    }
    if (productId) {
      reviews = reviews.filter(r => r.productId === productId);
    }
    
    return reviews;
  }

  async createReview(reviewData: InsertReview): Promise<Review> {
    const review: Review = {
      id: uuidv4(),
      ...reviewData,
      venueId: reviewData.venueId || null,
      productId: reviewData.productId || null,
      comment: reviewData.comment || null,
      images: reviewData.images || [],
      isVerified: reviewData.isVerified || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.reviews.set(review.id, review);
    return review;
  }

  async updateReview(id: string, reviewData: Partial<InsertReview>): Promise<Review | undefined> {
    const existing = this.reviews.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...reviewData };
    this.reviews.set(id, updated);
    return updated;
  }

  async deleteReview(id: string): Promise<boolean> {
    return this.reviews.delete(id);
  }

  // User stats operations
  async getUserStats(userId: string): Promise<UserStats[]> {
    return Array.from(this.userStats.values())
      .filter(stats => stats.userId === userId);
  }

  async updateUserStats(userId: string, sport: string, stats: any): Promise<UserStats> {
    // Find existing stats for this user and sport
    let existingStats: UserStats | undefined;
    for (const [id, userStat] of Array.from(this.userStats.entries())) {
      if (userStat.userId === userId && userStat.sport === sport) {
        existingStats = userStat;
        break;
      }
    }

    if (existingStats) {
      const updated = { ...existingStats, stats };
      this.userStats.set(existingStats.id, updated);
      return updated;
    } else {
      const newStats: UserStats = {
        id: uuidv4(),
        userId,
        sport,
        matchesPlayed: stats.matchesPlayed || 0,
        matchesWon: stats.matchesWon || 0,
        totalScore: stats.totalScore || 0,
        bestPerformance: stats.bestPerformance || null,
        stats: stats.stats || null,
        updatedAt: new Date(),
      };
      this.userStats.set(newStats.id, newStats);
      return newStats;
    }
  }
}