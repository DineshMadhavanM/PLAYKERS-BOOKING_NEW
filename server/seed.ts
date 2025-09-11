import { db } from "./db";
import { venues, products, matches, users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // Check if sample user exists, create if not
    let sampleUser = await db.select().from(users).where(eq(users.email, "admin@sporthub.com")).limit(1);
    
    if (sampleUser.length === 0) {
      const [newUser] = await db.insert(users).values({
        email: "admin@sporthub.com",
        firstName: "Sports",
        lastName: "Admin",
        location: "Mumbai, India",
        phoneNumber: "+91-9876543210"
      }).returning();
      sampleUser = [newUser];
      console.log("✅ Sample user created");
    } else {
      console.log("✅ Sample user already exists");
    }

    // Seed venues
    const venueData = [
      {
        name: "Elite Cricket Ground",
        description: "Premium cricket facility with international standard pitch and modern amenities",
        address: "Sector 21, Bandra Kurla Complex, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        latitude: "19.0760",
        longitude: "72.8777",
        sports: ["cricket"],
        pricePerHour: "1500.00",
        facilities: ["parking", "restrooms", "changing_rooms", "flood_lights", "cafeteria"],
        images: ["/images/cricket-ground-1.jpg", "/images/cricket-ground-2.jpg"],
        rating: "4.8",
        totalReviews: 124,
        ownerId: sampleUser[0].id
      },
      {
        name: "Champions Football Arena",
        description: "Professional football turf with FIFA approved artificial grass",
        address: "Plot 15, Andheri Sports Complex, Mumbai",
        city: "Mumbai", 
        state: "Maharashtra",
        latitude: "19.1136",
        longitude: "72.8697",
        sports: ["football"],
        pricePerHour: "1200.00",
        facilities: ["parking", "restrooms", "changing_rooms", "flood_lights", "scoreboard"],
        images: ["/images/football-field-1.jpg", "/images/football-field-2.jpg"],
        rating: "4.6",
        totalReviews: 89,
        ownerId: sampleUser[0].id
      },
      {
        name: "Ace Tennis Courts",
        description: "Multi-court tennis facility with clay and hard courts",
        address: "Tennis Club Road, Juhu, Mumbai",
        city: "Mumbai",
        state: "Maharashtra", 
        latitude: "19.1075",
        longitude: "72.8263",
        sports: ["tennis"],
        pricePerHour: "800.00",
        facilities: ["parking", "restrooms", "equipment_rental", "coaching"],
        images: ["/images/tennis-court-1.jpg", "/images/tennis-court-2.jpg"],
        rating: "4.5",
        totalReviews: 67,
        ownerId: sampleUser[0].id
      },
      {
        name: "Victory Volleyball Arena",
        description: "Indoor volleyball court with professional setup",
        address: "Sports Complex, Powai, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        latitude: "19.1197",
        longitude: "72.9056",
        sports: ["volleyball"],
        pricePerHour: "600.00",
        facilities: ["parking", "restrooms", "air_conditioning", "equipment_storage"],
        images: ["/images/volleyball-court-1.jpg"],
        rating: "4.3",
        totalReviews: 45,
        ownerId: sampleUser[0].id
      },
      {
        name: "Warrior Kabaddi Ground",
        description: "Traditional kabaddi arena with authentic mud court",
        address: "Village Sports Ground, Thane, Mumbai",
        city: "Thane",
        state: "Maharashtra",
        latitude: "19.2183",
        longitude: "72.9781",
        sports: ["kabaddi"],
        pricePerHour: "500.00",
        facilities: ["parking", "restrooms", "seating_area"],
        images: ["/images/kabaddi-ground-1.jpg"],
        rating: "4.4",
        totalReviews: 32,
        ownerId: sampleUser[0].id
      },
      {
        name: "Multi-Sport Complex Pune",
        description: "Large complex with facilities for multiple sports",
        address: "FC Road, Shivajinagar, Pune",
        city: "Pune",
        state: "Maharashtra",
        latitude: "18.5204",
        longitude: "73.8567",
        sports: ["cricket", "football", "tennis"],
        pricePerHour: "2000.00",
        facilities: ["parking", "restrooms", "changing_rooms", "flood_lights", "cafeteria", "equipment_rental"],
        images: ["/images/multi-sport-1.jpg", "/images/multi-sport-2.jpg"],
        rating: "4.7",
        totalReviews: 156,
        ownerId: sampleUser[0].id
      },
      {
        name: "Golden Football Turf",
        description: "Premium artificial turf with modern drainage system",
        address: "Koramangala, Bangalore",
        city: "Bangalore",
        state: "Karnataka",
        latitude: "12.9352",
        longitude: "77.6245",
        sports: ["football"],
        pricePerHour: "1100.00",
        facilities: ["parking", "restrooms", "flood_lights", "scoreboard"],
        images: ["/images/bangalore-football-1.jpg"],
        rating: "4.6",
        totalReviews: 78,
        ownerId: sampleUser[0].id
      }
    ];

    // Check if venues already exist
    const existingVenues = await db.select().from(venues).limit(1);
    if (existingVenues.length === 0) {
      await db.insert(venues).values(venueData);
      console.log("✅ Venues seeded successfully");
    } else {
      console.log("✅ Venues already exist");
    }

    // Seed products
    const productData = [
      {
        name: "Professional Cricket Bat",
        description: "High-quality English willow cricket bat perfect for serious players",
        category: "cricket",
        subcategory: "bats",
        price: "3499.00",
        discountPrice: "2999.00",
        images: ["/images/cricket-bat-1.jpg", "/images/cricket-bat-2.jpg"],
        brand: "SG",
        specifications: {
          weight: "1.2kg",
          material: "English Willow",
          size: "Short Handle"
        },
        inStock: true,
        stockQuantity: 25,
        rating: "4.5",
        totalReviews: 42
      },
      {
        name: "Leather Cricket Ball",
        description: "Professional grade leather cricket ball for matches",
        category: "cricket", 
        subcategory: "balls",
        price: "599.00",
        images: ["/images/cricket-ball-1.jpg"],
        brand: "Kookaburra",
        specifications: {
          weight: "156g",
          material: "Leather",
          type: "Test Match"
        },
        inStock: true,
        stockQuantity: 50,
        rating: "4.7",
        totalReviews: 28
      },
      {
        name: "Football Boots",
        description: "Professional football boots with excellent grip",
        category: "football",
        subcategory: "footwear", 
        price: "2199.00",
        discountPrice: "1899.00",
        images: ["/images/football-boots-1.jpg"],
        brand: "Nike",
        specifications: {
          material: "Synthetic Leather",
          sole: "Rubber Studs",
          sizes: "6-12"
        },
        inStock: true,
        stockQuantity: 30,
        rating: "4.6",
        totalReviews: 67
      },
      {
        name: "FIFA Standard Football",
        description: "Official size and weight football for matches",
        category: "football",
        subcategory: "balls",
        price: "899.00",
        images: ["/images/football-ball-1.jpg"],
        brand: "Adidas",
        specifications: {
          size: "Size 5",
          material: "PU Leather",
          certification: "FIFA Approved"
        },
        inStock: true,
        stockQuantity: 40,
        rating: "4.8",
        totalReviews: 89
      },
      {
        name: "Tennis Racket Pro",
        description: "Lightweight tennis racket for advanced players",
        category: "tennis",
        subcategory: "rackets",
        price: "4299.00",
        discountPrice: "3699.00", 
        images: ["/images/tennis-racket-1.jpg"],
        brand: "Wilson",
        specifications: {
          weight: "300g",
          head_size: "100 sq in",
          string_pattern: "16x19"
        },
        inStock: true,
        stockQuantity: 15,
        rating: "4.9",
        totalReviews: 34
      },
      {
        name: "Tennis Balls Set",
        description: "Premium tennis balls set of 3",
        category: "tennis",
        subcategory: "balls",
        price: "349.00",
        images: ["/images/tennis-balls-1.jpg"],
        brand: "Babolat",
        specifications: {
          quantity: "3 balls",
          type: "Championship",
          surface: "All Courts"
        },
        inStock: true,
        stockQuantity: 60,
        rating: "4.4",
        totalReviews: 56
      },
      {
        name: "Volleyball Official",
        description: "FIVB approved volleyball for competitions",
        category: "volleyball",
        subcategory: "balls",
        price: "1299.00",
        images: ["/images/volleyball-1.jpg"],
        brand: "Mikasa",
        specifications: {
          material: "Synthetic Leather",
          weight: "260-280g",
          certification: "FIVB Approved"
        },
        inStock: true,
        stockQuantity: 35,
        rating: "4.7",
        totalReviews: 23
      },
      {
        name: "Volleyball Knee Pads",
        description: "Protective knee pads for volleyball players",
        category: "volleyball",
        subcategory: "protective_gear",
        price: "799.00",
        discountPrice: "699.00",
        images: ["/images/volleyball-kneepads-1.jpg"],
        brand: "Asics",
        specifications: {
          material: "Neoprene",
          sizes: "S, M, L, XL",
          protection: "High Impact"
        },
        inStock: true,
        stockQuantity: 25,
        rating: "4.5",
        totalReviews: 19
      },
      {
        name: "Kabaddi Mat Professional",
        description: "Official kabaddi playing mat with proper dimensions",
        category: "kabaddi",
        subcategory: "equipment",
        price: "5999.00",
        images: ["/images/kabaddi-mat-1.jpg"],
        brand: "SportsMat",
        specifications: {
          dimensions: "13m x 10m",
          material: "High-density foam",
          thickness: "4cm"
        },
        inStock: true,
        stockQuantity: 8,
        rating: "4.6",
        totalReviews: 12
      },
      {
        name: "Sports Water Bottle",
        description: "BPA-free sports water bottle with measurement marks",
        category: "accessories",
        subcategory: "bottles",
        price: "299.00",
        discountPrice: "249.00",
        images: ["/images/water-bottle-1.jpg"],
        brand: "HydroSport",
        specifications: {
          capacity: "750ml",
          material: "BPA-free plastic",
          features: "Leak-proof, Easy grip"
        },
        inStock: true,
        stockQuantity: 100,
        rating: "4.3",
        totalReviews: 145
      }
    ];

    // Check if products already exist
    const existingProducts = await db.select().from(products).limit(1);
    if (existingProducts.length === 0) {
      await db.insert(products).values(productData);
      console.log("✅ Products seeded successfully");
    } else {
      console.log("✅ Products already exist");
    }

    // Seed sample matches
    const matchData = [
      {
        title: "Mumbai Cricket Championship - Final",
        sport: "cricket",
        matchType: "T20",
        isPublic: true,
        venueId: venueData[0].name, // Will need to get actual ID
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        maxPlayers: 22,
        description: "Championship final between Mumbai Warriors and Delhi Capitals",
        duration: 180,
        status: "upcoming",
        organizerId: sampleUser[0].id,
        team1Name: "Mumbai Warriors",
        team2Name: "Delhi Capitals"
      },
      {
        title: "Weekend Football League",
        sport: "football", 
        matchType: "90min",
        isPublic: true,
        venueId: venueData[1].name,
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        maxPlayers: 22,
        description: "Regular weekend football match - all skill levels welcome",
        duration: 90,
        status: "upcoming",
        organizerId: sampleUser[0].id,
        team1Name: "Blue Devils",
        team2Name: "Red Eagles"
      },
      {
        title: "Tennis Tournament - Quarter Finals",
        sport: "tennis",
        matchType: "best_of_3",
        isPublic: true,
        venueId: venueData[2].name,
        scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        maxPlayers: 4,
        description: "Quarterly tennis tournament - advanced players only",
        duration: 120,
        status: "upcoming",
        organizerId: sampleUser[0].id
      }
    ];

    // Get venue IDs for matches (this is a simplified approach)
    const insertedVenues = await db.select().from(venues);
    const updatedMatchData = matchData.map((match, index) => ({
      ...match,
      venueId: insertedVenues[index]?.id || insertedVenues[0].id
    }));

    await db.insert(matches).values(updatedMatchData);
    console.log("✅ Sample matches seeded successfully");

    console.log("🎉 Database seeding completed successfully!");
    console.log(`
📊 Seeded data summary:
- ${venueData.length} venues across multiple cities
- ${productData.length} sports products  
- ${matchData.length} upcoming matches
- 1 sample user for venue ownership
    `);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seed function
seedDatabase().catch(console.error);