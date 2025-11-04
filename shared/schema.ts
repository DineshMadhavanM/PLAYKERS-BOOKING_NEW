import { z } from "zod";

// Zod schemas for validation

// User validation schemas
export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be at most 30 characters").regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens").nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  isAdmin: z.boolean().optional(),
});

// Profile update validation schema
export const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be at most 30 characters").regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  location: z.string().optional(),
  phoneNumber: z.string().optional(),
});

// Venue validation schemas
export const insertVenueSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  latitude: z.string().nullable().optional(), // Decimal as string
  longitude: z.string().nullable().optional(), // Decimal as string
  sports: z.array(z.string()),
  pricePerHour: z.string(), // Decimal as string
  facilities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  rating: z.string().optional(), // Decimal as string
  totalReviews: z.number().optional(),
  ownerId: z.string(),
});

// Match validation schemas
export const insertMatchSchema = z.object({
  title: z.string(),
  sport: z.string(),
  matchType: z.string(),
  isPublic: z.boolean().optional(),
  venueId: z.string(),
  organizerId: z.string(),
  scheduledAt: z.coerce.date(),
  duration: z.number().nullable().optional(),
  maxPlayers: z.number(),
  currentPlayers: z.number().optional(),
  status: z.string().optional(),
  team1Name: z.string().nullable().optional(),
  team2Name: z.string().nullable().optional(),
  team1Score: z.any().nullable().optional(), // JSON
  team2Score: z.any().nullable().optional(), // JSON
  matchData: z.any().nullable().optional(), // JSON
  description: z.string().nullable().optional(),
});

// Match participant validation schemas
export const insertMatchParticipantSchema = z.object({
  matchId: z.string(),
  userId: z.string(),
  team: z.string().nullable().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
});

// Booking validation schemas
export const insertBookingSchema = z.object({
  venueId: z.string(),
  userId: z.string(),
  matchId: z.string().nullable().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  totalAmount: z.string(), // Decimal as string
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
});

// Product validation schemas
export const insertProductSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  category: z.string(),
  subcategory: z.string().nullable().optional(),
  price: z.string(), // Decimal as string
  discountPrice: z.string().nullable().optional(), // Decimal as string
  images: z.array(z.string()).optional(),
  brand: z.string().nullable().optional(),
  specifications: z.any().nullable().optional(), // JSON
  inStock: z.boolean().optional(),
  stockQuantity: z.number().optional(),
  rating: z.string().optional(), // Decimal as string
  totalReviews: z.number().optional(),
});

// Review validation schemas
export const insertReviewSchema = z.object({
  userId: z.string(),
  venueId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  isVerified: z.boolean().optional(),
});

// Cart item validation schemas
export const insertCartItemSchema = z.object({
  userId: z.string(),
  productId: z.string(),
  quantity: z.number().optional(),
});

// User stats validation schemas (not used in forms but kept for completeness)
export const insertUserStatsSchema = z.object({
  userId: z.string(),
  sport: z.string(),
  matchesPlayed: z.number().optional(),
  matchesWon: z.number().optional(),
  totalScore: z.number().optional(),
  bestPerformance: z.any().nullable().optional(), // JSON
  stats: z.any().nullable().optional(), // JSON
});

// Team validation schemas
export const insertTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  sport: z.enum(["cricket", "football", "handball", "tennis", "kabaddi"]).default("cricket"),
  shortName: z.string().max(4, "Short name must be 4 characters or less").optional(),
  description: z.string().optional(),
  city: z.string().optional(),
  captainId: z.string().optional(),
  viceCaptainId: z.string().optional(),
  logo: z.string().optional(),
  homeVenueId: z.string().optional(),
});

// Player validation schemas
export const insertPlayerSchema = z.object({
  name: z.string().min(1, "Player name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be at most 30 characters").regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens").optional().or(z.literal("")),
  email: z.string().email().optional(),
  userId: z.string().optional(), // Link to registered user if available
  teamId: z.string().optional(),
  teamName: z.string().optional(),
  role: z.enum(["batsman", "bowler", "all-rounder", "wicket-keeper", "goalkeeper", "defender", "midfielder", "forward"]).optional(),
  battingStyle: z.enum(["right-handed", "left-handed"]).optional(),
  bowlingStyle: z.enum(["right-arm-fast", "left-arm-fast", "right-arm-medium", "left-arm-medium", "right-arm-spin", "left-arm-spin", "leg-spin", "off-spin"]).optional(),
  jerseyNumber: z.number().optional(),
  isGuest: z.boolean().optional(),
});

// Player performance validation schema
export const insertPlayerPerformanceSchema = z.object({
  playerId: z.string(),
  userId: z.string().optional(),
  matchId: z.string(),
  teamId: z.string().optional(),
  teamName: z.string().optional(),
  opposition: z.string(),
  venue: z.string().optional(),
  matchDate: z.coerce.date(),
  matchFormat: z.string().optional(),
  matchResult: z.string().optional(),
  
  battingStats: z.object({
    runs: z.number().min(0),
    balls: z.number().min(0),
    fours: z.number().min(0),
    sixes: z.number().min(0),
    strikeRate: z.number().min(0),
    position: z.number().min(1).max(11),
    isOut: z.boolean(),
    dismissalType: z.string().optional(),
    bowlerOut: z.string().optional(),
    fielderOut: z.string().optional(),
  }).optional(),
  
  bowlingStats: z.object({
    overs: z.number().min(0),
    maidens: z.number().min(0),
    runs: z.number().min(0),
    wickets: z.number().min(0),
    economy: z.number().min(0),
    wides: z.number().min(0),
    noBalls: z.number().min(0),
  }).optional(),
  
  fieldingStats: z.object({
    catches: z.number().min(0),
    runOuts: z.number().min(0),
    stumpings: z.number().min(0),
  }).optional(),
  
  awards: z.array(z.string()).optional(),
});

// Player conflict detection and merge schemas
export const playerConflictResponseSchema = z.object({
  conflict: z.literal(true),
  existingPlayer: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    userId: z.string().nullable(),
    teamId: z.string().nullable(),
    teamName: z.string().nullable(),
    role: z.string().nullable(),
    battingStyle: z.string().nullable(),
    bowlingStyle: z.string().nullable(),
    jerseyNumber: z.number().nullable(),
    createdAt: z.date().nullable(),
  }),
  message: z.string(),
});

export const playerMergeRequestSchema = z.object({
  targetPlayerId: z.string(),
  sourcePlayerId: z.string(),
  mergedData: z.object({
    name: z.string(),
    email: z.string().nullable().optional(),
    userId: z.string().nullable().optional(),
    teamId: z.string().nullable().optional(),
    teamName: z.string().nullable().optional(),
    role: z.enum(["batsman", "bowler", "all-rounder", "wicket-keeper"]).nullable().optional(),
    battingStyle: z.enum(["right-handed", "left-handed"]).nullable().optional(),
    bowlingStyle: z.enum(["right-arm-fast", "left-arm-fast", "right-arm-medium", "left-arm-medium", "right-arm-spin", "left-arm-spin", "leg-spin", "off-spin"]).nullable().optional(),
    jerseyNumber: z.number().nullable().optional(),
  }),
  mergeCareerStats: z.boolean().default(true),
});

export const playerMergeResponseSchema = z.object({
  success: z.boolean(),
  mergedPlayer: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    userId: z.string().nullable(),
    teamId: z.string().nullable(),
    teamName: z.string().nullable(),
    role: z.string().nullable(),
    battingStyle: z.string().nullable(),
    bowlingStyle: z.string().nullable(),
    jerseyNumber: z.number().nullable(),
  }),
  message: z.string(),
});

// Enhanced match schema for cricket scorecards
export const insertCricketMatchSchema = insertMatchSchema.extend({
  tossWinnerId: z.string().optional(),
  tossDecision: z.enum(["bat", "bowl"]).optional(),
  overs: z.number().optional(),
  matchFormat: z.enum(["T20", "ODI", "Test", "T10"]).optional(),
  umpire1: z.string().optional(),
  umpire2: z.string().optional(),
  thirdUmpire: z.string().optional(),
  referee: z.string().optional(),
  weather: z.string().optional(),
  pitchCondition: z.string().optional(),
  team1Players: z.array(z.string()).optional(), // Player IDs
  team2Players: z.array(z.string()).optional(), // Player IDs
  scorecard: z.object({
    team1Innings: z.array(z.object({
      inningsNumber: z.number(),
      battingTeamId: z.string(),
      totalRuns: z.number(),
      totalWickets: z.number(),
      totalOvers: z.number(),
      runRate: z.number(),
      extras: z.object({
        wides: z.number(),
        noBalls: z.number(),
        byes: z.number(),
        legByes: z.number(),
        penalties: z.number(),
      }),
      batsmen: z.array(z.object({
        playerId: z.string(),
        runsScored: z.number(),
        ballsFaced: z.number(),
        fours: z.number(),
        sixes: z.number(),
        strikeRate: z.number(),
        dismissalType: z.enum(["not-out", "bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket", "retired", "timed-out"]).optional(),
        bowlerOut: z.string().optional(), // Bowler who got the wicket
        fielderOut: z.string().optional(), // Fielder who took catch/run out
      })),
      bowlers: z.array(z.object({
        playerId: z.string(),
        overs: z.number(),
        maidens: z.number(),
        runsGiven: z.number(),
        wickets: z.number(),
        economy: z.number(),
        wides: z.number(),
        noBalls: z.number(),
      })),
      ballByBall: z.array(z.object({
        overNumber: z.number(),
        ballNumber: z.number(),
        bowlerId: z.string(),
        batsmanId: z.string(),
        runs: z.number(),
        extras: z.number(),
        extraType: z.enum(["wide", "no-ball", "bye", "leg-bye", "penalty"]).optional(),
        wicket: z.boolean(),
        wicketType: z.enum(["bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket"]).optional(),
        fielderOut: z.string().optional(),
      })).optional(),
    })),
    team2Innings: z.array(z.object({
      inningsNumber: z.number(),
      battingTeamId: z.string(),
      totalRuns: z.number(),
      totalWickets: z.number(),
      totalOvers: z.number(),
      runRate: z.number(),
      extras: z.object({
        wides: z.number(),
        noBalls: z.number(),
        byes: z.number(),
        legByes: z.number(),
        penalties: z.number(),
      }),
      batsmen: z.array(z.object({
        playerId: z.string(),
        runsScored: z.number(),
        ballsFaced: z.number(),
        fours: z.number(),
        sixes: z.number(),
        strikeRate: z.number(),
        dismissalType: z.enum(["not-out", "bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket", "retired", "timed-out"]).optional(),
        bowlerOut: z.string().optional(),
        fielderOut: z.string().optional(),
      })),
      bowlers: z.array(z.object({
        playerId: z.string(),
        overs: z.number(),
        maidens: z.number(),
        runsGiven: z.number(),
        wickets: z.number(),
        economy: z.number(),
        wides: z.number(),
        noBalls: z.number(),
      })),
      ballByBall: z.array(z.object({
        overNumber: z.number(),
        ballNumber: z.number(),
        bowlerId: z.string(),
        batsmanId: z.string(),
        runs: z.number(),
        extras: z.number(),
        extraType: z.enum(["wide", "no-ball", "bye", "leg-bye", "penalty"]).optional(),
        wicket: z.boolean(),
        wicketType: z.enum(["bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket"]).optional(),
        fielderOut: z.string().optional(),
      })).optional(),
    })),
  }).optional(),
  awards: z.object({
    manOfTheMatch: z.string().optional(), // Player ID
    bestBatsman: z.string().optional(),
    bestBowler: z.string().optional(),
    bestFielder: z.string().optional(),
  }).optional(),
  resultSummary: z.object({
    winnerId: z.string().optional(), // Team ID
    resultType: z.enum(["won-by-runs", "won-by-wickets", "tied", "no-result", "abandoned"]).optional(),
    marginRuns: z.number().optional(),
    marginWickets: z.number().optional(),
    marginBalls: z.number().optional(),
  }).optional(),
});

// Match roster player validation schemas
export const insertMatchRosterPlayerSchema = z.object({
  matchId: z.string(),
  team: z.enum(["team1", "team2"]),
  playerName: z.string().min(1, "Player name is required"),
  playerEmail: z.string().email().optional().or(z.literal("")),
  role: z.enum(["captain", "vice-captain", "wicket-keeper", "player"]).optional(),
  position: z.number().min(1).max(15),
  isRegisteredUser: z.boolean().optional(),
  userId: z.string().optional(),
});

// Scorecard update validation schema (extracted from insertCricketMatchSchema)
export const scorecardUpdateSchema = z.object({
  team1Innings: z.array(z.object({
    inningsNumber: z.number(),
    battingTeamId: z.string(),
    totalRuns: z.number(),
    totalWickets: z.number(),
    totalOvers: z.number(),
    runRate: z.number(),
    extras: z.object({
      wides: z.number(),
      noBalls: z.number(),
      byes: z.number(),
      legByes: z.number(),
      penalties: z.number(),
    }),
    batsmen: z.array(z.object({
      playerId: z.string(),
      runsScored: z.number(),
      ballsFaced: z.number(),
      fours: z.number(),
      sixes: z.number(),
      strikeRate: z.number(),
      dismissalType: z.enum(["not-out", "bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket", "retired", "timed-out"]).optional(),
      bowlerOut: z.string().optional(), // Bowler who got the wicket
      fielderOut: z.string().optional(), // Fielder who took catch/run out
    })),
    bowlers: z.array(z.object({
      playerId: z.string(),
      overs: z.number(),
      maidens: z.number(),
      runsGiven: z.number(),
      wickets: z.number(),
      economy: z.number(),
      wides: z.number(),
      noBalls: z.number(),
    })),
    ballByBall: z.array(z.object({
      overNumber: z.number(),
      ballNumber: z.number(),
      bowlerId: z.string(),
      batsmanId: z.string(),
      runs: z.number(),
      extras: z.number(),
      extraType: z.enum(["wide", "no-ball", "bye", "leg-bye", "penalty"]).optional(),
      wicket: z.boolean(),
      wicketType: z.enum(["bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket"]).optional(),
      fielderOut: z.string().optional(),
    })).optional(),
  })),
  team2Innings: z.array(z.object({
    inningsNumber: z.number(),
    battingTeamId: z.string(),
    totalRuns: z.number(),
    totalWickets: z.number(),
    totalOvers: z.number(),
    runRate: z.number(),
    extras: z.object({
      wides: z.number(),
      noBalls: z.number(),
      byes: z.number(),
      legByes: z.number(),
      penalties: z.number(),
    }),
    batsmen: z.array(z.object({
      playerId: z.string(),
      runsScored: z.number(),
      ballsFaced: z.number(),
      fours: z.number(),
      sixes: z.number(),
      strikeRate: z.number(),
      dismissalType: z.enum(["not-out", "bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket", "retired", "timed-out"]).optional(),
      bowlerOut: z.string().optional(),
      fielderOut: z.string().optional(),
    })),
    bowlers: z.array(z.object({
      playerId: z.string(),
      overs: z.number(),
      maidens: z.number(),
      runsGiven: z.number(),
      wickets: z.number(),
      economy: z.number(),
      wides: z.number(),
      noBalls: z.number(),
    })),
    ballByBall: z.array(z.object({
      overNumber: z.number(),
      ballNumber: z.number(),
      bowlerId: z.string(),
      batsmanId: z.string(),
      runs: z.number(),
      extras: z.number(),
      extraType: z.enum(["wide", "no-ball", "bye", "leg-bye", "penalty"]).optional(),
      wicket: z.boolean(),
      wicketType: z.enum(["bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket"]).optional(),
      fielderOut: z.string().optional(),
    })).optional(),
  })),
});

// Player stats update validation schema for match performance
export const playerStatsUpdateSchema = z.object({
  // Batting performance
  runsScored: z.number().min(0).optional(),
  ballsFaced: z.number().min(0).optional(),
  fours: z.number().min(0).optional(),
  sixes: z.number().min(0).optional(),
  strikeRate: z.number().min(0).optional(),
  dismissalType: z.enum(["not-out", "bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket", "retired", "timed-out"]).optional(),
  
  // Bowling performance
  overs: z.number().min(0).optional(),
  maidens: z.number().min(0).optional(),
  runsGiven: z.number().min(0).optional(),
  wickets: z.number().min(0).optional(),
  economy: z.number().min(0).optional(),
  wides: z.number().min(0).optional(),
  noBalls: z.number().min(0).optional(),
  
  // Fielding performance
  catches: z.number().min(0).optional(),
  runOuts: z.number().min(0).optional(),
  stumpings: z.number().min(0).optional(),
  
  // Match result
  isWinner: z.boolean().optional(),
  manOfTheMatch: z.boolean().optional(),
  bestBatsman: z.boolean().optional(),
  bestBowler: z.boolean().optional(),
  bestFielder: z.boolean().optional(),
});

// Team stats update validation schema for match performance
export const teamStatsUpdateSchema = z.object({
  // Match result
  matchResult: z.enum(["won", "lost", "drawn", "no-result", "abandoned"]),
  
  // Team performance
  totalRuns: z.number().min(0),
  totalWickets: z.number().min(0),
  totalOvers: z.number().min(0),
  runRate: z.number().min(0).optional(),
  
  // Opposition team performance (for calculating net run rate)
  oppositionRuns: z.number().min(0).optional(),
  oppositionWickets: z.number().min(0).optional(),
  oppositionOvers: z.number().min(0).optional(),
  
  // Match details
  tournamentPoints: z.number().min(0).optional(),
  netRunRateChange: z.number().optional(),
});

// Match completion validation schemas
export const matchCompletionSchema = z.object({
  matchId: z.string(),
  finalScorecard: scorecardUpdateSchema,
  awards: z.object({
    manOfTheMatch: z.string().optional(), // Player ID
    bestBatsman: z.string().optional(),
    bestBowler: z.string().optional(),
    bestFielder: z.string().optional(),
  }).optional(),
  resultSummary: z.object({
    winnerId: z.string().optional(), // Team ID
    resultType: z.enum(["won-by-runs", "won-by-wickets", "tied", "no-result", "abandoned"]),
    marginRuns: z.number().optional(),
    marginWickets: z.number().optional(),
    marginBalls: z.number().optional(),
  }).refine((data) => {
    // Enforce winnerId for decisive results
    if (["won-by-runs", "won-by-wickets"].includes(data.resultType) && !data.winnerId) {
      return false;
    }
    // Enforce appropriate margins based on result type
    if (data.resultType === "won-by-runs" && typeof data.marginRuns !== "number") {
      return false;
    }
    if (data.resultType === "won-by-wickets" && typeof data.marginWickets !== "number") {
      return false;
    }
    // Forbid margins for ties and no-results
    if (["tied", "no-result", "abandoned"].includes(data.resultType)) {
      if (data.marginRuns || data.marginWickets || data.marginBalls) {
        return false;
      }
    }
    return true;
  }, {
    message: "Invalid result summary: winnerId and appropriate margins are required for decisive results, and margins are not allowed for ties/no-results"
  }),
  processed: z.boolean().optional(), // For idempotency
});

// Player match performance validation schema
export const playerMatchPerformanceSchema = z.object({
  matchId: z.string(),
  playerId: z.string(),
  teamId: z.string(),
  opposition: z.string(), // Opposing team name
  venue: z.string(),
  date: z.coerce.date(),
  matchFormat: z.enum(["T20", "ODI", "Test", "T10"]),
  matchResult: z.enum(["won", "lost", "drawn", "no-result", "abandoned"]),
  
  // Batting performance
  battingStats: z.object({
    runs: z.number().min(0),
    balls: z.number().min(0),
    fours: z.number().min(0),
    sixes: z.number().min(0),
    strikeRate: z.number().min(0),
    isOut: z.boolean(),
    dismissalType: z.enum(["not-out", "bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket", "retired", "timed-out"]).optional(),
    position: z.number().min(1).max(11), // Batting position
  }).refine((data) => {
    // If player is out, dismissalType must be provided and not "not-out"
    if (data.isOut) {
      return data.dismissalType && data.dismissalType !== "not-out";
    }
    // If player is not out, dismissalType should be "not-out" or undefined
    if (!data.isOut) {
      return !data.dismissalType || data.dismissalType === "not-out";
    }
    return true;
  }, {
    message: "Invalid batting stats: dismissalType must match isOut status - require valid dismissal when isOut=true, allow only 'not-out' when isOut=false"
  }).optional(),
  
  // Bowling performance
  bowlingStats: z.object({
    overs: z.number().min(0),
    maidens: z.number().min(0),
    runs: z.number().min(0),
    wickets: z.number().min(0),
    economy: z.number().min(0),
    wides: z.number().min(0),
    noBalls: z.number().min(0),
  }).optional(),
  
  // Fielding performance
  fieldingStats: z.object({
    catches: z.number().min(0),
    runOuts: z.number().min(0),
    stumpings: z.number().min(0),
  }).optional(),
  
  // Awards received
  awards: z.array(z.enum(["man-of-match", "best-batsman", "best-bowler", "best-fielder"])).optional(),
});

// Team match summary validation schema
export const teamMatchSummarySchema = z.object({
  matchId: z.string(),
  teamId: z.string(),
  opposition: z.string(), // Opposing team name
  venue: z.string(),
  date: z.coerce.date(),
  matchFormat: z.enum(["T20", "ODI", "Test", "T10"]),
  result: z.enum(["won", "lost", "drawn", "no-result", "abandoned"]),
  
  // Team performance
  teamPerformance: z.object({
    totalRuns: z.number().min(0),
    totalWickets: z.number().min(0),
    totalOvers: z.number().min(0),
    runRate: z.number().min(0),
    extras: z.number().min(0),
  }),
  
  // Opposition performance (for net run rate calculation)
  oppositionPerformance: z.object({
    totalRuns: z.number().min(0),
    totalWickets: z.number().min(0),
    totalOvers: z.number().min(0),
    runRate: z.number().min(0),
  }),
  
  // Result details
  resultDetails: z.object({
    marginRuns: z.number().optional(),
    marginWickets: z.number().optional(),
    marginBalls: z.number().optional(),
  }).optional(),
  
  // Tournament points earned
  tournamentPoints: z.number().min(0).optional(),
  
  // Top performers from the team
  topPerformers: z.object({
    topBatsman: z.object({
      playerId: z.string(),
      runs: z.number(),
    }).optional(),
    topBowler: z.object({
      playerId: z.string(),
      wickets: z.number(),
      runs: z.number(),
    }).optional(),
  }).optional(),
});

// Player career statistics update schema (for aggregating match performances)
export const playerCareerUpdateSchema = z.object({
  playerId: z.string(),
  matchPerformance: playerMatchPerformanceSchema,
  
  // Career totals to increment
  careerIncrements: z.object({
    totalMatches: z.number().min(0),
    matchesWon: z.number().min(0),
    totalRuns: z.number().min(0),
    totalBallsFaced: z.number().min(0),
    totalFours: z.number().min(0),
    totalSixes: z.number().min(0),
    totalOvers: z.number().min(0),
    totalRunsGiven: z.number().min(0),
    totalWickets: z.number().min(0),
    totalMaidens: z.number().min(0),
    catches: z.number().min(0),
    runOuts: z.number().min(0),
    stumpings: z.number().min(0),
    manOfTheMatchAwards: z.number().min(0),
    bestBatsmanAwards: z.number().min(0),
    bestBowlerAwards: z.number().min(0),
    bestFielderAwards: z.number().min(0),
  }),
  
  // New career bests (if achieved)
  careerBests: z.object({
    highestScore: z.number().optional(),
    bestBowlingFigures: z.string().optional(), // e.g., "4/25"
  }).optional(),
});

// TypeScript types for MongoDB documents
export type User = {
  id: string;
  email: string;
  password: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  dateOfBirth: Date | null;
  location: string | null;
  phoneNumber: string | null;
  isAdmin: boolean | null;
  // Cricket statistics for linked players
  cricketStats?: {
    totalMatches: number;
    matchesWon: number;
    totalRuns: number;
    totalBallsFaced: number;
    totalFours: number;
    totalSixes: number;
    centuries: number;
    halfCenturies: number;
    highestScore: number;
    totalOvers: number;
    totalRunsGiven: number;
    totalWickets: number;
    totalMaidens: number;
    fiveWicketHauls: number;
    catches: number;
    runOuts: number;
    stumpings: number;
    manOfTheMatchAwards: number;
    bestBatsmanAwards: number;
    bestBowlerAwards: number;
    bestFielderAwards: number;
    battingAverage: number;
    strikeRate: number;
    bowlingAverage: number;
    economyRate: number;
    processedMatches: string[]; // Track match IDs to ensure idempotency
  } | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Venue = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  latitude: string | null; // Decimal
  longitude: string | null; // Decimal
  sports: string[];
  pricePerHour: string; // Decimal
  facilities: string[];
  images: string[];
  rating: string | null; // Decimal
  totalReviews: number | null;
  ownerId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Match = {
  id: string;
  title: string;
  sport: string;
  matchType: string;
  isPublic: boolean | null;
  venueId: string;
  organizerId: string;
  scheduledAt: Date;
  duration: number | null;
  maxPlayers: number;
  currentPlayers: number | null;
  status: string | null;
  team1Name: string | null;
  team2Name: string | null;
  team1Score: any; // JSON
  team2Score: any; // JSON
  matchData: any; // JSON
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type MatchParticipant = {
  id: string;
  matchId: string;
  userId: string;
  team: string | null;
  role: string | null;
  status: string | null;
  joinedAt: Date | null;
};

export type Booking = {
  id: string;
  venueId: string;
  userId: string;
  matchId: string | null;
  startTime: Date;
  endTime: Date;
  totalAmount: string; // Decimal
  status: string | null;
  paymentStatus: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  price: string; // Decimal
  discountPrice: string | null; // Decimal
  images: string[];
  brand: string | null;
  specifications: any; // JSON
  inStock: boolean | null;
  stockQuantity: number | null;
  rating: string | null; // Decimal
  totalReviews: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Review = {
  id: string;
  userId: string;
  venueId: string | null;
  productId: string | null;
  rating: number;
  comment: string | null;
  images: string[];
  isVerified: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CartItem = {
  id: string;
  userId: string;
  productId: string;
  quantity: number | null;
  createdAt: Date | null;
};

export type UserStats = {
  id: string;
  userId: string;
  sport: string;
  matchesPlayed: number | null;
  matchesWon: number | null;
  totalScore: number | null;
  bestPerformance: any; // JSON
  stats: any; // JSON
  updatedAt: Date | null;
};

// Team type for MongoDB documents
export type Team = {
  id: string;
  name: string;
  sport: "cricket" | "football" | "handball" | "tennis" | "kabaddi";
  shortName: string | null;
  description: string | null;
  city: string | null;
  captainId: string | null;
  viceCaptainId: string | null;
  logo: string | null;
  homeVenueId: string | null;
  // Team Statistics
  totalMatches: number | null;
  matchesWon: number | null;
  matchesLost: number | null;
  matchesDrawn: number | null;
  totalRunsScored: number | null;
  totalRunsConceded: number | null;
  totalWicketsTaken: number | null;
  totalWicketsLost: number | null;
  tournamentPoints: number | null;
  netRunRate: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

// Player type for MongoDB documents
export type Player = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  userId: string | null; // Link to registered user if available
  teamId: string | null;
  teamName: string | null;
  role: string | null; // batsman, bowler, all-rounder, wicket-keeper
  battingStyle: string | null; // right-handed, left-handed
  bowlingStyle: string | null; // right-arm-fast, left-arm-fast, etc.
  jerseyNumber: number | null;
  isGuest: boolean | null; // Guest players for temporary participation
  
  // Merge metadata (optional for backward compatibility)
  mergedFromPlayerIds?: string[]; // IDs of players that were merged into this one
  mergeHistory?: {
    timestamp: Date;
    sourcePlayerId: string;
    mergedBy: string | null; // User who performed the merge
    mergedFields: string[]; // Fields that were merged
  }[];
  
  // Career Statistics
  careerStats: {
    // Batting Stats
    totalRuns: number;
    totalBallsFaced: number;
    totalFours: number;
    totalSixes: number;
    highestScore: number;
    centuries: number;
    halfCenturies: number;
    innings: number; // Total batting innings
    dismissals: number; // Times dismissed (for batting average)
    battingAverage: number;
    strikeRate: number;
    
    // Bowling Stats
    totalOvers: number;
    totalRunsGiven: number;
    totalWickets: number;
    totalMaidens: number;
    bestBowlingFigures: string | null; // e.g., "4/25"
    fiveWicketHauls: number;
    bowlingAverage: number;
    economy: number;
    
    // Fielding Stats
    catches: number;
    runOuts: number;
    stumpings: number;
    
    // Match Records
    totalMatches: number;
    matchesWon: number;
    
    // Awards
    manOfTheMatchAwards: number;
    bestBatsmanAwards: number;
    bestBowlerAwards: number;
    bestFielderAwards: number;
  };
  
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type MatchRosterPlayer = {
  id: string;
  matchId: string;
  team: string;
  playerName: string;
  playerEmail: string | null;
  role: string | null;
  position: number;
  isRegisteredUser: boolean | null;
  userId: string | null;
  createdAt: Date | null;
};

// Player Performance type for storing individual match performances
export type PlayerPerformance = {
  id: string;
  playerId: string;
  userId: string | null; // Linked user if available
  matchId: string;
  teamId: string | null;
  teamName: string | null;
  opposition: string;
  venue: string | null;
  matchDate: Date;
  matchFormat: string | null; // T20, ODI, Test, T10
  matchResult: string | null; // won, lost, drawn, no-result, abandoned
  
  // Batting performance
  battingStats: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    position: number; // Batting order position
    isOut: boolean;
    dismissalType: string | null;
    bowlerOut: string | null; // Name of bowler who got wicket
    fielderOut: string | null; // Name of fielder involved
  } | null;
  
  // Bowling performance
  bowlingStats: {
    overs: number;
    maidens: number;
    runs: number;
    wickets: number;
    economy: number;
    wides: number;
    noBalls: number;
  } | null;
  
  // Fielding performance
  fieldingStats: {
    catches: number;
    runOuts: number;
    stumpings: number;
  } | null;
  
  // Awards received
  awards: string[]; // man-of-match, best-batsman, best-bowler, best-fielder
  
  createdAt: Date | null;
  updatedAt: Date | null;
};

// Properly typed exports using inferred types from Zod schemas
export type ScorecardUpdate = z.infer<typeof scorecardUpdateSchema>;
export type MatchCompletionInput = z.infer<typeof matchCompletionSchema>;
export type PlayerMatchPerformanceInput = z.infer<typeof playerMatchPerformanceSchema>;
export type TeamMatchSummaryInput = z.infer<typeof teamMatchSummarySchema>;
export type PlayerCareerUpdateInput = z.infer<typeof playerCareerUpdateSchema>;

// Insert types (inferred from Zod schemas)
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = Omit<User, 'createdAt' | 'updatedAt' | 'password'> & { password?: string }; // Storage handles timestamps, password optional for OAuth users
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type InsertCricketMatch = z.infer<typeof insertCricketMatchSchema>;
export type InsertMatchParticipant = z.infer<typeof insertMatchParticipantSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type InsertMatchRosterPlayer = z.infer<typeof insertMatchRosterPlayerSchema>;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type InsertPlayerPerformance = z.infer<typeof insertPlayerPerformanceSchema>;

// Player merge types
export type PlayerConflictResponse = z.infer<typeof playerConflictResponseSchema>;
export type PlayerMergeRequest = z.infer<typeof playerMergeRequestSchema>;
export type PlayerMergeResponse = z.infer<typeof playerMergeResponseSchema>;

// Invitation validation schemas
export const insertInvitationSchema = z.object({
  email: z.string().email("Valid email is required"),
  inviterName: z.string().min(1, "Inviter name is required").optional(),
  inviterId: z.string().optional(),
  invitationType: z.enum(["match", "team"]),
  matchId: z.string().optional(),
  teamId: z.string().optional(),
  matchTitle: z.string().optional(),
  teamName: z.string().optional(),
  message: z.string().optional(),
}).refine((data) => {
  if (data.invitationType === "match" && !data.matchId) {
    return false;
  }
  if (data.invitationType === "team" && !data.teamId) {
    return false;
  }
  return true;
}, {
  message: "Match ID required for match invitations, Team ID required for team invitations"
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  guestPlayerData: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
  }).optional(),
});

// Invitation type
export type Invitation = {
  id: string;
  token: string;
  email: string;
  inviterName: string;
  inviterId: string;
  invitationType: "match" | "team";
  matchId: string | null;
  teamId: string | null;
  matchTitle: string | null;
  teamName: string | null;
  message: string | null;
  status: "pending" | "accepted" | "expired" | "revoked";
  acceptedAt: Date | null;
  acceptedByUserId: string | null;
  acceptedByPlayerId: string | null;
  expiresAt: Date;
  createdAt: Date;
};

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type AcceptInvitation = z.infer<typeof acceptInvitationSchema>;

// Notification/Match Request validation schemas
export const insertNotificationSchema = z.object({
  recipientPlayerId: z.string().min(1, "Recipient player ID is required"),
  recipientEmail: z.string().email().optional(),
  senderName: z.string().min(1, "Sender name is required"),
  senderEmail: z.string().email("Valid email is required"),
  senderPhone: z.string().min(1, "Phone number is required"),
  matchType: z.string().min(1, "Match type is required"),
  location: z.string().min(1, "Location is required"),
  message: z.string().optional(),
});

// Notification type
export type Notification = {
  id: string;
  recipientUserId: string | null; // User ID if player is linked to a user
  recipientPlayerId: string; // Player ID
  recipientEmail: string | null;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  matchType: string;
  location: string;
  message: string | null;
  status: "unread" | "read" | "accepted" | "declined";
  createdAt: Date;
  readAt: Date | null;
};

export type InsertNotification = z.infer<typeof insertNotificationSchema>;