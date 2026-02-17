# Data Lake Frontend 🎨

The user interface for the **Data Lake to SQL** platform. Built with **Next.js 14**, it provides a sleek, real-time experience for uploading data and visualizing the database creation process.

## ✨ Features

-   **📂 File Upload Zone**: Drag-and-drop interface for `CSV`, `JSON`, `XML`, and `TXT` files.
-   **📊 Interactive Schema Visualization**:
    -   **2D Graph**: Powered by **React Flow**, showing tables and relationships clearly.
    -   **3D Graph**: Powered by **React Three Fiber**, offering an immersive view of complex schemas.
-   **⏱️ Live Build Timeline**: Tracks the AI agent's progress in real-time via **Supabase Realtime**.
-   **⚠️ Data Drift Alerts**: Notifications when incoming data violates the established schema.
-   **验证 Validation Panel**: Detailed breakdown of data quality and consistency checks.

## 🛠️ Tech Stack

-   **Framework**: Next.js 14 (App Router)
-   **Styling**: Tailwind CSS + Shadcn UI
-   **State Management**: React Context + Supabase Realtime
-   **Visualization**: React Flow (2D), Three.js / React Three Fiber (3D)
-   **Icons**: Lucide React

## 🚀 Getting Started

### 1. Configure Environment

Create a `.env.local` file in the root of this directory:

```env
# Supabase Configuration (Public Key is safe for client-side)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend API (Points to the local Agent)
NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:3001
```

### 2. Run Locally

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧩 Project Structure

-   `app/`: Next.js App Router pages and layouts.
-   `components/`: Reusable UI components (UploadZone, SchemaGraph, etc.).
-   `lib/`: Utility functions and API clients (`supabaseClient.ts`, `api.ts`).
-   `public/`: Static assets and sample data files.
