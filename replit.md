# Overview

This is a German-language quiz application that generates interactive learning questions from uploaded text files using AI. The application allows users to upload .txt files containing study material, which are then processed by OpenAI GPT-4o to generate various types of quiz questions (definitions, cases, assignments, and open questions). Users can take the quiz, receive immediate feedback, and track their learning progress with statistics.

# User Preferences

Preferred communication style: Simple, everyday language.
UI Text Preferences:
- Application name: "StudyHelper" 
- Tagline: "Erstelle effektive IHK-Abfragen aus deinen Zusammenfassungen"
- Quiz section: "IHK-Abfrage" (instead of "Quiz üben")
- Upload section: "Zusammenfassungen hochladen" (plural form preferred)

Question Review System:
- Only use incorrectly answered questions for review
- Provide 3 review questions per new question generated
- Do not generate retry questions anymore (simplified system)

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **State Management**: TanStack Query for server state management and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe forms

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **File Upload**: Multer middleware for handling .txt file uploads with size and type validation
- **Session Management**: In-memory storage using a custom storage interface for quiz sessions
- **Error Handling**: Centralized error handling middleware with structured error responses

## Data Storage Solutions
- **Database**: CSV file-based storage system (replaced PostgreSQL per user request)
- **File Structure**: Separate CSV files for documents, topics, questions, sessions, and usage tracking
- **Session Storage**: CSV-based storage with interface abstraction
- **File Storage**: Temporary in-memory processing of uploaded text files
- **Review System**: Tracks incorrect answers for targeted review questions

## Authentication and Authorization
- Currently no authentication system implemented - the application operates as a stateless quiz generator
- Session-based identification using randomly generated UUIDs for quiz sessions

## External Service Integrations
- **AI Service**: OpenAI GPT-4o API for question generation from text content
- **Database Service**: Neon PostgreSQL serverless database
- **Development Tools**: Replit integration for development environment support

## Key Design Patterns
- **Repository Pattern**: Storage interface abstraction allows switching between in-memory and database storage
- **Component Composition**: UI components built using composition pattern with Radix primitives
- **Type Safety**: End-to-end TypeScript with shared schemas between client and server
- **Progressive Enhancement**: Graceful degradation with loading states and error boundaries
- **Responsive Design**: Mobile-first approach with Tailwind CSS responsive utilities

# External Dependencies

## Core Framework Dependencies
- **openai**: OpenAI GPT-4o integration for question generation
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: TypeScript ORM with PostgreSQL support
- **express**: Node.js web framework for REST API
- **react**: Frontend UI library
- **@tanstack/react-query**: Server state management

## UI Component Dependencies
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

## Development and Build Tools
- **vite**: Frontend build tool and development server
- **tsx**: TypeScript execution for Node.js
- **drizzle-kit**: Database migration and schema management
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **@replit/vite-plugin-cartographer**: Development tooling integration

## Validation and Forms
- **zod**: Schema validation library
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers

## File Processing
- **multer**: File upload middleware
- **react-dropzone**: Drag-and-drop file upload component