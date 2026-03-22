# Whale Hub — Creator Card Generator

A simple web app that collects creator submissions and automatically generates personalized Whale Hub cards. Creators submit their info and see no preview. You access all cards from the admin panel.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

> **Note:** The `canvas` package requires native dependencies. On Ubuntu/Debian:
> ```bash
> sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
> ```
> On Mac: `brew install pkg-config cairo pango libpng jpeg giflib librsvg`

### 2. Change the admin password

Open `server.js` and change this line:
```js
const ADMIN_PASSWORD = 'whalehub2024'; // Change this
```

### 3. Start the server

```bash
npm start
```

Server runs on **http://localhost:3000**

---

## URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | Creator submission form (share this) |
| `http://localhost:3000/admin.html` | Admin panel (keep private) |

---

## How it works

1. You send selected creators the form link
2. They fill in: Name, Handle, Niche, Character image
3. The server generates their card and saves it server-side
4. They see a "You're In" success screen — **no card preview**
5. You log into `/admin.html` with your password
6. You see all submissions listed, download any card with one click
7. You send the card to each creator manually via DM

---

## File structure

```
whalehub/
├── server.js          — Main server + card generator
├── package.json
├── public/
│   ├── index.html     — Creator submission form
│   └── admin.html     — Admin dashboard
├── uploads/           — Uploaded character images (auto-created)
└── generated/         — Generated cards + metadata JSON (auto-created)
```

---

## Deploying to production

### Option A — Railway (easiest, free tier available)
1. Push to a GitHub repo
2. Go to railway.app → New Project → Deploy from GitHub
3. Add environment variable: `ADMIN_PASSWORD=yourpassword`
4. Done — Railway gives you a public URL

### Option B — Render
1. Push to GitHub
2. Go to render.com → New Web Service
3. Build command: `npm install`
4. Start command: `npm start`
5. Add env var: `ADMIN_PASSWORD=yourpassword`

### Option C — VPS (DigitalOcean / Hetzner)
```bash
git clone your-repo
cd whalehub
npm install
# Install PM2 for persistent process
npm install -g pm2
pm2 start server.js --name whalehub
pm2 save
```

---

## Customizing the card design

The card is generated in `server.js` inside the `generateCard()` function using the HTML5 Canvas API. Key things you can tweak:

- **Colors** — search for hex values like `#c8a020` (gold) and `#0a0a0a` (background)
- **Fonts** — the canvas uses system serif fonts; for custom fonts use `registerFont()` from the canvas package
- **Layout** — all coordinates are in pixels on an 800×1080 canvas
- **Logo** — replace `drawWhaleIcon()` with an actual logo using `loadImage()`

---

## Adding your actual Spout Finance logo

Replace the whale icon in the bottom-left with your real logo:

```js
// In generateCard(), replace drawWhaleIcon() with:
const logo = await loadImage('./public/spout-logo.png');
ctx.drawImage(logo, 50, H - 110, 120, 40); // adjust size/position
```

Place your logo file in the `public/` folder.
