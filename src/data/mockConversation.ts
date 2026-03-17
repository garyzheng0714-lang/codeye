import type { DisplayMessage } from '../types';

export const MOCK_MESSAGES: DisplayMessage[] = [
  {
    id: 'mock-u1',
    role: 'user',
    content: 'Help me understand the authentication flow in this project. Where is the login logic?',
    toolCalls: [],
    timestamp: Date.now() - 300_000,
  },
  {
    id: 'mock-a1',
    role: 'assistant',
    content: '',
    toolCalls: [
      {
        id: 'tc-read-1',
        name: 'Read',
        input: { file_path: 'src/services/auth.ts' },
        output: 'import jwt from "jsonwebtoken";\nimport bcrypt from "bcrypt";\n\nexport async function login(email: string, password: string) {\n  const user = await db.users.findByEmail(email);\n  if (!user) throw new AuthError("User not found");\n  const valid = await bcrypt.compare(password, user.passwordHash);\n  if (!valid) throw new AuthError("Invalid password");\n  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });\n}\n\nexport function verifyToken(token: string) {\n  return jwt.verify(token, process.env.JWT_SECRET!);\n}',
        expanded: false,
      },
      {
        id: 'tc-read-2',
        name: 'Read',
        input: { file_path: 'src/middleware/requireAuth.ts' },
        output: 'import { verifyToken } from "../services/auth";\n\nexport function requireAuth(req, res, next) {\n  const token = req.headers.authorization?.replace("Bearer ", "");\n  if (!token) return res.status(401).json({ error: "No token" });\n  try {\n    req.user = verifyToken(token);\n    next();\n  } catch {\n    res.status(401).json({ error: "Invalid token" });\n  }\n}',
        expanded: false,
      },
      {
        id: 'tc-read-3',
        name: 'Read',
        input: { file_path: 'src/routes/authRoutes.ts' },
        output: 'import { Router } from "express";\nimport { login } from "../services/auth";\n\nconst router = Router();\nrouter.post("/login", async (req, res) => {\n  const { email, password } = req.body;\n  const token = await login(email, password);\n  res.json({ token });\n});\n\nexport default router;',
        expanded: false,
      },
    ],
    timestamp: Date.now() - 295_000,
  },
  {
    id: 'mock-a1-text',
    role: 'assistant',
    content: `The authentication flow uses **JWT tokens** with a clean three-layer architecture:

1. **\`auth.ts\`** — Core logic: \`login()\` validates credentials via \`bcrypt\` and issues a JWT with 7-day expiry
2. **\`requireAuth.ts\`** — Express middleware that extracts the \`Bearer\` token and verifies it
3. **\`authRoutes.ts\`** — HTTP endpoint at \`POST /login\` that accepts \`email\` + \`password\`

Here's the token flow:

\`\`\`typescript
// Client sends credentials
const res = await fetch("/api/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});
const { token } = await res.json();

// Token is stored and sent with subsequent requests
headers: { Authorization: \`Bearer \${token}\` }
\`\`\`

> **Security note**: The JWT secret comes from \`process.env.JWT_SECRET\`. Make sure this is set in your \`.env\` file and never committed to version control.

The middleware pattern is solid — it follows Express best practices with early return on failure.`,
    toolCalls: [],
    timestamp: Date.now() - 290_000,
  },

  {
    id: 'mock-u2',
    role: 'user',
    content: 'Can you add rate limiting to the login endpoint? Also search for any existing rate limiting code.',
    toolCalls: [],
    timestamp: Date.now() - 250_000,
  },
  {
    id: 'mock-a2',
    role: 'assistant',
    content: '',
    toolCalls: [
      {
        id: 'tc-grep-1',
        name: 'Grep',
        input: { pattern: 'rate.?limit', include: '*.ts' },
        output: 'Found 0 matches across 42 files.',
        expanded: false,
      },
      {
        id: 'tc-glob-1',
        name: 'Glob',
        input: { pattern: '**/middleware/*.ts' },
        output: 'src/middleware/requireAuth.ts\nsrc/middleware/cors.ts\nsrc/middleware/errorHandler.ts',
        expanded: false,
      },
      {
        id: 'tc-bash-1',
        name: 'Bash',
        input: { command: 'npm install express-rate-limit' },
        output: 'added 1 package, and audited 762 packages in 1.2s\n\n218 packages are looking for funding\n  run `npm fund` for details\n\nfound 0 vulnerabilities',
        expanded: false,
      },
      {
        id: 'tc-edit-1',
        name: 'Write',
        input: {
          file_path: 'src/middleware/rateLimit.ts',
          content: 'import rateLimit from "express-rate-limit";\n\nexport const loginLimiter = rateLimit({\n  windowMs: 15 * 60 * 1000,\n  max: 5,\n  message: { error: "Too many login attempts, please try again after 15 minutes" },\n  standardHeaders: true,\n  legacyHeaders: false,\n});',
        },
        output: 'File created successfully.',
        expanded: false,
      },
      {
        id: 'tc-edit-2',
        name: 'Edit',
        input: {
          file_path: 'src/routes/authRoutes.ts',
          old_string: 'router.post("/login", async (req, res) => {',
          new_string: 'router.post("/login", loginLimiter, async (req, res) => {',
        },
        output: 'Applied edit to src/routes/authRoutes.ts',
        expanded: false,
      },
    ],
    timestamp: Date.now() - 245_000,
  },
  {
    id: 'mock-a2-text',
    role: 'assistant',
    content: `No existing rate limiting found. I've added it:

- **Created** \`src/middleware/rateLimit.ts\` — Uses \`express-rate-limit\` with a 15-minute window, max 5 attempts
- **Updated** \`authRoutes.ts\` — Applied the limiter to the \`POST /login\` route

The limiter returns standard \`RateLimit-*\` headers so clients can track their remaining attempts.`,
    toolCalls: [],
    timestamp: Date.now() - 240_000,
  },

  {
    id: 'mock-u3',
    role: 'user',
    content: 'Run the tests to make sure nothing is broken.',
    toolCalls: [],
    timestamp: Date.now() - 200_000,
  },
  {
    id: 'mock-a3',
    role: 'assistant',
    content: '',
    toolCalls: [
      {
        id: 'tc-bash-2',
        name: 'Bash',
        input: { command: 'npm test -- --reporter=verbose 2>&1 | head -40' },
        output: '> codeye@0.1.0 test\n> vitest run --reporter=verbose\n\n ✓ src/services/auth.test.ts (4 tests) 128ms\n   ✓ login > returns JWT for valid credentials\n   ✓ login > throws for invalid password\n   ✓ login > throws for unknown email\n   ✓ verifyToken > decodes valid token\n ✓ src/middleware/requireAuth.test.ts (3 tests) 45ms\n   ✓ passes with valid token\n   ✓ rejects missing token\n   ✓ rejects invalid token\n ✓ src/middleware/rateLimit.test.ts (2 tests) 312ms\n   ✓ allows requests under limit\n   ✓ blocks requests over limit\n ✓ src/routes/authRoutes.test.ts (2 tests) 89ms\n   ✓ POST /login returns token\n   ✓ POST /login returns 429 after 5 attempts\n\n Test Files  4 passed (4)\n      Tests  11 passed (11)\n   Start at  11:42:01\n   Duration  1.23s',
        expanded: false,
      },
    ],
    timestamp: Date.now() - 195_000,
  },
  {
    id: 'mock-a3-text',
    role: 'assistant',
    content: 'All **11 tests pass** across 4 test files, including the new rate limiting tests. The login endpoint correctly returns `429` after 5 failed attempts.',
    toolCalls: [],
    timestamp: Date.now() - 190_000,
  },

  {
    id: 'mock-u4',
    role: 'user',
    content: 'Now refactor the entire auth module to support OAuth2 providers (Google, GitHub).',
    toolCalls: [],
    timestamp: Date.now() - 150_000,
  },
  {
    id: 'mock-a4',
    role: 'assistant',
    content: '',
    toolCalls: [
      {
        id: 'tc-task-1',
        name: 'Task',
        input: {
          description: 'Add OAuth2 provider support (Google + GitHub)',
          prompt: 'Implement OAuth2 login flow with passport.js for Google and GitHub providers',
        },
        output: 'Task completed successfully.',
        expanded: false,
        progressLines: [
          '[x] Install passport, passport-google-oauth20, passport-github2',
          '[x] Create OAuth provider config in src/config/oauth.ts',
          '[x] Implement Google OAuth strategy',
          '[x] Implement GitHub OAuth strategy',
          '[x] Add OAuth callback routes',
          '[x] Update user model with provider fields',
          '[x] Write integration tests',
        ],
      },
    ],
    timestamp: Date.now() - 145_000,
  },
  {
    id: 'mock-a4-text',
    role: 'assistant',
    content: `OAuth2 support is fully implemented. The auth module now supports three login methods:

| Method | Endpoint | Provider |
|--------|----------|----------|
| Email/Password | \`POST /login\` | Built-in |
| Google | \`GET /auth/google\` | Passport |
| GitHub | \`GET /auth/github\` | Passport |

All providers issue the same JWT format, so downstream middleware works unchanged.`,
    toolCalls: [],
    timestamp: Date.now() - 140_000,
  },

  {
    id: 'mock-u5',
    role: 'user',
    content: 'Looks great! Commit everything and push.',
    toolCalls: [],
    timestamp: Date.now() - 100_000,
  },
  {
    id: 'mock-a5-git',
    role: 'assistant',
    content: '',
    toolCalls: [
      {
        id: 'tc-bash-git',
        name: 'Bash',
        input: { command: 'git add -A && git commit -m "feat(auth): add rate limiting and OAuth2 provider support"' },
        output: '[main a1b2c3d] feat(auth): add rate limiting and OAuth2 provider support\n 8 files changed, 245 insertions(+), 12 deletions(-)',
        expanded: false,
      },
    ],
    timestamp: Date.now() - 95_000,
    gitResult: {
      action: 'commit',
      operationId: 'op-mock-1',
      success: true,
      hash: 'a1b2c3d',
      message: 'feat(auth): add rate limiting and OAuth2 provider support',
      branch: 'main',
    },
  },
  {
    id: 'mock-a5-text',
    role: 'assistant',
    content: 'Committed as `a1b2c3d` on `main`. 8 files changed with **245 additions** and 12 deletions.',
    toolCalls: [],
    timestamp: Date.now() - 90_000,
  },
];
