# MCQ Platform Frontend

This is the frontend for the MCQ Platform application built with React, React Router, and Tailwind CSS.

## Features

- User authentication (login, register, logout)
- View all subjects (protected route requiring login)
- Responsive design using Tailwind CSS
- API integration with FastAPI backend

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. Start the development server:

```bash
npm run dev
# or
yarn dev
```

3. The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
# or
yarn build
```

## Backend Integration

The frontend is configured to communicate with the FastAPI backend at `https://openmindsbackend.onrender.com`. You can modify the API URL in the Vite configuration file (`vite.config.js`) if needed.

## Project Structure

- `src/components`: React components
- `src/context`: Context providers (AuthContext)
- `src/services`: API service modules
- `src/utils`: Utility functions

## Authentication Flow

1. User logs in or registers
2. Backend returns a JWT token
3. Token is stored in localStorage
4. Token is attached to all API requests via Authorization header
5. Protected routes check for valid token 