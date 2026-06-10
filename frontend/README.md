# AITasker Frontend

React + Vite frontend for the AITasker AI-powered freelance marketplace.

Original Figma design: [AITasker Landing Page Design](https://www.figma.com/design/Jj51j4lbG0jex59uZdjmqF/AITasker-Landing-Page-Design)

## Quick Start

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Tech Stack

- **Framework:** React 18 + Vite 6
- **Routing:** react-router v7
- **Styling:** Tailwind CSS 4 + shadcn/ui theme + MUI
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Charts:** recharts
- **Drag & Drop:** react-dnd
- **Forms:** react-hook-form

## Project Structure

```
src/
├── app/
│   ├── App.jsx              # Root component
│   ├── routes.jsx           # Route definitions
│   ├── components/
│   │   ├── ui/              # shadcn/ui primitives (50+ components)
│   │   ├── layout/          # Header, Footer, RootLayout
│   │   ├── shared/          # Reusable shared components
│   │   ├── landing/         # Landing page sections
│   │   ├── ai/              # AI-related components
│   │   ├── auth/            # ProtectedRoute
│   │   └── project/         # Project timeline + task management
│   ├── pages/
│   │   ├── public/          # Home, Login, SignUp, Experts
│   │   ├── client/          # Client dashboard, projects, billing
│   │   ├── expert/          # Expert dashboard, jobs, proposals
│   │   ├── admin/           # Admin dashboard, users, disputes
│   │   └── common/          # Messenger, notifications, task updates
│   ├── context/             # React context (AuthContext)
│   ├── hooks/               # Custom hooks (useAuth, use-mobile)
│   └── lib/                 # Utilities, stores, configs
├── services/                # API client (connects to backend)
├── styles/                  # CSS files
└── main.jsx                 # Entry point
```

## API Connection

The API client (`src/services/api.js`) connects to the external ASP.NET Core backend via ngrok.

To change the API URL, set the `VITE_API_URL` environment variable or create a `.env` file:

```
VITE_API_URL=http://localhost:3001/api
```

## Testing

```bash
npx playwright test
```
