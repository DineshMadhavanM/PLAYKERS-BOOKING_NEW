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
  async getTeams(filters?: { search?: string }): Promise<Team[]> {
    let query: any = {};
    
    if (filters) {
      if (filters.search) {
        query.name = new RegExp(filters.search, 'i');
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
      totalWicketsTaken: 0,
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
    wicketsTaken?: number; 
    tournamentPoints?: number;
  }): Promise<Team | undefined> {
    const updateFields: any = { updatedAt: new Date() };
    const incrementFields: any = {};

    // Increment team statistics
    if (stats.matchesWon !== undefined) incrementFields.matchesWon = stats.matchesWon;
    if (stats.matchesLost !== undefined) incrementFields.matchesLost = stats.matchesLost;
    if (stats.matchesDrawn !== undefined) incrementFields.matchesDrawn = stats.matchesDrawn;
    if (stats.runsScored !== undefined) incrementFields.totalRunsScored = stats.runsScored;
    if (stats.wicketsTaken !== undefined) incrementFields.totalWicketsTaken = stats.wicketsTaken;
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
    const id = `player-${this.generateId()}`;
    const player: Player = {
      id,
      ...playerData,
      email: playerData.email || null,
      userId: playerData.userId || null,
      teamId: playerData.teamId || null,
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
    const result = await this.players.findOneAndUpdate(
      { id } as any,
      { $set: { ...playerData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result as Player || undefined;
  }

  async deletePlayer(id: string): Promise<boolean> {
    const result = await this.players.deleteOne({ id } as any);
    return result.deletedCount > 0;
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
    // For simplified calculation, we'll use: NRR = (Total Runs Scored - Total Runs Given) / Total Overs
    const totalMatches = team.totalMatches || 0;
    const totalRunsScored = team.totalRunsScored || 0;
    
    if (totalMatches > 0) {
      // Simplified NRR calculation - in real implementation, should track overs separately
      const estimatedOvers = totalMatches * 20; // Assume T20 format for calculation
      const netRunRate = (totalRunsScored - (totalRunsScored * 0.8)) / estimatedOvers;
      updateFields.netRunRate = Math.round(netRunRate * 100) / 100;
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
        if (matchData.team1Id && matchData.team2Id && matchData.winnerTeamId) {
          const team1Stats = {
            matchesWon: matchData.winnerTeamId === matchData.team1Id ? 1 : 0,
            matchesLost: matchData.winnerTeamId !== matchData.team1Id ? 1 : 0,
            runsScored: 0,
            wicketsTaken: 0
          };

          const team2Stats = {
            matchesWon: matchData.winnerTeamId === matchData.team2Id ? 1 : 0,
            matchesLost: matchData.winnerTeamId !== matchData.team2Id ? 1 : 0,
            runsScored: 0,
            wicketsTaken: 0
          };

          // Calculate team runs and wickets from player stats
          matchData.playerStats.forEach(playerStat => {
            if (playerStat.teamId === matchData.team1Id) {
              team1Stats.runsScored += playerStat.runsScored || 0;
              team1Stats.wicketsTaken += playerStat.wicketsTaken || 0;
            } else if (playerStat.teamId === matchData.team2Id) {
              team2Stats.runsScored += playerStat.runsScored || 0;
              team2Stats.wicketsTaken += playerStat.wicketsTaken || 0;
            }
          });
          
          console.log(`📊 STORAGE: Team1 (${matchData.team1Id}): +${team1Stats.runsScored} runs, +${team1Stats.wicketsTaken} wickets`);
          console.log(`📊 STORAGE: Team2 (${matchData.team2Id}): +${team2Stats.runsScored} runs, +${team2Stats.wicketsTaken} wickets`);

          // Update both teams atomically
          await Promise.all([
            this.teams.updateOne(
              { id: matchData.team1Id },
              {
                $inc: {
                  totalMatches: 1,
                  matchesWon: team1Stats.matchesWon,
                  matchesLost: team1Stats.matchesLost,
                  totalRunsScored: team1Stats.runsScored,
                  totalWicketsTaken: team1Stats.wicketsTaken
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
                  totalRunsScored: team2Stats.runsScored,
                  totalWicketsTaken: team2Stats.wicketsTaken
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
}