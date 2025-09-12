import { MongoClient, Db, Collection } from 'mongodb';

let client: MongoClient;
let db: Db;

function getMongoUri(): string {
  const raw = (process.env.MONGODB_URI || "").trim().replace(/^['"]|['"]$/g, "");
  
  if (!raw) {
    throw new Error('MONGODB_URI environment variable is required');
  }
  
  if (!/^mongodb(\+srv)?:\/\//.test(raw)) {
    throw new Error(`Invalid MongoDB URI format. Expected format: mongodb+srv://username:password@cluster.domain.net/. Received: ${raw.slice(0, 12)}...`);
  }
  
  console.log(`🔗 MongoDB URI validated: ${raw.slice(0, 14)}...`);
  return raw;
}

async function connectToDatabase() {
  try {
    if (db) {
      return db; // Return existing connection
    }

    const uri = getMongoUri();
    console.log('🔗 Connecting to MongoDB...');
    
    // Configure MongoDB client options for Replit compatibility
    const options = {
      serverApi: { version: '1' as const },
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority' as const
    };
    
    client = new MongoClient(uri, options);
    await client.connect();
    db = client.db('playkers'); // Database name
    console.log('✅ Successfully connected to MongoDB');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export { client, db, connectToDatabase, getMongoUri };

// Collection interfaces for type safety
export interface UserDocument {
  _id?: string;
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  dateOfBirth?: string;
  location?: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VenueDocument {
  _id?: string;
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  latitude?: string;
  longitude?: string;
  sports: string[];
  pricePerHour: string;
  facilities?: string[];
  images?: string[];
  rating: string;
  totalReviews: number;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchDocument {
  _id?: string;
  id: string;
  title: string;
  sport: string;
  matchType: string;
  isPublic: boolean;
  venueId: string;
  organizerId: string;
  scheduledAt: Date;
  duration?: number;
  maxPlayers: number;
  currentPlayers: number;
  status: string;
  team1Name?: string;
  team2Name?: string;
  team1Score?: any;
  team2Score?: any;
  matchData?: any;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDocument {
  _id?: string;
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  price: string;
  discountPrice?: string;
  images?: string[];
  brand?: string;
  specifications?: any;
  inStock: boolean;
  stockQuantity: number;
  rating: string;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingDocument {
  _id?: string;
  id: string;
  venueId: string;
  userId: string;
  matchId?: string;
  startTime: Date;
  endTime: Date;
  totalAmount: string;
  status: string;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewDocument {
  _id?: string;
  id: string;
  userId: string;
  venueId?: string;
  productId?: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemDocument {
  _id?: string;
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStatsDocument {
  _id?: string;
  id: string;
  userId: string;
  sport: string;
  matchesPlayed: number;
  matchesWon: number;
  totalScore: number;
  bestPerformance?: any;
  stats?: any;
  updatedAt: Date;
}

export interface MatchParticipantDocument {
  _id?: string;
  id: string;
  matchId: string;
  userId: string;
  team?: string;
  role: string;
  status: string;
  joinedAt: Date;
}