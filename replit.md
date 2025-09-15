# Overview

Playkers is a comprehensive sports management platform that allows users to book venues, create and join matches, track performance statistics, and purchase sports equipment. The application supports multiple sports including cricket, football, volleyball, tennis, and kabaddi, providing sport-specific scoring systems and match management capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with protected routes for authenticated users
- **UI Components**: Shadcn/ui component library built on Radix UI primitives with Tailwind CSS styling
- **State Management**: TanStack Query (React Query) for server state management and API data fetching
- **Forms**: React Hook Form with Zod for validation and type-safe form handling
- **Authentication Flow**: Conditional rendering based on authentication state with automatic redirects

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured route handlers
- **Development Server**: Custom Vite integration for hot module replacement in development
- **Error Handling**: Centralized error middleware with structured error responses
- **Logging**: Custom request/response logging with timing and JSON response capture

## Data Storage
- **Database**: MongoDB with native MongoDB driver
- **Storage Layer**: Custom MongoDB storage implementation with type-safe operations
- **Schema Management**: Shared Zod validation schemas between client and server
- **Session Storage**: In-memory session store for authentication persistence

## Authentication & Authorization
- **Provider**: Replit Auth with OpenID Connect (OIDC) integration
- **Session Management**: Express session middleware with PostgreSQL storage
- **Security**: HTTP-only cookies with secure flags and CSRF protection
- **User Management**: Automatic user creation and profile management

## Scoring Systems
- **Cricket**: Over-by-over scoring with runs, wickets, and ball-by-ball commentary
- **Football**: Goal tracking with cards, events, and match time management
- **Tennis**: Set-based scoring with deuce and advantage tracking
- **Volleyball**: Point-based scoring with set tracking and serving rotation
- **Kabaddi**: Raid and tackle point system with half-time management

## File Structure
- **Client**: React application in `/client` directory with component-based architecture
- **Server**: Express API in `/server` directory with modular route handling
- **Shared**: Common TypeScript types and schemas in `/shared` directory
- **Database**: MongoDB collections and custom storage interface for data management

# External Dependencies

## Authentication Services
- **Replit Auth**: Primary authentication provider using OpenID Connect protocol
- **OpenID Client**: Standard OIDC implementation for secure authentication flows

## Database Services
- **MongoDB**: NoSQL database for flexible document storage and scalable operations

## Development Tools
- **Vite**: Frontend build tool with hot module replacement and development server
- **Replit Cartographer**: Development environment integration for Replit platform
- **TypeScript**: Type safety across the entire application stack

## UI Libraries
- **Radix UI**: Unstyled, accessible UI primitives for complex components
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library with consistent design language

## Data Management
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Form state management with validation integration
- **Zod**: Runtime type validation and schema definition

## Utility Libraries
- **Date-fns**: Date manipulation and formatting utilities
- **Clsx/CVA**: Dynamic class name generation and component variants
- **Nanoid**: Unique ID generation for client-side operations