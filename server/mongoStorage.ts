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
  Team,
  Player,
  PlayerPerformance,
  InsertVenue,
  InsertMatch,
  InsertCricketMatch,
  InsertMatchParticipant,
  InsertBooking,
  InsertProduct,
  InsertReview,
  InsertCartItem,
  InsertUserStats,
  InsertTeam,
  InsertPlayer,
  InsertPlayerPerformance,
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
  private teams: Collection<Team>;
  private players: Collection<Player>;
  private playerPerformances: Collection<PlayerPerformance>;

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
    this.teams = this.db.collection<Team>('teams');
    this.players = this.db.collection<Player>('players');
    this.playerPerformances = this.db.collection<PlayerPerformance>('playerPerformances');
  }

  async connect(): Promise<void> {
    await this.client.connect();
    console.log('✅ Connected to MongoDB');
    
    // Create indexes for player performances (idempotency and performance)
    try {
      await this.playerPerformances.createIndex({ playerId: 1 });
      await this.playerPerformances.createIndex({ matchId: 1 });
      await this.playerPerformances.createIndex(
        { matchId: 1, playerId: 1 }, 
        { unique: true }
      );
      console.log('✅ Created playerPerformances indexes');
      
      // Migrate from old email-only index to email+teamId compound index
      try {
        // Drop the old email-only unique index if it exists
        await this.players.dropIndex('email_1').catch(() => {
          // Ignore error if index doesn't exist
        });
        console.log('✅ Dropped old email-only index');
      } catch (error) {
        // Index might not exist, that's fine
      }
      
      // Clean up duplicate email+teamId combinations before creating the new index
      try {
        const pipeline = [
          {
            $match: {
              email: { $ne: null },
              teamId: { $ne: null }
            }
          },
          {
            $group: {
              _id: { email: '$email', teamId: '$teamId' },
              ids: { $push: '$_id' },
              count: { $sum: 1 }
            }
          },
          {
            $match: {
              count: { $gt: 1 }
            }
          }
        ];
        
        const duplicates = await this.players.aggregate(pipeline).toArray();
        
        if (duplicates.length > 0) {
          console.log(`⚠️ Found ${duplicates.length} duplicate email+teamId combinations, cleaning up...`);
          
          for (const dup of duplicates) {
            // Keep the first record (oldest) and delete the rest
            const idsToDelete = dup.ids.slice(1);
            await this.players.deleteMany({
              _id: { $in: idsToDelete }
            });
          }
          
          console.log('✅ Cleaned up duplicate players');
        }
      } catch (cleanupError) {
        console.warn('⚠️ Error during duplicate cleanup:', cleanupError);
      }
      
      // Create unique sparse index on player email per team
      // This allows the same email to be used across different teams
      await this.players.createIndex(
        { email: 1, teamId: 1 }, 
        { unique: true, sparse: true }
      );
      console.log('✅ Created players email+teamId compound index');
    } catch (error) {
      console.warn('⚠️ Index creation warning (may already exist):', error);
    }
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await this.users.findOne({ username } as any);
    return user || undefined;
  }

  async createUser(userData: { 
    email: string; 
    password: string; 
    username?: string | null;
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
      username: userData.username || null,
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
    // Prepare update data, excluding createdAt/updatedAt which are managed by storage
    const { id, ...updateFields } = userData;
    
    const updateData: any = {
      $set: {
        ...updateFields,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    };

    // Only set password if provided (OAuth users don't have passwords)
    if (updateFields.password !== undefined) {
      updateData.$set.password = updateFields.password;
    } else {
      updateData.$setOnInsert.password = "";
    }

    const result = await this.users.findOneAndUpdate(
      { id } as any,
      updateData,
      { upsert: true, returnDocument: 'after' }
    );

    if (!result) {
      throw new Error('Failed to upsert user');
    }

    return result as User;
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
    return result as Venue || undefined;
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
    return result as Match || undefined;
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

    if (!result) {
      throw new Error('Failed to update user stats');
    }

    return result as UserStats;
  }

  // Team operations
  async getTeams(filters?: { search?: string; sport?: string }): Promise<Team[]> {
    let query: any = {};
    
    if (filters) {
      if (filters.search) {
        query.name = new RegExp(filters.search, 'i');
      }
      if (filters.sport) {
        // For cricket, include teams without a sport field (cricket is the default)
        // For other sports, only include teams with that specific sport
        if (filters.sport === 'cricket') {
          query.$or = [
            { sport: 'cricket' },
            { sport: { $exists: false } }
          ];
        } else {
          query.sport = filters.sport;
        }
      }
    }
    
    const teams = await this.teams.find(query).sort({ createdAt: -1 }).toArray();
    return teams;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const team = await this.teams.findOne({ id } as any);
    return team || undefined;
  }

  async createTeam(teamData: InsertTeam): Promise<Team> {
    const id = `team-${this.generateId()}`;
    const team: Team = {
      id,
      ...teamData,
      city: teamData.city || null,
      shortName: teamData.shortName || null,
      description: teamData.description || null,
      captainId: teamData.captainId || null,
      viceCaptainId: teamData.viceCaptainId || null,
      logo: teamData.logo || null,
      homeVenueId: teamData.homeVenueId || null,
      totalMatches: 0,
      matchesWon: 0,
      matchesLost: 0,
      matchesDrawn: 0,
      totalRunsScored: 0,
      totalRunsConceded: 0,
      totalWicketsTaken: 0,
      totalWicketsLost: 0,
      tournamentPoints: 0,
      netRunRate: 0.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.teams.insertOne(team as any);
    return team;
  }

  async updateTeam(id: string, teamData: Partial<InsertTeam>): Promise<Team | undefined> {
    const result = await this.teams.findOneAndUpdate(
      { id } as any,
      { $set: { ...teamData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result as Team || undefined;
  }

  async deleteTeam(id: string): Promise<boolean> {
    const result = await this.teams.deleteOne({ id } as any);
    return result.deletedCount > 0;
  }

  async updateTeamStats(id: string, stats: { 
    matchesWon?: number; 
    matchesLost?: number; 
    matchesDrawn?: number; 
    runsScored?: number; 
    runsConceded?: number;
    wicketsTaken?: number; 
    wicketsLost?: number;
    tournamentPoints?: number;
  }): Promise<Team | undefined> {
    const updateFields: any = { updatedAt: new Date() };
    const incrementFields: any = {};

    // Increment team statistics
    if (stats.matchesWon !== undefined) incrementFields.matchesWon = stats.matchesWon;
    if (stats.matchesLost !== undefined) incrementFields.matchesLost = stats.matchesLost;
    if (stats.matchesDrawn !== undefined) incrementFields.matchesDrawn = stats.matchesDrawn;
    if (stats.runsScored !== undefined) incrementFields.totalRunsScored = stats.runsScored;
    if (stats.runsConceded !== undefined) incrementFields.totalRunsConceded = stats.runsConceded;
    if (stats.wicketsTaken !== undefined) incrementFields.totalWicketsTaken = stats.wicketsTaken;
    if (stats.wicketsLost !== undefined) incrementFields.totalWicketsLost = stats.wicketsLost;
    if (stats.tournamentPoints !== undefined) incrementFields.tournamentPoints = stats.tournamentPoints;

    // Calculate total matches increment
    const totalMatchesIncrement = (stats.matchesWon || 0) + (stats.matchesLost || 0) + (stats.matchesDrawn || 0);
    if (totalMatchesIncrement > 0) {
      incrementFields.totalMatches = totalMatchesIncrement;
    }

    const update: any = { $set: updateFields };
    if (Object.keys(incrementFields).length > 0) {
      update.$inc = incrementFields;
    }

    const result = await this.teams.findOneAndUpdate(
      { id } as any,
      update,
      { returnDocument: 'after' }
    );
    
    // After updating, recalculate derived metrics like net run rate
    if (result) {
      await this.recalculateTeamStats(id);
      return await this.getTeam(id);
    }
    return undefined;
  }

  // Player operations
  async getPlayers(filters?: { teamId?: string; role?: string; search?: string }): Promise<Player[]> {
    let query: any = {};
    
    if (filters) {
      if (filters.teamId) {
        query.teamId = filters.teamId;
      }
      if (filters.role) {
        query.role = filters.role;
      }
      if (filters.search) {
        query.name = new RegExp(filters.search, 'i');
      }
    }
    
    const players = await this.players.find(query).sort({ createdAt: -1 }).toArray();
    return players;
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    const player = await this.players.findOne({ id } as any);
    return player || undefined;
  }

  async getPlayerByUserId(userId: string): Promise<Player | undefined> {
    const player = await this.players.findOne({ userId } as any);
    return player || undefined;
  }

  async createPlayer(playerData: InsertPlayer): Promise<Player> {
    // Check for username uniqueness if provided
    if (playerData.username && playerData.username.trim()) {
      const normalizedUsername = playerData.username.trim().toLowerCase();
      const existingPlayer = await this.players.findOne({ username: normalizedUsername } as any);
      if (existingPlayer) {
        throw new Error(`Username "${playerData.username}" is already taken. Please choose a different username.`);
      }
    }

    const id = `player-${this.generateId()}`;
    const player: Player = {
      id,
      name: playerData.name,
      username: playerData.username && playerData.username.trim() ? playerData.username.trim().toLowerCase() : null,
      email: playerData.email ? playerData.email.toLowerCase() : null,
      userId: playerData.userId || null,
      teamId: playerData.teamId || null,
      teamName: playerData.teamName || null,
      role: playerData.role || null,
      battingStyle: playerData.battingStyle || null,
      bowlingStyle: playerData.bowlingStyle || null,
      jerseyNumber: playerData.jerseyNumber || null,
      careerStats: {
        // Batting Stats
        totalRuns: 0,
        totalBallsFaced: 0,
        totalFours: 0,
        totalSixes: 0,
        highestScore: 0,
        centuries: 0,
        halfCenturies: 0,
        innings: 0,
        dismissals: 0,
        battingAverage: 0.0,
        strikeRate: 0.0,
        
        // Bowling Stats
        totalOvers: 0,
        totalRunsGiven: 0,
        totalWickets: 0,
        totalMaidens: 0,
        bestBowlingFigures: null,
        fiveWicketHauls: 0,
        bowlingAverage: 0.0,
        economy: 0.0,
        
        // Fielding Stats
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        
        // Match Records
        totalMatches: 0,
        matchesWon: 0,
        
        // Awards
        manOfTheMatchAwards: 0,
        bestBatsmanAwards: 0,
        bestBowlerAwards: 0,
        bestFielderAwards: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.players.insertOne(player as any);
    return player;
  }

  async updatePlayer(id: string, playerData: Partial<InsertPlayer>): Promise<Player | undefined> {
    // Check for username uniqueness if provided and changed
    if (playerData.username && playerData.username.trim()) {
      const normalizedUsername = playerData.username.trim().toLowerCase();
      const existingPlayer = await this.players.findOne({ 
        username: normalizedUsername,
        id: { $ne: id } // Exclude current player from search
      } as any);
      if (existingPlayer) {
        throw new Error(`Username "${playerData.username}" is already taken. Please choose a different username.`);
      }
    }

    const updateData = { ...playerData };
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }
    if (updateData.username) {
      updateData.username = updateData.username.trim() ? updateData.username.trim().toLowerCase() : undefined;
    }
    const result = await this.players.findOneAndUpdate(
      { id } as any,
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result as Player || undefined;
  }

  async deletePlayer(id: string): Promise<boolean> {
    const result = await this.players.deleteOne({ id } as any);
    return result.deletedCount > 0;
  }

  // Player performance operations
  async upsertPlayerByEmail(playerData: {
    name: string;
    email: string;
    teamId?: string;
    teamName?: string;
    role?: string;
  }): Promise<Player> {
    const normalizedEmail = playerData.email.toLowerCase();
    
    // Try to find existing player by email
    const existingPlayer = await this.players.findOne({ email: normalizedEmail } as any);
    
    if (existingPlayer) {
      // Update existing player with new information
      const updateData: any = {
        name: playerData.name,
        updatedAt: new Date()
      };
      
      if (playerData.teamId) updateData.teamId = playerData.teamId;
      if (playerData.teamName) updateData.teamName = playerData.teamName;
      if (playerData.role) updateData.role = playerData.role;
      
      const result = await this.players.findOneAndUpdate(
        { email: normalizedEmail } as any,
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      return result as Player;
    }
    
    // Create new player
    const id = `player-${this.generateId()}`;
    const newPlayer: Player = {
      id,
      name: playerData.name,
      username: null,
      email: normalizedEmail,
      userId: null,
      teamId: playerData.teamId || null,
      teamName: playerData.teamName || null,
      role: playerData.role || null,
      battingStyle: null,
      bowlingStyle: null,
      jerseyNumber: null,
      careerStats: {
        totalRuns: 0,
        totalBallsFaced: 0,
        totalFours: 0,
        totalSixes: 0,
        highestScore: 0,
        centuries: 0,
        halfCenturies: 0,
        innings: 0,
        dismissals: 0,
        battingAverage: 0.0,
        strikeRate: 0.0,
        totalOvers: 0,
        totalRunsGiven: 0,
        totalWickets: 0,
        totalMaidens: 0,
        bestBowlingFigures: null,
        fiveWicketHauls: 0,
        bowlingAverage: 0.0,
        economy: 0.0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        totalMatches: 0,
        matchesWon: 0,
        manOfTheMatchAwards: 0,
        bestBatsmanAwards: 0,
        bestBowlerAwards: 0,
        bestFielderAwards: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await this.players.insertOne(newPlayer as any);
    return newPlayer;
  }

  async linkPlayerToUserByEmail(email: string): Promise<{ success: boolean; playerId?: string; userId?: string }> {
    const normalizedEmail = email.toLowerCase();
    
    // Find user with this email
    const user = await this.users.findOne({ email: normalizedEmail } as any);
    if (!user) {
      return { success: false };
    }
    
    // Find player with this email
    const player = await this.players.findOne({ email: normalizedEmail } as any);
    if (!player) {
      return { success: false };
    }
    
    // Link player to user
    await this.players.updateOne(
      { id: player.id } as any,
      { $set: { userId: user.id, updatedAt: new Date() } }
    );
    
    return { success: true, playerId: player.id, userId: user.id };
  }

  async recordPlayerPerformance(performance: InsertPlayerPerformance): Promise<PlayerPerformance> {
    const id = `perf-${this.generateId()}`;
    
    const newPerformance: PlayerPerformance = {
      id,
      playerId: performance.playerId,
      userId: performance.userId || null,
      matchId: performance.matchId,
      teamId: performance.teamId || null,
      teamName: performance.teamName || null,
      opposition: performance.opposition,
      venue: performance.venue || null,
      matchDate: new Date(performance.matchDate),
      matchFormat: performance.matchFormat || null,
      matchResult: performance.matchResult || null,
      battingStats: performance.battingStats ? {
        runs: performance.battingStats.runs,
        balls: performance.battingStats.balls,
        fours: performance.battingStats.fours,
        sixes: performance.battingStats.sixes,
        strikeRate: performance.battingStats.strikeRate,
        position: performance.battingStats.position,
        isOut: performance.battingStats.isOut,
        dismissalType: performance.battingStats.dismissalType || null,
        bowlerOut: performance.battingStats.bowlerOut || null,
        fielderOut: performance.battingStats.fielderOut || null,
      } : null,
      bowlingStats: performance.bowlingStats || null,
      fieldingStats: performance.fieldingStats || null,
      awards: performance.awards || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Use upsert with compound unique index on {matchId, playerId} for idempotency
    await this.playerPerformances.updateOne(
      { matchId: performance.matchId, playerId: performance.playerId } as any,
      { $set: newPerformance },
      { upsert: true }
    );
    
    return newPerformance;
  }

  async getPlayerPerformances(playerId: string, options?: { limit?: number; offset?: number }): Promise<PlayerPerformance[]> {
    // Validate and cap limit for safety
    const limit = Math.min(options?.limit || 20, 100);
    const offset = options?.offset || 0;
    
    const performances = await this.playerPerformances
      .find({ playerId } as any)
      .sort({ matchDate: -1, _id: -1 }) // Stable sort: matchDate desc, then _id desc
      .skip(offset)
      .limit(limit)
      .toArray();
    
    return performances;
  }

  async getUserPerformances(userId: string, options?: { limit?: number; offset?: number }): Promise<PlayerPerformance[]> {
    // Validate and cap limit for safety
    const limit = Math.min(options?.limit || 20, 100);
    const offset = options?.offset || 0;
    
    // Find the player linked to this user
    const linkedPlayer = await this.players.findOne({ userId } as any);
    if (!linkedPlayer) {
      // User has no linked player profile, return empty array
      return [];
    }
    
    // Query performances by the linked player's ID
    const performances = await this.playerPerformances
      .find({ playerId: linkedPlayer.id } as any)
      .sort({ matchDate: -1, _id: -1 }) // Stable sort: matchDate desc, then _id desc
      .skip(offset)
      .limit(limit)
      .toArray();
    
    return performances;
  }

  async updatePlayerAggregates(playerId: string, performanceData: {
    runsScored?: number;
    ballsFaced?: number;
    fours?: number;
    sixes?: number;
    isOut?: boolean;
    oversBowled?: number;
    runsGiven?: number;
    wicketsTaken?: number;
    maidens?: number;
    catches?: number;
    runOuts?: number;
    stumpings?: number;
    manOfMatch?: boolean;
    bestBatsman?: boolean;
    bestBowler?: boolean;
    bestFielder?: boolean;
    matchWon?: boolean;
  }): Promise<Player | undefined> {
    const player = await this.getPlayer(playerId);
    if (!player) {
      return undefined;
    }

    const incrementFields: any = {};
    const updateFields: any = { updatedAt: new Date() };

    // Track batting innings and dismissals
    const batted = performanceData.ballsFaced !== undefined && performanceData.ballsFaced > 0;
    if (batted) {
      incrementFields['careerStats.innings'] = 1;
      if (performanceData.isOut === true) {
        incrementFields['careerStats.dismissals'] = 1;
      }
    }

    // Batting stats increments
    if (performanceData.runsScored !== undefined) incrementFields['careerStats.totalRuns'] = performanceData.runsScored;
    if (performanceData.ballsFaced !== undefined) incrementFields['careerStats.totalBallsFaced'] = performanceData.ballsFaced;
    if (performanceData.fours !== undefined) incrementFields['careerStats.totalFours'] = performanceData.fours;
    if (performanceData.sixes !== undefined) incrementFields['careerStats.totalSixes'] = performanceData.sixes;

    // Check for centuries/half-centuries (from THIS match)
    if (performanceData.runsScored !== undefined) {
      if (performanceData.runsScored >= 100) {
        incrementFields['careerStats.centuries'] = 1;
      } else if (performanceData.runsScored >= 50) {
        incrementFields['careerStats.halfCenturies'] = 1;
      }
      
      // Update highest score (from THIS match)
      if (performanceData.runsScored > player.careerStats.highestScore) {
        updateFields['careerStats.highestScore'] = performanceData.runsScored;
      }
    }

    // Bowling stats increments
    if (performanceData.oversBowled !== undefined) incrementFields['careerStats.totalOvers'] = performanceData.oversBowled;
    if (performanceData.runsGiven !== undefined) incrementFields['careerStats.totalRunsGiven'] = performanceData.runsGiven;
    if (performanceData.wicketsTaken !== undefined) incrementFields['careerStats.totalWickets'] = performanceData.wicketsTaken;
    if (performanceData.maidens !== undefined) incrementFields['careerStats.totalMaidens'] = performanceData.maidens;

    // Check for five wicket hauls (from THIS match)
    if (performanceData.wicketsTaken !== undefined && performanceData.wicketsTaken >= 5) {
      incrementFields['careerStats.fiveWicketHauls'] = 1;
    }

    // Fielding stats increments
    if (performanceData.catches !== undefined) incrementFields['careerStats.catches'] = performanceData.catches;
    if (performanceData.runOuts !== undefined) incrementFields['careerStats.runOuts'] = performanceData.runOuts;
    if (performanceData.stumpings !== undefined) incrementFields['careerStats.stumpings'] = performanceData.stumpings;

    // Awards increments
    if (performanceData.manOfMatch === true) incrementFields['careerStats.manOfTheMatchAwards'] = 1;
    if (performanceData.bestBatsman === true) incrementFields['careerStats.bestBatsmanAwards'] = 1;
    if (performanceData.bestBowler === true) incrementFields['careerStats.bestBowlerAwards'] = 1;
    if (performanceData.bestFielder === true) incrementFields['careerStats.bestFielderAwards'] = 1;

    // Match stats increments
    incrementFields['careerStats.totalMatches'] = 1;
    if (performanceData.matchWon === true) incrementFields['careerStats.matchesWon'] = 1;

    // Apply increments and updates
    const result = await this.players.findOneAndUpdate(
      { id: playerId } as any,
      {
        $inc: incrementFields,
        $set: updateFields
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return undefined;
    }

    // Recalculate averages and rates with proper guards
    const updatedPlayer = result as Player;
    const careerStats = updatedPlayer.careerStats;

    // Batting average = totalRuns / dismissals (guard against division by zero)
    if (careerStats.dismissals > 0) {
      careerStats.battingAverage = parseFloat((careerStats.totalRuns / careerStats.dismissals).toFixed(2));
    } else if (careerStats.innings > 0) {
      // Not out - show runs as average
      careerStats.battingAverage = careerStats.totalRuns;
    } else {
      careerStats.battingAverage = 0;
    }

    // Strike rate = (totalRuns / totalBallsFaced) * 100 (guard against division by zero)
    if (careerStats.totalBallsFaced > 0) {
      careerStats.strikeRate = parseFloat(((careerStats.totalRuns / careerStats.totalBallsFaced) * 100).toFixed(2));
    } else {
      careerStats.strikeRate = 0;
    }

    // Bowling average = totalRunsGiven / totalWickets (guard against division by zero)
    if (careerStats.totalWickets > 0) {
      careerStats.bowlingAverage = parseFloat((careerStats.totalRunsGiven / careerStats.totalWickets).toFixed(2));
    } else {
      careerStats.bowlingAverage = 0;
    }

    // Economy rate = totalRunsGiven / totalOvers (guard against division by zero)
    if (careerStats.totalOvers > 0) {
      careerStats.economy = parseFloat((careerStats.totalRunsGiven / careerStats.totalOvers).toFixed(2));
    } else {
      careerStats.economy = 0;
    }

    // Update with recalculated stats
    await this.players.updateOne(
      { id: playerId } as any,
      { $set: { careerStats, updatedAt: new Date() } }
    );

    return updatedPlayer;
  }

  // Player merge operations
  async getPlayerByEmail(email: string, teamId?: string, excludePlayerId?: string): Promise<Player | undefined> {
    const query: any = { 
      email: { 
        $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') 
      } 
    };
    
    // Only check for conflicts within the same team
    if (teamId) {
      query.teamId = teamId;
    }
    
    if (excludePlayerId) {
      query.id = { $ne: excludePlayerId };
    }
    const player = await this.players.findOne(query);
    return player || undefined;
  }

  async mergePlayer(
    targetPlayerId: string, 
    sourcePlayerId: string, 
    mergedData: Partial<InsertPlayer>, 
    mergeCareerStats: boolean = true
  ): Promise<{ success: boolean; mergedPlayer?: Player; errors?: string[]; }> {
    const session = this.client.startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Get both players
        const targetPlayer = await this.players.findOne({ id: targetPlayerId }, { session });
        const sourcePlayer = await this.players.findOne({ id: sourcePlayerId }, { session });
        
        if (!targetPlayer || !sourcePlayer) {
          return { 
            success: false, 
            errors: [`Player not found: ${!targetPlayer ? targetPlayerId : sourcePlayerId}`] 
          };
        }

        // Ensure both players have careerStats initialized
        const defaultCareerStats = {
          totalRuns: 0, totalBallsFaced: 0, totalFours: 0, totalSixes: 0,
          highestScore: 0, centuries: 0, halfCenturies: 0, innings: 0, dismissals: 0,
          battingAverage: 0, strikeRate: 0,
          totalOvers: 0, totalRunsGiven: 0, totalWickets: 0, totalMaidens: 0,
          bestBowlingFigures: null, fiveWicketHauls: 0, bowlingAverage: 0, economy: 0,
          catches: 0, runOuts: 0, stumpings: 0, totalMatches: 0, matchesWon: 0,
          manOfTheMatchAwards: 0, bestBatsmanAwards: 0, bestBowlerAwards: 0, bestFielderAwards: 0
        };

        const targetStats = targetPlayer.careerStats || defaultCareerStats;
        const sourceStats = sourcePlayer.careerStats || defaultCareerStats;

        // Merge career stats if requested
        let mergedCareerStats = targetStats;
        if (mergeCareerStats) {
          mergedCareerStats = {
            // Batting Stats
            totalRuns: targetStats.totalRuns + sourceStats.totalRuns,
            totalBallsFaced: targetStats.totalBallsFaced + sourceStats.totalBallsFaced,
            totalFours: targetStats.totalFours + sourceStats.totalFours,
            totalSixes: targetStats.totalSixes + sourceStats.totalSixes,
            highestScore: Math.max(targetStats.highestScore, sourceStats.highestScore),
            centuries: targetStats.centuries + sourceStats.centuries,
            halfCenturies: targetStats.halfCenturies + sourceStats.halfCenturies,
            innings: targetStats.innings + sourceStats.innings,
            dismissals: targetStats.dismissals + sourceStats.dismissals,
            battingAverage: 0, // Will be recalculated
            strikeRate: 0, // Will be recalculated
            
            // Bowling Stats
            totalOvers: targetStats.totalOvers + sourceStats.totalOvers,
            totalRunsGiven: targetStats.totalRunsGiven + sourceStats.totalRunsGiven,
            totalWickets: targetStats.totalWickets + sourceStats.totalWickets,
            totalMaidens: targetStats.totalMaidens + sourceStats.totalMaidens,
            bestBowlingFigures: targetStats.bestBowlingFigures || sourceStats.bestBowlingFigures,
            fiveWicketHauls: targetStats.fiveWicketHauls + sourceStats.fiveWicketHauls,
            bowlingAverage: 0, // Will be recalculated
            economy: 0, // Will be recalculated
            
            // Fielding Stats
            catches: targetStats.catches + sourceStats.catches,
            runOuts: targetStats.runOuts + sourceStats.runOuts,
            stumpings: targetStats.stumpings + sourceStats.stumpings,
            
            // Match Records
            totalMatches: targetStats.totalMatches + sourceStats.totalMatches,
            matchesWon: targetStats.matchesWon + sourceStats.matchesWon,
            
            // Awards
            manOfTheMatchAwards: targetStats.manOfTheMatchAwards + sourceStats.manOfTheMatchAwards,
            bestBatsmanAwards: targetStats.bestBatsmanAwards + sourceStats.bestBatsmanAwards,
            bestBowlerAwards: targetStats.bestBowlerAwards + sourceStats.bestBowlerAwards,
            bestFielderAwards: targetStats.bestFielderAwards + sourceStats.bestFielderAwards,
          };

          // Recalculate averages
          if (mergedCareerStats.totalBallsFaced > 0 && mergedCareerStats.totalMatches > 0) {
            mergedCareerStats.battingAverage = mergedCareerStats.totalRuns / mergedCareerStats.totalMatches;
            mergedCareerStats.strikeRate = (mergedCareerStats.totalRuns / mergedCareerStats.totalBallsFaced) * 100;
          }
          if (mergedCareerStats.totalWickets > 0) {
            mergedCareerStats.bowlingAverage = mergedCareerStats.totalRunsGiven / mergedCareerStats.totalWickets;
          }
          if (mergedCareerStats.totalOvers > 0) {
            mergedCareerStats.economy = mergedCareerStats.totalRunsGiven / mergedCareerStats.totalOvers;
          }
        }

        // Prepare merge history
        const mergeHistoryEntry = {
          timestamp: new Date(),
          sourcePlayerId: sourcePlayerId,
          mergedBy: null, // Could be set by the caller
          mergedFields: Object.keys(mergedData)
        };

        // Update the target player with merged data
        const updatedPlayer = {
          ...targetPlayer,
          ...mergedData,
          careerStats: mergedCareerStats,
          mergedFromPlayerIds: [...(targetPlayer.mergedFromPlayerIds || []), sourcePlayerId],
          mergeHistory: [...(targetPlayer.mergeHistory || []), mergeHistoryEntry],
          updatedAt: new Date()
        };

        // Update the target player
        await this.players.findOneAndUpdate(
          { id: targetPlayerId },
          { $set: updatedPlayer },
          { session }
        );

        // Update all references to source player
        await this.updatePlayerReferencesInternal(sourcePlayerId, targetPlayerId, session);

        // Delete the source player
        await this.players.deleteOne({ id: sourcePlayerId }, { session });

        return { 
          success: true, 
          mergedPlayer: updatedPlayer as Player 
        };
      });
    } catch (error) {
      return { 
        success: false, 
        errors: [`Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    } finally {
      await session.endSession();
    }
  }

  async updatePlayerReferences(oldPlayerId: string, newPlayerId: string): Promise<{
    success: boolean;
    collectionsUpdated: string[];
    errors?: string[];
  }> {
    const session = this.client.startSession();
    
    try {
      return await session.withTransaction(async () => {
        return await this.updatePlayerReferencesInternal(oldPlayerId, newPlayerId, session);
      });
    } catch (error) {
      return {
        success: false,
        collectionsUpdated: [],
        errors: [`Failed to update player references: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    } finally {
      await session.endSession();
    }
  }

  private async updatePlayerReferencesInternal(oldPlayerId: string, newPlayerId: string, session?: any): Promise<{
    success: boolean;
    collectionsUpdated: string[];
    errors?: string[];
  }> {
    const collectionsUpdated: string[] = [];
    const errors: string[] = [];

    try {
      // Update team player arrays
      const teamUpdateResult = await this.teams.updateMany(
        { players: oldPlayerId },
        { $set: { "players.$": newPlayerId } },
        { session }
      );
      if (teamUpdateResult.modifiedCount > 0) {
        collectionsUpdated.push('teams');
      }

      // Update match participants
      const matchParticipantResult = await this.matchParticipants.updateMany(
        { playerId: oldPlayerId },
        { $set: { playerId: newPlayerId } },
        { session }
      );
      if (matchParticipantResult.modifiedCount > 0) {
        collectionsUpdated.push('matchParticipants');
      }

      // Update match scorecard references (if they exist)
      const matchUpdateResult = await this.matches.updateMany(
        { 
          $or: [
            { "team1Players": oldPlayerId },
            { "team2Players": oldPlayerId },
            { "scorecard.team1Innings.batsmen.playerId": oldPlayerId },
            { "scorecard.team1Innings.bowlers.playerId": oldPlayerId },
            { "scorecard.team2Innings.batsmen.playerId": oldPlayerId },
            { "scorecard.team2Innings.bowlers.playerId": oldPlayerId }
          ]
        },
        { 
          $set: { 
            "team1Players.$[elem1]": newPlayerId,
            "team2Players.$[elem2]": newPlayerId,
            "scorecard.team1Innings.$[].batsmen.$[batsman].playerId": newPlayerId,
            "scorecard.team1Innings.$[].bowlers.$[bowler].playerId": newPlayerId,
            "scorecard.team2Innings.$[].batsmen.$[batsman2].playerId": newPlayerId,
            "scorecard.team2Innings.$[].bowlers.$[bowler2].playerId": newPlayerId
          }
        },
        { 
          session,
          arrayFilters: [
            { "elem1": oldPlayerId },
            { "elem2": oldPlayerId },
            { "batsman.playerId": oldPlayerId },
            { "bowler.playerId": oldPlayerId },
            { "batsman2.playerId": oldPlayerId },
            { "bowler2.playerId": oldPlayerId }
          ]
        }
      );
      if (matchUpdateResult.modifiedCount > 0) {
        collectionsUpdated.push('matches');
      }

      return {
        success: true,
        collectionsUpdated
      };
    } catch (error) {
      return {
        success: false,
        collectionsUpdated,
        errors: [`Failed to update references: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async updatePlayerStats(playerId: string, matchStats: {
    runsScored?: number;
    ballsFaced?: number;
    fours?: number;
    sixes?: number;
    isOut?: boolean;
    oversBowled?: number;
    runsGiven?: number;
    wicketsTaken?: number;
    maidens?: number;
    catches?: number;
    runOuts?: number;
    stumpings?: number;
    manOfMatch?: boolean;
    bestBatsman?: boolean;
    bestBowler?: boolean;
    bestFielder?: boolean;
    matchWon?: boolean;
  }): Promise<Player | undefined> {
    
    const incrementFields: any = {};
    const updateFields: any = { updatedAt: new Date() };

    // Batting stats increments
    if (matchStats.runsScored !== undefined) incrementFields['careerStats.totalRuns'] = matchStats.runsScored;
    if (matchStats.ballsFaced !== undefined) incrementFields['careerStats.totalBallsFaced'] = matchStats.ballsFaced;
    if (matchStats.fours !== undefined) incrementFields['careerStats.totalFours'] = matchStats.fours;
    if (matchStats.sixes !== undefined) incrementFields['careerStats.totalSixes'] = matchStats.sixes;

    // Check for centuries/half-centuries
    if (matchStats.runsScored !== undefined) {
      if (matchStats.runsScored >= 100) {
        incrementFields['careerStats.centuries'] = 1;
      } else if (matchStats.runsScored >= 50) {
        incrementFields['careerStats.halfCenturies'] = 1;
      }
    }

    // Bowling stats increments
    if (matchStats.oversBowled !== undefined) incrementFields['careerStats.totalOvers'] = matchStats.oversBowled;
    if (matchStats.runsGiven !== undefined) incrementFields['careerStats.totalRunsGiven'] = matchStats.runsGiven;
    if (matchStats.wicketsTaken !== undefined) incrementFields['careerStats.totalWickets'] = matchStats.wicketsTaken;
    if (matchStats.maidens !== undefined) incrementFields['careerStats.totalMaidens'] = matchStats.maidens;

    // Check for five wicket hauls
    if (matchStats.wicketsTaken !== undefined && matchStats.wicketsTaken >= 5) {
      incrementFields['careerStats.fiveWicketHauls'] = 1;
    }

    // Fielding stats increments
    if (matchStats.catches !== undefined) incrementFields['careerStats.catches'] = matchStats.catches;
    if (matchStats.runOuts !== undefined) incrementFields['careerStats.runOuts'] = matchStats.runOuts;
    if (matchStats.stumpings !== undefined) incrementFields['careerStats.stumpings'] = matchStats.stumpings;

    // Awards increments
    if (matchStats.manOfMatch === true) incrementFields['careerStats.manOfTheMatchAwards'] = 1;
    if (matchStats.bestBatsman === true) incrementFields['careerStats.bestBatsmanAwards'] = 1;
    if (matchStats.bestBowler === true) incrementFields['careerStats.bestBowlerAwards'] = 1;
    if (matchStats.bestFielder === true) incrementFields['careerStats.bestFielderAwards'] = 1;

    // Match stats increments
    incrementFields['careerStats.totalMatches'] = 1;
    if (matchStats.matchWon === true) incrementFields['careerStats.matchesWon'] = 1;

    // Update highest score if this is higher
    if (matchStats.runsScored !== undefined) {
      const currentPlayer = await this.getPlayer(playerId);
      if (currentPlayer && matchStats.runsScored > currentPlayer.careerStats.highestScore) {
        updateFields['careerStats.highestScore'] = matchStats.runsScored;
      }
    }

    const update: any = { $set: updateFields };
    if (Object.keys(incrementFields).length > 0) {
      update.$inc = incrementFields;
    }

    const result = await this.players.findOneAndUpdate(
      { id: playerId },
      update,
      { returnDocument: 'after' }
    );

    // After update, recalculate averages and rates
    if (result) {
      await this.recalculatePlayerAverages(playerId);
      return await this.getPlayer(playerId);
    }
    return undefined;
  }

  // Helper method to recalculate team statistics including net run rate
  private async recalculateTeamStats(teamId: string): Promise<void> {
    const team = await this.getTeam(teamId);
    if (!team) return;

    const updateFields: any = {};

    // Calculate net run rate (NRR = (Runs Scored/Overs Faced) - (Runs Conceded/Overs Bowled))
    const totalMatches = team.totalMatches || 0;
    const totalRunsScored = team.totalRunsScored || 0;
    const totalRunsConceded = team.totalRunsConceded || 0;
    
    if (totalMatches > 0) {
      // Calculate NRR using proper cricket formula
      // NRR = (Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)
      // For estimation, we assume T20 format (20 overs per innings)
      const estimatedOversFaced = totalMatches * 20; // Each match, team faces 20 overs
      const estimatedOversBowled = totalMatches * 20; // Each match, team bowls 20 overs
      
      const runRateScored = totalRunsScored / estimatedOversFaced;
      const runRateConceded = totalRunsConceded / estimatedOversBowled;
      const netRunRate = runRateScored - runRateConceded;
      
      updateFields.netRunRate = Math.round(netRunRate * 1000) / 1000; // Round to 3 decimal places
      
      console.log(`📊 STORAGE: Recalculated NRR for team ${teamId}: ${netRunRate.toFixed(3)} (${totalRunsScored} runs scored, ${totalRunsConceded} runs conceded, ${totalMatches} matches)`);
    }

    if (Object.keys(updateFields).length > 0) {
      await this.teams.updateOne(
        { id: teamId },
        { $set: updateFields }
      );
    }
  }

  // Helper method to recalculate averages and rates
  private async recalculatePlayerAverages(playerId: string): Promise<void> {
    const player = await this.getPlayer(playerId);
    if (!player) return;

    const stats = player.careerStats;
    const updateFields: any = {};

    // Calculate batting average (runs / times out)
    if (stats.totalMatches > 0) {
      // Simplified calculation - in real implementation, track times out separately
      const battingAverage = stats.totalRuns / Math.max(stats.totalMatches, 1);
      updateFields['careerStats.battingAverage'] = Math.round(battingAverage * 100) / 100;
    }

    // Calculate strike rate (runs per 100 balls)
    if (stats.totalBallsFaced > 0) {
      const strikeRate = (stats.totalRuns / stats.totalBallsFaced) * 100;
      updateFields['careerStats.strikeRate'] = Math.round(strikeRate * 100) / 100;
    }

    // Calculate bowling average (runs given / wickets taken)
    if (stats.totalWickets > 0) {
      const bowlingAverage = stats.totalRunsGiven / stats.totalWickets;
      updateFields['careerStats.bowlingAverage'] = Math.round(bowlingAverage * 100) / 100;
    }

    // Calculate economy rate (runs per over)
    if (stats.totalOvers > 0) {
      const economy = stats.totalRunsGiven / stats.totalOvers;
      updateFields['careerStats.economy'] = Math.round(economy * 100) / 100;
    }

    if (Object.keys(updateFields).length > 0) {
      await this.players.updateOne(
        { id: playerId },
        { $set: updateFields }
      );
    }
  }

  // Cricket match operations (enhanced)
  async createCricketMatch(matchData: InsertCricketMatch): Promise<Match> {
    const id = `match-${this.generateId()}`;
    const match: Match = {
      id,
      title: matchData.title,
      sport: matchData.sport,
      matchType: matchData.matchType,
      isPublic: matchData.isPublic || null,
      venueId: matchData.venueId,
      organizerId: matchData.organizerId,
      scheduledAt: matchData.scheduledAt,
      duration: matchData.duration || null,
      maxPlayers: matchData.maxPlayers,
      currentPlayers: matchData.currentPlayers || null,
      status: matchData.status || 'scheduled',
      team1Name: matchData.team1Name || null,
      team2Name: matchData.team2Name || null,
      team1Score: matchData.team1Score || null,
      team2Score: matchData.team2Score || null,
      matchData: {
        ...matchData,
        scorecard: matchData.scorecard || null,
        awards: matchData.awards || null,
        resultSummary: matchData.resultSummary || null,
      },
      description: matchData.description || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.matches.insertOne(match as any);
    return match;
  }

  async updateMatchScorecard(matchId: string, scorecard: any): Promise<Match | undefined> {
    const result = await this.matches.findOneAndUpdate(
      { id: matchId } as any,
      { 
        $set: { 
          'matchData.scorecard': scorecard,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );
    return result as Match || undefined;
  }

  // Atomic post-match update method to update teams and players in one operation
  async applyMatchResults(matchData: {
    matchId: string;
    status: string;
    team1Id?: string;
    team2Id?: string;
    winnerTeamId?: string;
    scorecard?: any;
    awards?: any;
    resultSummary?: any;
    playerStats: Array<{
      playerId: string;
      teamId: string;
      runsScored?: number;
      ballsFaced?: number;
      fours?: number;
      sixes?: number;
      isOut?: boolean;
      oversBowled?: number;
      runsGiven?: number;
      wicketsTaken?: number;
      maidens?: number;
      catches?: number;
      runOuts?: number;
      stumpings?: number;
      manOfMatch?: boolean;
      bestBatsman?: boolean;
      bestBowler?: boolean;
      bestFielder?: boolean;
    }>;
  }): Promise<{ success: boolean; updatedMatch?: Match; errors?: string[]; cacheInvalidation?: { teams: string[]; players: string[]; matches: string[] } }> {
    const session = this.client.startSession();
    
    try {
      let updatedMatch: Match | undefined;
      const errors: string[] = [];

      await session.withTransaction(async () => {
        console.log(`🔄 STORAGE: Starting atomic match completion transaction for ${matchData.matchId}`);
        
        // Update match status, scorecard, awards, resultSummary and mark as processed atomically
        // Enforce idempotency at database level - only update if not already processed
        const matchResult = await this.matches.findOneAndUpdate(
          { 
            id: matchData.matchId,
            'matchData.processed': { $ne: true } // Idempotency guard at DB level
          } as any,
          {
            $set: {
              status: matchData.status,
              'matchData.scorecard': matchData.scorecard,
              'matchData.awards': matchData.awards,
              'matchData.resultSummary': matchData.resultSummary,
              'matchData.processed': true, // Ensure idempotency
              updatedAt: new Date()
            }
          },
          { returnDocument: 'after', session }
        );
        
        console.log(`✅ STORAGE: Match ${matchData.matchId} status updated and marked as processed`);
        
        if (matchResult) {
          updatedMatch = matchResult as Match;
          console.log(`✅ STORAGE: Match ${matchData.matchId} status updated and marked as processed`);
        } else {
          // Check if match exists but is already processed
          const existingMatch = await this.matches.findOne({ id: matchData.matchId } as any, { session });
          if (existingMatch && (existingMatch.matchData as any)?.processed === true) {
            console.log(`⚠️ STORAGE: Match ${matchData.matchId} already processed, returning existing`);
            updatedMatch = existingMatch as Match;
            console.log(`⚠️ STORAGE: Skipping all processing for already processed match`);
            // Return immediately with already processed flag
            return { 
              success: true, 
              updatedMatch, 
              errors: ['Match already processed'],
              cacheInvalidation: {
                teams: [],
                players: [],
                matches: []
              }
            };
          } else {
            throw new Error(`Match ${matchData.matchId} not found or concurrency conflict`);
          }
        }

        // Update team stats
        console.log(`🏏 STORAGE: Updating team statistics`);
        if (matchData.team1Id && matchData.team2Id) {
          // Initialize team stats with all required fields
          const team1Stats = {
            matchesWon: 0,
            matchesLost: 0,
            matchesDrawn: 0,
            runsScored: 0,
            runsConceded: 0,
            wicketsTaken: 0,
            wicketsLost: 0,
            tournamentPoints: 0
          };

          const team2Stats = {
            matchesWon: 0,
            matchesLost: 0,
            matchesDrawn: 0,
            runsScored: 0,
            runsConceded: 0,
            wicketsTaken: 0,
            wicketsLost: 0,
            tournamentPoints: 0
          };

          // Handle match result (wins/losses/draws and tournament points)
          if (matchData.resultSummary?.resultType === 'tied') {
            // Tied match - both teams get a draw and 1 point each
            team1Stats.matchesDrawn = 1;
            team2Stats.matchesDrawn = 1;
            team1Stats.tournamentPoints = 1;
            team2Stats.tournamentPoints = 1;
          } else if (matchData.winnerTeamId) {
            // One team won - winner gets 2 points, loser gets 0
            if (matchData.winnerTeamId === matchData.team1Id) {
              team1Stats.matchesWon = 1;
              team2Stats.matchesLost = 1;
              team1Stats.tournamentPoints = 2;
            } else {
              team2Stats.matchesWon = 1;
              team1Stats.matchesLost = 1;
              team2Stats.tournamentPoints = 2;
            }
          }

          // Extract comprehensive statistics from scorecard
          if (matchData.scorecard) {
            const scorecard = matchData.scorecard;
            
            // Process team1 innings (team1 batting, team2 bowling)
            if (scorecard.team1Innings && Array.isArray(scorecard.team1Innings)) {
              scorecard.team1Innings.forEach((innings: any) => {
                if (innings.battingTeamId === matchData.team1Id) {
                  // Team1 was batting
                  team1Stats.runsScored += innings.totalRuns || 0;
                  team1Stats.wicketsLost += innings.totalWickets || 0;
                  // Team2 was bowling (conceding runs, taking wickets)
                  team2Stats.runsConceded += innings.totalRuns || 0;
                  team2Stats.wicketsTaken += innings.totalWickets || 0;
                }
              });
            }
            
            // Process team2 innings (team2 batting, team1 bowling)
            if (scorecard.team2Innings && Array.isArray(scorecard.team2Innings)) {
              scorecard.team2Innings.forEach((innings: any) => {
                if (innings.battingTeamId === matchData.team2Id) {
                  // Team2 was batting
                  team2Stats.runsScored += innings.totalRuns || 0;
                  team2Stats.wicketsLost += innings.totalWickets || 0;
                  // Team1 was bowling (conceding runs, taking wickets)
                  team1Stats.runsConceded += innings.totalRuns || 0;
                  team1Stats.wicketsTaken += innings.totalWickets || 0;
                }
              });
            }
          }
          
          // Fallback: Calculate team runs and wickets from player stats if scorecard data is incomplete
          if (team1Stats.runsScored === 0 && team2Stats.runsScored === 0) {
            matchData.playerStats.forEach(playerStat => {
              if (playerStat.teamId === matchData.team1Id) {
                team1Stats.runsScored += playerStat.runsScored || 0;
                team1Stats.wicketsTaken += playerStat.wicketsTaken || 0;
                team2Stats.runsConceded += playerStat.runsGiven || 0;
              } else if (playerStat.teamId === matchData.team2Id) {
                team2Stats.runsScored += playerStat.runsScored || 0;
                team2Stats.wicketsTaken += playerStat.wicketsTaken || 0;
                team1Stats.runsConceded += playerStat.runsGiven || 0;
              }
            });
          }
          
          console.log(`📊 STORAGE: Team1 (${matchData.team1Id}): +${team1Stats.runsScored} runs scored, +${team1Stats.runsConceded} runs conceded, +${team1Stats.wicketsTaken} wickets taken, +${team1Stats.wicketsLost} wickets lost, +${team1Stats.tournamentPoints} points`);
          console.log(`📊 STORAGE: Team2 (${matchData.team2Id}): +${team2Stats.runsScored} runs scored, +${team2Stats.runsConceded} runs conceded, +${team2Stats.wicketsTaken} wickets taken, +${team2Stats.wicketsLost} wickets lost, +${team2Stats.tournamentPoints} points`);

          // Update both teams atomically with comprehensive statistics
          await Promise.all([
            this.teams.updateOne(
              { id: matchData.team1Id },
              {
                $inc: {
                  totalMatches: 1,
                  matchesWon: team1Stats.matchesWon,
                  matchesLost: team1Stats.matchesLost,
                  matchesDrawn: team1Stats.matchesDrawn,
                  totalRunsScored: team1Stats.runsScored,
                  totalRunsConceded: team1Stats.runsConceded,
                  totalWicketsTaken: team1Stats.wicketsTaken,
                  totalWicketsLost: team1Stats.wicketsLost,
                  tournamentPoints: team1Stats.tournamentPoints
                },
                $set: { updatedAt: new Date() }
              },
              { session }
            ),
            this.teams.updateOne(
              { id: matchData.team2Id },
              {
                $inc: {
                  totalMatches: 1,
                  matchesWon: team2Stats.matchesWon,
                  matchesLost: team2Stats.matchesLost,
                  matchesDrawn: team2Stats.matchesDrawn,
                  totalRunsScored: team2Stats.runsScored,
                  totalRunsConceded: team2Stats.runsConceded,
                  totalWicketsTaken: team2Stats.wicketsTaken,
                  totalWicketsLost: team2Stats.wicketsLost,
                  tournamentPoints: team2Stats.tournamentPoints
                },
                $set: { updatedAt: new Date() }
              },
              { session }
            )
          ]);
        }

        console.log(`✅ STORAGE: Team statistics updated successfully`);
        
        // Update all player stats atomically
        console.log(`👥 STORAGE: Updating career statistics for ${matchData.playerStats.length} players`);
        for (const playerStat of matchData.playerStats) {
          const isWinner = playerStat.teamId === matchData.winnerTeamId;
          console.log(`🏃 STORAGE: Processing player ${playerStat.playerId} (Winner: ${isWinner})`);
          
          const incrementFields: any = {
            'careerStats.totalMatches': 1
          };

          if (isWinner) incrementFields['careerStats.matchesWon'] = 1;
          if (playerStat.runsScored) incrementFields['careerStats.totalRuns'] = playerStat.runsScored;
          if (playerStat.ballsFaced) incrementFields['careerStats.totalBallsFaced'] = playerStat.ballsFaced;
          if (playerStat.fours) incrementFields['careerStats.totalFours'] = playerStat.fours;
          if (playerStat.sixes) incrementFields['careerStats.totalSixes'] = playerStat.sixes;
          if (playerStat.oversBowled) incrementFields['careerStats.totalOvers'] = playerStat.oversBowled;
          if (playerStat.runsGiven) incrementFields['careerStats.totalRunsGiven'] = playerStat.runsGiven;
          if (playerStat.wicketsTaken) incrementFields['careerStats.totalWickets'] = playerStat.wicketsTaken;
          if (playerStat.maidens) incrementFields['careerStats.totalMaidens'] = playerStat.maidens;
          if (playerStat.catches) incrementFields['careerStats.catches'] = playerStat.catches;
          if (playerStat.runOuts) incrementFields['careerStats.runOuts'] = playerStat.runOuts;
          if (playerStat.stumpings) incrementFields['careerStats.stumpings'] = playerStat.stumpings;
          if (playerStat.manOfMatch) incrementFields['careerStats.manOfTheMatchAwards'] = 1;
          if (playerStat.bestBatsman) incrementFields['careerStats.bestBatsmanAwards'] = 1;
          if (playerStat.bestBowler) incrementFields['careerStats.bestBowlerAwards'] = 1;
          if (playerStat.bestFielder) incrementFields['careerStats.bestFielderAwards'] = 1;

          // Check for centuries/half-centuries
          if (playerStat.runsScored) {
            if (playerStat.runsScored >= 100) {
              incrementFields['careerStats.centuries'] = 1;
            } else if (playerStat.runsScored >= 50) {
              incrementFields['careerStats.halfCenturies'] = 1;
            }
          }

          // Check for five wicket hauls
          if (playerStat.wicketsTaken && playerStat.wicketsTaken >= 5) {
            incrementFields['careerStats.fiveWicketHauls'] = 1;
          }

          // Update highest score if needed
          const updateFields: any = { updatedAt: new Date() };
          if (playerStat.runsScored) {
            const currentPlayer = await this.getPlayer(playerStat.playerId);
            if (currentPlayer && playerStat.runsScored > currentPlayer.careerStats.highestScore) {
              updateFields['careerStats.highestScore'] = playerStat.runsScored;
            }
          }

          await this.players.updateOne(
            { id: playerStat.playerId },
            {
              $inc: incrementFields,
              $set: updateFields
            },
            { session }
          );
        }
      });

      // After transaction, recalculate derived metrics for all affected teams and players
      console.log(`📊 STORAGE: Recalculating derived metrics for teams and players`);
      if (matchData.team1Id) await this.recalculateTeamStats(matchData.team1Id);
      if (matchData.team2Id) await this.recalculateTeamStats(matchData.team2Id);
      
      // Only process if we actually updated something (not already processed)
      if (updatedMatch && matchData.playerStats.length > 0) {
        const updatedPlayerIds: string[] = [];
        for (const playerStat of matchData.playerStats) {
          await this.recalculatePlayerAverages(playerStat.playerId);
          updatedPlayerIds.push(playerStat.playerId);
        }
        
        console.log(`✅ STORAGE: Updated statistics for ${updatedPlayerIds.length} players`);
        console.log(`📈 STORAGE: Players requiring cache invalidation: ${updatedPlayerIds.join(', ')}`);
        
        // Return information about what needs cache invalidation
        return { 
          success: true, 
          updatedMatch, 
          errors,
          cacheInvalidation: {
            teams: [matchData.team1Id, matchData.team2Id].filter(Boolean) as string[],
            players: updatedPlayerIds,
            matches: [matchData.matchId]
          }
        };
      } else {
        // Already processed case or no player stats
        return { 
          success: true, 
          updatedMatch, 
          errors: updatedMatch ? ['Match already processed'] : [],
          cacheInvalidation: {
            teams: [],
            players: [],
            matches: []
          }
        };
      }

    } catch (error) {
      return { 
        success: false, 
        errors: [`Failed to apply match results: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    } finally {
      await session.endSession();
    }
  }

  async getPlayerMatchHistory(playerId: string): Promise<Match[]> {
    // Find matches where player participated
    const matches = await this.matches.find({
      $or: [
        { 'matchData.team1Players': playerId },
        { 'matchData.team2Players': playerId }
      ]
    } as any).sort({ createdAt: -1 }).toArray();
    
    return matches;
  }

  async getTeamMatchHistory(teamId: string): Promise<Match[]> {
    // Find matches where team participated
    const matches = await this.matches.find({
      $or: [
        { 'matchData.team1Id': teamId },
        { 'matchData.team2Id': teamId }
      ]
    } as any).sort({ createdAt: -1 }).toArray();
    
    return matches;
  }

  async updatePlayerCareerStats(matchId: string, playerStats: Array<{
    playerId: string;
    teamId: string;
    runsScored?: number;
    ballsFaced?: number;
    fours?: number;
    sixes?: number;
    isOut?: boolean;
    oversBowled?: number;
    runsGiven?: number;
    wicketsTaken?: number;
    maidens?: number;
    manOfMatch?: boolean;
  }>): Promise<{ success: boolean; playersUpdated?: number; errors?: string[]; cacheInvalidation?: { players: string[] } }> {
    const session = this.client.startSession();
    const errors: string[] = [];
    const updatedPlayerIds: string[] = [];
    
    try {
      await session.withTransaction(async () => {
        console.log(`📊 Updating career stats for ${playerStats.length} players from match ${matchId}`);
        
        for (const playerStat of playerStats) {
          const playerLogId = `Player[${playerStat.playerId}]`;
          try {
            console.log(`🔄 Processing career stats for ${playerLogId}`);
            
            // Detailed logging only in debug mode to avoid log flooding
            if (process.env.LOG_LEVEL === 'debug') {
              console.log(`📊 Input stats:`, {
                runsScored: playerStat.runsScored,
                ballsFaced: playerStat.ballsFaced,
                fours: playerStat.fours,
                sixes: playerStat.sixes,
                wicketsTaken: playerStat.wicketsTaken,
                oversBowled: playerStat.oversBowled,
                runsGiven: playerStat.runsGiven,
                maidens: playerStat.maidens,
                manOfMatch: playerStat.manOfMatch
              });
            }
            
            // Input validation
            if (!playerStat.playerId) {
              const errorMsg = `${playerLogId}: Missing playerId`;
              console.error(`❌ ${errorMsg}`);
              errors.push(errorMsg);
              continue;
            }
            
            // Find player by ID or name with detailed logging
            console.log(`🔍 Searching for player with ID: ${playerStat.playerId}`);
            const player = await this.players.findOne({ 
              $or: [
                { id: playerStat.playerId },
                { name: playerStat.playerId }
              ]
            } as any, { session });
            
            if (!player) {
              const errorMsg = `${playerLogId}: Player not found in database`;
              console.error(`❌ ${errorMsg}`);
              errors.push(errorMsg);
              continue;
            }
            
            console.log(`✅ Found player: [REDACTED] (ID: ${player.id})`);
            if (process.env.LOG_LEVEL === 'debug') {
              console.log(`📈 Current career stats before update:`, player.careerStats || {});
            }
            
            // Update player career statistics with correct field names
            const updateData: any = {
              $inc: {
                // Batting stats - use correct schema field names and handle 0 values
                ...(typeof playerStat.runsScored === 'number' && { 'careerStats.totalRuns': playerStat.runsScored }),
                ...(typeof playerStat.ballsFaced === 'number' && { 'careerStats.totalBallsFaced': playerStat.ballsFaced }),
                ...(typeof playerStat.fours === 'number' && { 'careerStats.totalFours': playerStat.fours }),
                ...(typeof playerStat.sixes === 'number' && { 'careerStats.totalSixes': playerStat.sixes }),
                // Bowling stats - use correct schema field names
                ...(typeof playerStat.oversBowled === 'number' && { 'careerStats.totalOvers': playerStat.oversBowled }),
                ...(typeof playerStat.runsGiven === 'number' && { 'careerStats.totalRunsGiven': playerStat.runsGiven }),
                ...(typeof playerStat.wicketsTaken === 'number' && { 'careerStats.totalWickets': playerStat.wicketsTaken }),
                ...(typeof playerStat.maidens === 'number' && { 'careerStats.totalMaidens': playerStat.maidens }),
                // Match awards
                ...(playerStat.manOfMatch && { 'careerStats.manOfTheMatchAwards': 1 }),
                // Total matches
                'careerStats.totalMatches': 1
              },
              $set: {
                updatedAt: new Date()
              }
            };

            // Handle centuries and half-centuries
            if (typeof playerStat.runsScored === 'number') {
              if (playerStat.runsScored >= 100) {
                updateData.$inc['careerStats.centuries'] = 1;
              } else if (playerStat.runsScored >= 50) {
                updateData.$inc['careerStats.halfCenturies'] = 1;
              }
              // Update highest score if needed
              if (playerStat.runsScored > (player.careerStats?.highestScore || 0)) {
                updateData.$set['careerStats.highestScore'] = playerStat.runsScored;
              }
            }

            // Handle five-wicket hauls
            if (typeof playerStat.wicketsTaken === 'number' && playerStat.wicketsTaken >= 5) {
              updateData.$inc['careerStats.fiveWicketHauls'] = 1;
            }
            
            // Log the update operation about to be performed (debug mode only)
            if (process.env.LOG_LEVEL === 'debug') {
              console.log(`🔧 Update operation:`, JSON.stringify(updateData, null, 2));
            }
            
            const updateResult = await this.players.updateOne(
              { id: player.id } as any,
              updateData,
              { session }
            );
            
            // Validate update result
            if (updateResult.matchedCount === 0) {
              const errorMsg = `${playerLogId}: Player document not matched during update (ID: ${player.id})`;
              console.error(`❌ ${errorMsg}`);
              errors.push(errorMsg);
              continue;
            }
            
            if (updateResult.modifiedCount === 0) {
              console.warn(`⚠️ ${playerLogId}: No fields were modified`);
              console.log(`🔍 This could indicate no actual stat changes or update conflicts`);
            } else {
              console.log(`✅ ${playerLogId}: Successfully updated career stats (${updateResult.modifiedCount} document modified)`);
            }
            
            // Verify the update by checking actual field changes
            const updatedPlayer = await this.players.findOne({ id: player.id } as any, { session });
            if (updatedPlayer && process.env.LOG_LEVEL === 'debug') {
              console.log(`📈 Career stats after update:`, updatedPlayer.careerStats || {});
              
              // Validate specific field updates
              const validateField = (fieldName: string, expectedIncrease: number, actualValue: number, previousValue: number) => {
                if (expectedIncrease !== 0) {
                  const actualIncrease = actualValue - (previousValue || 0);
                  if (Math.abs(actualIncrease - expectedIncrease) > 0.001) {
                    console.warn(`⚠️ ${playerLogId}: ${fieldName} increment mismatch. Expected: +${expectedIncrease}, Actual: +${actualIncrease}`);
                  } else {
                    console.log(`✅ ${playerLogId}: ${fieldName} correctly updated: ${previousValue || 0} → ${actualValue} (+${expectedIncrease})`);
                  }
                }
              };
              
              // Validate key field updates
              if (typeof playerStat.runsScored === 'number') {
                validateField('totalRuns', playerStat.runsScored, 
                  updatedPlayer.careerStats?.totalRuns || 0, 
                  player.careerStats?.totalRuns || 0);
              }
              if (typeof playerStat.wicketsTaken === 'number') {
                validateField('totalWickets', playerStat.wicketsTaken, 
                  updatedPlayer.careerStats?.totalWickets || 0, 
                  player.careerStats?.totalWickets || 0);
              }
            }
            
            // Note: Recalculation moved outside transaction to avoid session conflicts
            updatedPlayerIds.push(player.id);
            console.log(`🎯 ${playerLogId}: Added to recalculation queue`);
            
          } catch (playerError) {
            const errorMsg = `${playerLogId}: Failed to update career stats - ${playerError instanceof Error ? playerError.message : 'Unknown error'}`;
            console.error(`❌ ${errorMsg}`);
            console.error(`🔍 Error details:`, playerError);
            errors.push(errorMsg);
          }
        }
      });
      
      // Recalculate derived metrics (averages, rates) after transaction commits for data consistency
      console.log(`🔄 Recalculating derived metrics for ${updatedPlayerIds.length} players`);
      const recalculationErrors: string[] = [];
      
      for (const playerId of updatedPlayerIds) {
        try {
          console.log(`📊 Recalculating averages for player: ${playerId}`);
          await this.recalculatePlayerAverages(playerId);
          console.log(`✅ Averages recalculated successfully for player: ${playerId}`);
        } catch (error) {
          const errorMsg = `Failed to recalculate averages for player ${playerId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.warn(`⚠️ ${errorMsg}`);
          recalculationErrors.push(errorMsg);
          // Don't fail the whole operation for recalculation errors
        }
      }
      
      // Final summary
      console.log(`\n📋 PLAYER STATS UPDATE SUMMARY:`);
      console.log(`  Total players processed: ${playerStats.length}`);
      console.log(`  Successfully updated: ${updatedPlayerIds.length}`);
      console.log(`  Update errors: ${errors.length}`);
      console.log(`  Recalculation errors: ${recalculationErrors.length}`);
      
      if (errors.length > 0) {
        console.log(`\n❌ Update errors:`);
        errors.forEach((error, index) => console.log(`  ${index + 1}. ${error}`));
      }
      
      if (recalculationErrors.length > 0) {
        console.log(`\n⚠️ Recalculation errors:`);
        recalculationErrors.forEach((error, index) => console.log(`  ${index + 1}. ${error}`));
      }
      
      console.log(`✅ Career stats update operation completed: ${updatedPlayerIds.length}/${playerStats.length} players updated successfully`);
      
      return {
        success: true,
        playersUpdated: updatedPlayerIds.length,
        errors: [...errors, ...recalculationErrors].length > 0 ? [...errors, ...recalculationErrors] : undefined,
        cacheInvalidation: {
          players: updatedPlayerIds
        }
      };
      
    } catch (error) {
      console.error('Error updating player career stats:', error);
      return {
        success: false,
        errors: [`Failed to update player career stats: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    } finally {
      await session.endSession();
    }
  }

  async updateUserCricketStats(userId: string, matchId: string, playerStats: {
    runsScored?: number;
    ballsFaced?: number;
    fours?: number;
    sixes?: number;
    isOut?: boolean;
    oversBowled?: number;
    runsGiven?: number;
    wicketsTaken?: number;
    maidens?: number;
    catches?: number;
    runOuts?: number;
    stumpings?: number;
    manOfMatch?: boolean;
    bestBatsman?: boolean;
    bestBowler?: boolean;
    bestFielder?: boolean;
    isWinner?: boolean;
  }): Promise<{ success: boolean; error?: string; alreadyProcessed?: boolean }> {
    try {
      console.log(`🔄 Updating cricket stats for user ${userId} from match ${matchId}`);

      // Check if user exists
      const user = await this.users.findOne({ id: userId } as any);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Initialize cricket stats if they don't exist
      const currentStats = user.cricketStats || {
        totalMatches: 0,
        matchesWon: 0,
        totalRuns: 0,
        totalBallsFaced: 0,
        totalFours: 0,
        totalSixes: 0,
        centuries: 0,
        halfCenturies: 0,
        highestScore: 0,
        totalOvers: 0,
        totalRunsGiven: 0,
        totalWickets: 0,
        totalMaidens: 0,
        fiveWicketHauls: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        manOfTheMatchAwards: 0,
        bestBatsmanAwards: 0,
        bestBowlerAwards: 0,
        bestFielderAwards: 0,
        battingAverage: 0,
        strikeRate: 0,
        bowlingAverage: 0,
        economyRate: 0,
        processedMatches: [],
      };

      // Check if this match has already been processed
      if (currentStats.processedMatches.includes(matchId)) {
        console.log(`⚠️ Match ${matchId} already processed for user ${userId}, skipping update`);
        return { success: true, alreadyProcessed: true };
      }

      // Update match count
      currentStats.totalMatches += 1;
      if (playerStats.isWinner) currentStats.matchesWon += 1;

      // Update batting stats
      if (playerStats.runsScored) {
        currentStats.totalRuns += playerStats.runsScored;
        if (playerStats.runsScored > currentStats.highestScore) {
          currentStats.highestScore = playerStats.runsScored;
        }
        // Check for centuries and half-centuries
        if (playerStats.runsScored >= 100) {
          currentStats.centuries += 1;
        } else if (playerStats.runsScored >= 50) {
          currentStats.halfCenturies += 1;
        }
      }
      if (playerStats.ballsFaced) currentStats.totalBallsFaced += playerStats.ballsFaced;
      if (playerStats.fours) currentStats.totalFours += playerStats.fours;
      if (playerStats.sixes) currentStats.totalSixes += playerStats.sixes;

      // Update bowling stats
      if (playerStats.oversBowled) currentStats.totalOvers += playerStats.oversBowled;
      if (playerStats.runsGiven) currentStats.totalRunsGiven += playerStats.runsGiven;
      if (playerStats.wicketsTaken) {
        currentStats.totalWickets += playerStats.wicketsTaken;
        // Check for five wicket hauls
        if (playerStats.wicketsTaken >= 5) {
          currentStats.fiveWicketHauls += 1;
        }
      }
      if (playerStats.maidens) currentStats.totalMaidens += playerStats.maidens;

      // Update fielding stats
      if (playerStats.catches) currentStats.catches += playerStats.catches;
      if (playerStats.runOuts) currentStats.runOuts += playerStats.runOuts;
      if (playerStats.stumpings) currentStats.stumpings += playerStats.stumpings;

      // Update awards
      if (playerStats.manOfMatch) currentStats.manOfTheMatchAwards += 1;
      if (playerStats.bestBatsman) currentStats.bestBatsmanAwards += 1;
      if (playerStats.bestBowler) currentStats.bestBowlerAwards += 1;
      if (playerStats.bestFielder) currentStats.bestFielderAwards += 1;

      // Add this match to processed matches
      currentStats.processedMatches.push(matchId);

      // Calculate derived stats from totals (ensures correctness)
      // Batting average (runs per match for users, since we don't track dismissals separately)
      currentStats.battingAverage = currentStats.totalRuns > 0 && currentStats.totalMatches > 0 
        ? Math.round((currentStats.totalRuns / currentStats.totalMatches) * 100) / 100 
        : 0;

      // Strike rate (runs per 100 balls)
      currentStats.strikeRate = currentStats.totalBallsFaced > 0 
        ? Math.round((currentStats.totalRuns / currentStats.totalBallsFaced) * 10000) / 100 
        : 0;

      // Bowling average (runs per wicket)
      currentStats.bowlingAverage = currentStats.totalWickets > 0 
        ? Math.round((currentStats.totalRunsGiven / currentStats.totalWickets) * 100) / 100 
        : 0;

      // Economy rate (runs per over)
      currentStats.economyRate = currentStats.totalOvers > 0 
        ? Math.round((currentStats.totalRunsGiven / currentStats.totalOvers) * 100) / 100 
        : 0;

      // Update user document
      await this.users.updateOne(
        { id: userId } as any,
        {
          $set: {
            cricketStats: currentStats,
            updatedAt: new Date()
          }
        }
      );

      console.log(`✅ Cricket stats updated for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error updating user cricket stats:', error);
      return { 
        success: false, 
        error: 'Failed to update user cricket statistics' 
      };
    }
  }
}