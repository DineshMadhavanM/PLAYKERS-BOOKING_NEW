import bcrypt from "bcrypt";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Session management for email/password authentication
export function getSession() {
  // Require SESSION_SECRET environment variable for security
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required for secure session management');
  }
  
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Use express-session's built-in MemoryStore for simplicity
  // In production, consider using a production-grade store like connect-redis
  console.warn("⚠️  Using memory-based session store");
  console.warn("⚠️  Sessions will not persist between server restarts");
  
  const sessionStore = new session.MemoryStore();

  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Use secure cookies in production
      sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
      maxAge: sessionTtl,
    },
    name: 'sessionId', // Don't use default session name
  });
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Register user
export async function registerUser(email: string, password: string, firstName?: string, lastName?: string, dateOfBirth?: string, location?: string, phoneNumber?: string) {
  try {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      throw new Error("User already exists with this email");
    }

    // Check if this is the first user (for auto-admin)
    let isFirstUser = false;
    if (storage.getAllUsers) {
      try {
        const allUsers = await storage.getAllUsers();
        isFirstUser = allUsers.length === 0;
      } catch (error) {
        // If getAllUsers fails, assume this might be the first user
        isFirstUser = true;
      }
    } else {
      // If getAllUsers is not available, assume this might be the first user
      isFirstUser = true;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user (first user automatically becomes admin)
    const newUser = await storage.createUser({
      email,
      password: hashedPassword,
      firstName: firstName || null,
      lastName: lastName || null,
      dateOfBirth: dateOfBirth || null,
      location: location || null,
      phoneNumber: phoneNumber || null,
      isAdmin: isFirstUser,
    });

    if (isFirstUser) {
      console.log(`✅ First user registered as admin: ${email}`);
    }

    return newUser;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
}

// Login user
export async function loginUser(email: string, password: string) {
  try {
    // Get user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    // Remove password from user object before returning
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error("Error logging in user:", error);
    throw error;
  }
}

// Middleware to check if user is authenticated
export function requireAuth(req: any, res: any, next: any) {
  if (req.session && req.session.user) {
    return next();
  }
  
  return res.status(401).json({ error: "Not authenticated" });
}

// Initialize email/password authentication for Express app
export function initializeEmailAuth(app: Express) {
  app.use(getSession());
  
  console.log("✅ Email/password authentication initialized");
}