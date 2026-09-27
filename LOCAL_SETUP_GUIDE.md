# EduFlow AI - Local Environment Setup Guide

## Phase 1: Environment Assessment
Check your installed toolchain versions by running these commands in your terminal:
- **.NET 10 SDK**: `dotnet --version`
- **Node.js (v18+) & npm**: `node -v` & `npm -v`
- **Python (3.11+)**: `python --version` or `python3 --version`
- **PostgreSQL**: `psql --version` (or verify PostgreSQL service is running)
- **Redis**: Verify Redis or Memurai service / Docker container
- **Flutter SDK**: `flutter --version` (Optional: required only for mobile app development)

---

## Phase 2: Downloads & Service Prerequisites

### 1. PostgreSQL (Database)
- **Download**: [PostgreSQL Official Installer for Windows](https://www.postgresql.org/download/windows/)
- **Setup**: Install PostgreSQL (v15+). Remember the password configured for the default `postgres` superuser.
- **Management Tools**: Use pgAdmin (included with installer) or DBeaver to inspect schemas and tables.

### 2. Redis (In-Memory Cache)
EduFlow AI uses Redis for $O(\log N)$ leaderboard rankings and caching:
- **Option A (Recommended - Docker)**:
  ```bash
  docker run --name eduflow-redis -p 6379:6379 -d redis
  ```
- **Option B (Native Windows)**: Use [Memurai](https://www.memurai.com/) (Developer Edition), a native Windows port compatible with Redis on port `6379`.

### 3. Python 3.11+ (For AI Agent Subsystem)
- **Download**: [Python Official Release](https://www.python.org/downloads/)
- Ensure **"Add python.exe to PATH"** is selected during installation.

### 4. Flutter SDK (For Mobile App - Optional)
- **Download**: [Flutter Windows SDK](https://docs.flutter.dev/get-started/install/windows)
- Extract to `C:\src\flutter` and add `C:\src\flutter\bin` to system environment PATH.

---

## Phase 3: ASP.NET Core Backend Configuration & Run

### 1. Database & Redis Configuration
Navigate to `backend/EduFlow.Api/appsettings.json` (or `appsettings.Development.json`) and configure connection strings:
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=EduFlowDb;Username=postgres;Password=YOUR_PASSWORD"
},
"Redis": {
  "ConnectionString": "localhost:6379"
}
```

### 2. Database Migration & Launch
Run the following commands from the repository root:

```powershell
# Navigate to backend directory
cd backend

# Restore packages
dotnet restore

# Run EF Core database migrations
dotnet ef database update --project EduFlow.Infrastructure --startup-project EduFlow.Api

# Start the API server
dotnet run --project EduFlow.Api --launch-profile http
```

- **Swagger UI**: [http://localhost:5204/swagger](http://localhost:5204/swagger)
- **API Base Endpoint**: `http://localhost:5204/api`

---

## Phase 4: Python AI Agent Subsystem Setup & Run 🧠

The AI Agent is an internal microservice built with **FastAPI**, **LangGraph**, and **LangChain** providing multi-agent adaptive orchestration.

### 1. Create Virtual Environment & Install Dependencies
Open a new terminal window:

```powershell
# 1. Navigate to AI agent directory
cd ai-agent

# 2. Create Python virtual environment
python -m venv venv

# 3. Activate virtual environment
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1

# On Windows CMD:
# .\venv\Scripts\activate.bat

# On Linux / macOS:
# source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration (Optional OpenAI Key)
Create a `.env` file in the `ai-agent/` directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run AI Agent Microservice & Tests

```powershell
# Run deterministic test suite to verify graph topology & guardrails
pytest tests/

# Start FastAPI server with live reload
#python main.py
# Or run with uvicorn explicitly:
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8888
```

- **Health Check**: [http://localhost:8888/health](http://localhost:8888/health)
- **Interactive Swagger Docs**: [http://localhost:8888/docs](http://localhost:8888/docs)
- **Agent Topology Endpoint**: [http://localhost:8888/agents/topology](http://localhost:8888/agents/topology)

---

## Phase 5: Web Frontend (React + Vite) Configuration & Run

Open a new terminal window:

```powershell
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start Vite development server
npm run dev
```

- **Web Application URL**: [http://localhost:2174](http://localhost:2174)

---

## Phase 6: Mobile Frontend (Flutter) Configuration & Run

Open a new terminal window:

```powershell
# 1. Navigate to mobile directory
cd mobile

# 2. Fetch Flutter packages
flutter pub get

# 3. Launch mobile app (Windows desktop or emulator)
flutter run -d windows
```

---

## Phase 7: Unified Full-Stack Dev Runner 🚀

Instead of opening 3 separate terminal windows for Backend, Frontend, and AI Agent, you can start all three simultaneously with live auto-reloading from the repository root:

```powershell
# From repository root:
node dev-runner.js
```

Or run individual sub-service watch tasks via npm:
```powershell
npm run dev:agent               # Starts Python AI Agent on port 8888
npm run dev:frontend            # Starts React Vite Frontend on port 2174
npm run dev:backend:build-reload# Starts ASP.NET Core Backend with watch build on port 5204
```

