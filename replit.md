# Overview

This is a full-stack web application built with a modern React frontend and Express.js backend. The project features a clean, professional design using shadcn/ui components with Tailwind CSS styling. It's configured for PostgreSQL database integration through Drizzle ORM and includes comprehensive UI components for building rich user interfaces.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Animations**: Framer Motion for smooth transitions and animations
- **Forms**: React Hook Form with Zod validation through @hookform/resolvers

## Backend Architecture  
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Development Setup**: TSX for TypeScript execution in development
- **Build Process**: ESBuild for production bundling
- **Storage Interface**: Abstracted storage layer with in-memory implementation for development

## Data Storage
- **Primary Database**: PostgreSQL via Neon Database
- **ORM**: Drizzle ORM with schema-first approach
- **Migrations**: Drizzle Kit for database migrations stored in `/migrations`
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`
- **Development Fallback**: In-memory storage implementation for testing

## Authentication & Authorization
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **Schema**: Basic user model with username/password authentication
- **Validation**: Zod schemas for type-safe data validation

## Development Environment
- **Hot Reload**: Vite HMR for frontend development
- **Code Quality**: TypeScript with strict configuration
- **Path Aliases**: Configured for clean imports (@/, @shared/, @assets/)
- **Replit Integration**: Custom plugins for Replit development environment

# External Dependencies

## Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database interactions
- **connect-pg-simple**: PostgreSQL session store for Express

## UI & Styling
- **Radix UI**: Headless UI component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Framer Motion**: Animation library
- **Inter Font**: Primary typography via Google Fonts

## Development Tools
- **Vite**: Frontend build tool and dev server  
- **TypeScript**: Static type checking
- **ESBuild**: Backend bundling for production
- **PostCSS**: CSS processing with Tailwind and Autoprefixer

## Form & Data Management
- **React Hook Form**: Form state management
- **Zod**: Schema validation
- **TanStack Query**: Server state management
- **date-fns**: Date manipulation utilities

The architecture emphasizes type safety, modern development practices, and a clean separation between frontend and backend concerns. The shared schema approach ensures consistency between client and server data models.