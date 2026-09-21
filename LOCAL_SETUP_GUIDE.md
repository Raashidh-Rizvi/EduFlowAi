# EduFlow AI - Local Environment Setup Guide

## Phase 1: Environment Assessment
Based on the system check, here is your current status:
- ✅ **.NET 8.0 SDK**: Installed (v8.0.423).
- ❌ **PostgreSQL**: Not installed or not in PATH.
- ❌ **Flutter SDK**: Not installed or not in PATH.
- ❌ **Redis**: Needs verification/installation. (Required by the Gamification and Leaderboard components).

## Phase 2: What You Need to Download & Install

### 1. PostgreSQL (Database)
- **Download**: [PostgreSQL Official Installer for Windows](https://www.postgresql.org/download/windows/)
- **Setup**: Install the latest stable version (e.g., 16 or 17). During installation, make sure to remember the password you set for the default `postgres` user.
- **Tools**: Install pgAdmin (usually included with the installer) or DBeaver to easily view your tables.

### 2. Redis (In-Memory Cache)
EduFlow AI uses Redis for $O(\log N)$ leaderboard rankings and caching. Since you are on Windows, you have two primary options:
- **Option A (Recommended - Docker)**: Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/), then run the following command to start a Redis container: 
  `docker run --name eduflow-redis -p 6379:6379 -d redis`
- **Option B (Native Windows)**: Use [Memurai](https://www.memurai.com/) (Developer Edition), which is a native Windows port fully compatible with Redis.

### 3. Flutter (Frontend)
- **Download**: [Flutter Windows SDK](https://docs.flutter.dev/get-started/install/windows)
- **Setup**: Extract the downloaded zip file (e.g., to `C:\src\flutter`).
- **PATH Variable**: Add `C:\src\flutter\bin` to your system Environment Variables (PATH).
- **Verification**: Run `flutter doctor` in a new terminal window. This tool will verify if you are missing any required Android SDK components or Visual Studio build tools required for Windows desktop development.

---

## Phase 3: Backend Configuration

### 1. Database Connection String
Navigate to `backend/EduFlow.Api/appsettings.json` (you might need to create it or modify `appsettings.Development.json`) and configure your PostgreSQL connection:
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=EduFlowDb;Username=postgres;Password=YOUR_PASSWORD"
}
```

### 2. Redis Configuration
In the same `appsettings.json`, ensure Redis is pointing to your local instance:
```json
"Redis": {
  "ConnectionString": "localhost:6379"
}
```

---

## Phase 4: Running the Backend

Once PostgreSQL and Redis are running, execute these commands to launch the backend:

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```
2. **Restore NuGet Packages**:
   ```bash
   dotnet restore
   ```
3. **Run EF Core Migrations**:
   This will connect to your local PostgreSQL and build the `EduFlowDb` schema (`xp_transactions`, users, courses, etc.):
   ```bash
   dotnet ef database update --project EduFlow.Infrastructure --startup-project EduFlow.Api
   ```
4. **Start the API Server**:
   ```bash
   dotnet run --project EduFlow.Api
   ```

Your ASP.NET Core API and SignalR Hubs (`/hubs/gamification`, `/hubs/leaderboard`) will now be active on `https://localhost:5001` (or whichever port your `launchSettings.json` specifies).

---

## Phase 5: Mobile Frontend (Flutter) Configuration & Run

### 1. Connect Flutter to the Backend API
You need to ensure the Flutter app points to your local `.NET` backend. Open the Flutter project's API configuration file (usually something like `lib/core/constants/api_constants.dart` or an `.env` file) and set your base URL:

```dart
// Example API Constants file
class ApiConstants {
  // If testing on a physical Android device or Android Emulator, you might need to use your machine's local IP (e.g., 192.168.1.X) instead of localhost.
  static const String baseUrl = 'https://localhost:5001/api';
  static const String signalRHubUrl = 'https://localhost:5001/hubs';
}
```
*Note: If you are running the app on an Android emulator, `localhost` refers to the emulator itself. You will need to use `10.0.2.2` to refer to your Windows machine's localhost.*

### 2. Running the Flutter App

Once your backend is running in the background, you can launch the Flutter application:

1. **Navigate to the mobile directory**:
   ```bash
   cd mobile
   ```

2. **Fetch Flutter Dependencies**:
   This downloads all packages from pub.dev.
   ```bash
   flutter pub get
   ```

3. **Run the Flutter Application**:
   You can run this on a connected device, an emulator, or as a Windows desktop app.
   ```bash
   # Run on the default active device
   flutter run
   
   # Or run specifically on Windows
   flutter run -d windows
   ```

---

## Phase 6: Web Frontend (React) Configuration & Run

### 1. Install Node.js
If you haven't already, you must download and install **Node.js** (which includes `npm`) from [nodejs.org](https://nodejs.org/).

### 2. Running the React Web App

1. **Navigate to the web frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node Dependencies**:
   This downloads all packages from npm.
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```

This will start the Vite development server (usually at `http://localhost:5173/`).

Once either frontend launches, it will connect to your local API and you can begin testing the complete stack end-to-end!
