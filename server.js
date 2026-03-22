const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Jimp = require('jimp');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'whalehub2024';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

app.use(express.static('public'));
app.use(express.json());

// Ensure directories exist
['uploads', 'generated'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

async function generateCard({ name, username, niche, characterPath, outputPath }) {
  const W = 800, H = 1080;

  // Create base card - dark background
  const card = new Jimp(W, H, 0x0a0a0aff);

  // Gold border
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if (x < 6 || x > W - 7 || y < 6 || y > H - 7) {
        card.setPixelColor(0xc8a020ff, x, y);
      }
    }
  }

  // Avatar frame background
  const frameX = 120, frameY = 90, frameW = 560, frameH = 520;
  for (let x = frameX; x < frameX + frameW; x++) {
    for (let y = frameY; y < frameY + frameH; y++) {
      card.setPixelColor(0x111111ff, x, y);
    }
  }

  // Frame gold border
  for (let x = frameX - 3; x < frameX + frameW + 3; x++) {
    for (let t = 0; t < 3; t++) {
      card.setPixelColor(0xc8a020ff, x, frameY - t);
      card.setPixelColor(0xc8a020ff, x, frameY + frameH + t);
    }
  }
  for (let y = frameY - 3; y < frameY + frameH + 3; y++) {
    for (let t = 0; t < 3; t++) {
      card.setPixelColor(0xc8a020ff, frameX - t, y);
      card.setPixelColor(0xc8a020ff, frameX + frameW + t, y);
    }
  }

  // Load and composite character image
  try {
    const char = await Jimp.read(characterPath);
    char.cover(frameW - 4, frameH - 4);
    card.composite(char, frameX + 2, frameY + 2);
  } catch (e) {
    console.error('Character load error:', e);
  }

  // CREATOR badge background
  const badgeY = frameY + frameH + 28;
  for (let x = 300; x < 500; x++) {
    for (let y = badgeY; y < badgeY + 38; y++) {
      card.setPixelColor(0xc8a020ff, x, y);
    }
  }

  // Load font and write text
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
  const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
  const fontGold = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

  // WHALE HUB header
  const headerFont = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
  card.print(headerFont, 0, 40, { text: 'WHALE HUB', alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W);

  // CREATOR badge text
  card.print(fontGold, 0, badgeY + 10, { text: 'CREATOR', alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W);

  // Name
  const nameFont = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
  card.print(nameFont, 0, badgeY + 58, { text: name.toUpperCase(), alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W);

  // Niche
  card.print(fontSmall, 0, badgeY + 100, { text: niche, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W);

  // Username
  card.print(fontSmall, 0, badgeY + 126, { text: `@${username.replace('@', '')}`, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W);

  // Footer text
  card.print(fontSmall, 0, H - 30, { text: 'WHALE HUB · SPOUT ECOSYSTEM · CREATOR', alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, W);

  await card.writeAsync(outputPath);
}

// Submit route
app.post('/submit', upload.single('character'), async (req, res) => {
  try {
    const { name, username, niche } = req.body;
    if (!name || !username || !niche || !req.file) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const id = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const outputPath = path.join(__dirname, 'generated', `${id}.png`);

    const meta = { id, name, username, niche, characterFile: req.file.filename, submittedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(__dirname, 'generated', `${id}.json`), JSON.stringify(meta, null, 2));

    await generateCard({
      name, username, niche,
      characterPath: path.join(__dirname, 'uploads', req.file.filename),
      outputPath
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Card generation failed' });
  }
});

// Admin routes
app.get('/admin/submissions', (req, res) => {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  const files = fs.readdirSync('generated').filter(f => f.endsWith('.json'));
  const submissions = files.map(f => JSON.parse(fs.readFileSync(path.join('generated', f))));
  submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json(submissions);
});

app.get('/admin/card/:id', (req, res) => {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  const cardPath = path.join(__dirname, 'generated', `${req.params.id}.png`);
  if (!fs.existsSync(cardPath)) return res.status(404).json({ error: 'Not found' });
  res.download(cardPath);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
