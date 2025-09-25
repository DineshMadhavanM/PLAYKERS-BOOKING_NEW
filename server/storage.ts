import type {
  User,
  UpsertUser,
  Venue,
  InsertVenue,
  Match,
  InsertMatch,
  InsertCricketMatch,
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
  Team,
  InsertTeam,
  Player,
  InsertPlayer,
} from "@shared/schema";

export interface IStorage {
  // User operations (mandatory for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: { email: string; password: string; username?: string | null; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null; dateOfBirth?: string | null; location?: string | null; phoneNumber?: string | null; isAdmin?: boolean }): Promise<User>;
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

  // Team operations
  getTeams(filters?: { search?: string }): Promise<Team[]>;
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, team: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<boolean>;
  updateTeamStats(id: string, stats: { 
    matchesWon?: number; 
    matchesLost?: number; 
    matchesDrawn?: number; 
    runsScored?: number; 
    wicketsTaken?: number; 
    tournamentPoints?: number;
  }): Promise<Team | undefined>;

  // Player operations
  getPlayers(filters?: { teamId?: string; role?: string; search?: string }): Promise<Player[]>;
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayerByUserId(userId: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: string, player: Partial<InsertPlayer>): Promise<Player | undefined>;
  deletePlayer(id: string): Promise<boolean>;
  updatePlayerStats(playerId: string, matchStats: {
    // Batting stats
    runsScored?: number;
    ballsFaced?: number;
    fours?: number;
    sixes?: number;
    isOut?: boolean;
    // Bowling stats
    oversBowled?: number;
    runsGiven?: number;
    wicketsTaken?: number;
    maidens?: number;
    // Fielding stats
    catches?: number;
    runOuts?: number;
    stumpings?: number;
    // Awards
    manOfMatch?: boolean;
    bestBatsman?: boolean;
    bestBowler?: boolean;
    bestFielder?: boolean;
    // Match result
    matchWon?: boolean;
  }): Promise<Player | undefined>;

  // Cricket match operations (enhanced)
  createCricketMatch(match: InsertCricketMatch): Promise<Match>;
  updateMatchScorecard(matchId: string, scorecard: any): Promise<Match | undefined>;
  getPlayerMatchHistory(playerId: string): Promise<Match[]>;
  getTeamMatchHistory(teamId: string): Promise<Match[]>;
  
  // Player career stats bulk update
  updatePlayerCareerStats(matchId: string, playerStats: Array<{
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
  }>): Promise<{ success: boolean; playersUpdated?: number; errors?: string[]; cacheInvalidation?: { players: string[] } }>;

  // Player merge operations
  getPlayerByEmail(email: string, excludePlayerId?: string): Promise<Player | undefined>;
  mergePlayer(targetPlayerId: string, sourcePlayerId: string, mergedData: Partial<InsertPlayer>, mergeCareerStats?: boolean): Promise<{
    success: boolean;
    mergedPlayer?: Player;
    errors?: string[];
  }>;
  updatePlayerReferences(oldPlayerId: string, newPlayerId: string): Promise<{
    success: boolean;
    collectionsUpdated: string[];
    errors?: string[];
  }>;

  // Match completion operations
  applyMatchResults(matchData: {
    matchId: string;
    status: string;
    team1Id?: string;
    team2Id?: string;
    winnerTeamId?: string;
    scorecard?: any;
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
  }): Promise<{ success: boolean; updatedMatch?: Match; errors?: string[] }>;
}

// MongoDB Storage Implementation
import { MongoStorage } from './mongoStorage';

async function initializeStorage(): Promise<IStorage> {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required. Please configure your MongoDB connection string.');
  }

  console.log('🔍 MongoDB URI found, initializing MongoDB storage...');
  try {
    const mongoStorage = new MongoStorage(process.env.MONGODB_URI);
    await mongoStorage.connect();
    return mongoStorage;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw new Error(`Failed to initialize MongoDB storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    console.log('✅ MongoDB storage initialized successfully');
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