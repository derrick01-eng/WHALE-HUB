const express = require('express');
const multer = require('multer');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const ADMIN_PASSWORD = 'whalehub2024'; // Change this

// Storage for uploaded characters
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

// ---------- CARD GENERATOR ----------
async function generateCard({ name, username, niche, characterPath, outputPath }) {
  const W = 800, H = 1080;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // --- Background: deep black with subtle radial glow ---
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  // Radial glow bottom-center
  const glow = ctx.createRadialGradient(W / 2, H * 0.85, 20, W / 2, H * 0.85, 500);
  glow.addColorStop(0, 'rgba(180,140,40,0.18)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Top glow
  const topGlow = ctx.createRadialGradient(W / 2, 0, 10, W / 2, 0, 400);
  topGlow.addColorStop(0, 'rgba(200,160,50,0.1)');
  topGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  // --- Outer gold border ---
  const borderRadius = 32;
  const borderW = 5;
  roundRect(ctx, borderW, borderW, W - borderW * 2, H - borderW * 2, borderRadius);
  const outerGold = ctx.createLinearGradient(0, 0, W, H);
  outerGold.addColorStop(0, '#f0d060');
  outerGold.addColorStop(0.3, '#c8960a');
  outerGold.addColorStop(0.5, '#f5e070');
  outerGold.addColorStop(0.7, '#b8860b');
  outerGold.addColorStop(1, '#f0d060');
  ctx.strokeStyle = outerGold;
  ctx.lineWidth = borderW * 2;
  ctx.stroke();

  // Inner border line
  roundRect(ctx, 18, 18, W - 36, H - 36, 26);
  ctx.strokeStyle = 'rgba(240,200,60,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // --- WHALE HUB header ---
  ctx.font = 'bold 22px serif';
  ctx.fillStyle = '#c8a020';
  ctx.letterSpacing = '8px';
  ctx.textAlign = 'center';
  ctx.fillText('W H A L E   H U B', W / 2, 64);

  // Header divider
  const divGrad = ctx.createLinearGradient(80, 0, W - 80, 0);
  divGrad.addColorStop(0, 'transparent');
  divGrad.addColorStop(0.5, '#c8a020');
  divGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 76);
  ctx.lineTo(W - 80, 76);
  ctx.stroke();

  // --- Avatar frame ---
  const frameX = 120, frameY = 96, frameW = W - 240, frameH = 520;
  const frameR = 16;

  // Frame background
  ctx.fillStyle = '#0d0d0d';
  roundRect(ctx, frameX, frameY, frameW, frameH, frameR);
  ctx.fill();

  // Frame gold border
  roundRect(ctx, frameX, frameY, frameW, frameH, frameR);
  const frameGold = ctx.createLinearGradient(frameX, frameY, frameX + frameW, frameY + frameH);
  frameGold.addColorStop(0, '#d4a012');
  frameGold.addColorStop(0.5, '#f5e070');
  frameGold.addColorStop(1, '#c8960a');
  ctx.strokeStyle = frameGold;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Character image inside frame
  try {
    const charImg = await loadImage(characterPath);
    ctx.save();
    roundRect(ctx, frameX + 2, frameY + 2, frameW - 4, frameH - 4, frameR - 2);
    ctx.clip();

    // Fit image within frame
    const imgAspect = charImg.width / charImg.height;
    const frameAspect = frameW / frameH;
    let drawW, drawH, drawX, drawY;
    if (imgAspect > frameAspect) {
      drawH = frameH - 4;
      drawW = drawH * imgAspect;
      drawX = frameX + (frameW - drawW) / 2;
      drawY = frameY + 2;
    } else {
      drawW = frameW - 4;
      drawH = drawW / imgAspect;
      drawX = frameX + 2;
      drawY = frameY + (frameH - drawH) / 2;
    }
    ctx.drawImage(charImg, drawX, drawY, drawW, drawH);
    ctx.restore();
  } catch (e) {
    // Fallback: placeholder
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, frameX + 2, frameY + 2, frameW - 4, frameH - 4, frameR - 2);
    ctx.fill();
    ctx.fillStyle = '#444';
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('[ character ]', W / 2, frameY + frameH / 2);
  }

  // Frame inner shadow overlay (bottom)
  const shadowGrad = ctx.createLinearGradient(0, frameY + frameH - 80, 0, frameY + frameH);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.save();
  roundRect(ctx, frameX + 2, frameY + 2, frameW - 4, frameH - 4, frameR - 2);
  ctx.clip();
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(frameX, frameY + frameH - 80, frameW, 80);
  ctx.restore();

  // --- CREATOR badge ---
  const badgeY = frameY + frameH + 28;
  const badgeW = 160, badgeH = 38, badgeX = (W - badgeW) / 2;
  const badgeR = 19;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeR);
  const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
  badgeGrad.addColorStop(0, '#c8960a');
  badgeGrad.addColorStop(0.5, '#f5e070');
  badgeGrad.addColorStop(1, '#c8960a');
  ctx.fillStyle = badgeGrad;
  ctx.fill();
  ctx.font = 'bold 16px serif';
  ctx.fillStyle = '#1a0e00';
  ctx.textAlign = 'center';
  ctx.fillText('CREATOR', W / 2, badgeY + 25);

  // --- Name ---
  ctx.font = 'bold 72px serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(200,150,20,0.3)';
  ctx.shadowBlur = 20;
  ctx.fillText(name, W / 2, badgeY + 100);
  ctx.shadowBlur = 0;

  // --- Niche tag ---
  ctx.font = 'italic 26px serif';
  ctx.fillStyle = '#c8a020';
  ctx.fillText(niche, W / 2, badgeY + 140);

  // --- Username ---
  ctx.font = '20px monospace';
  ctx.fillStyle = 'rgba(200,200,200,0.7)';
  ctx.fillText(`@${username.replace('@', '')}`, W / 2, badgeY + 172);

  // --- Bottom icons ---
  // Whale icon (drawn)
  drawWhaleIcon(ctx, 80, H - 90, 60, '#1a6b3a');

  // Compass badge (right)
  drawCompassBadge(ctx, W - 110, H - 90, 48);

  // Bottom footer bar
  ctx.fillStyle = 'rgba(200,150,20,0.08)';
  ctx.fillRect(0, H - 44, W, 44);
  const footerLine = ctx.createLinearGradient(60, 0, W - 60, 0);
  footerLine.addColorStop(0, 'transparent');
  footerLine.addColorStop(0.5, 'rgba(200,150,20,0.5)');
  footerLine.addColorStop(1, 'transparent');
  ctx.strokeStyle = footerLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, H - 44);
  ctx.lineTo(W - 60, H - 44);
  ctx.stroke();

  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(200,150,20,0.6)';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '2px';
  ctx.fillText('WHALE HUB  ·  SPOUT ECOSYSTEM  ·  CREATOR', W / 2, H - 16);

  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawWhaleIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = 'none';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  // Simple whale outline
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.5, size * 0.28, -0.2, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.stroke();
  // Tail
  ctx.beginPath();
  ctx.moveTo(size * 0.45, 0);
  ctx.lineTo(size * 0.65, -size * 0.22);
  ctx.moveTo(size * 0.45, 0);
  ctx.lineTo(size * 0.65, size * 0.22);
  ctx.stroke();
  // Spout
  ctx.beginPath();
  ctx.moveTo(-size * 0.3, -size * 0.28);
  ctx.bezierCurveTo(-size * 0.3, -size * 0.55, -size * 0.15, -size * 0.6, -size * 0.1, -size * 0.45);
  ctx.stroke();
  ctx.restore();
}

function drawCompassBadge(ctx, cx, cy, r) {
  // Outer circle
  const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
  grad.addColorStop(0, '#c8a020');
  grad.addColorStop(0.6, '#8a6000');
  grad.addColorStop(1, '#c8a020');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#f5e070';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Inner circle
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(245,224,112,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Cross lines
  ctx.strokeStyle = '#f5e070';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.55); ctx.lineTo(cx, cy + r * 0.55);
  ctx.moveTo(cx - r * 0.55, cy); ctx.lineTo(cx + r * 0.55, cy);
  ctx.stroke();
  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#f5e070';
  ctx.fill();
}

// ---------- ROUTES ----------

// Submit form
app.post('/submit', upload.single('character'), async (req, res) => {
  try {
    const { name, username, niche } = req.body;
    if (!name || !username || !niche || !req.file) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const id = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const outputPath = path.join(__dirname, 'generated', `${id}.png`);

    // Save submission metadata
    const meta = { id, name, username, niche, characterFile: req.file.filename, submittedAt: new Date().toISOString() };
    const metaPath = path.join(__dirname, 'generated', `${id}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    // Generate card
    await generateCard({
      name,
      username,
      niche,
      characterPath: path.join(__dirname, 'uploads', req.file.filename),
      outputPath
    });

    res.json({ success: true, message: 'Submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Card generation failed' });
  }
});

// Admin - list all submissions
app.get('/admin/submissions', (req, res) => {
  const pw = req.headers['x-admin-password'];
  if (pw !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

  const generatedDir = path.join(__dirname, 'generated');
  const files = fs.readdirSync(generatedDir).filter(f => f.endsWith('.json'));
  const submissions = files.map(f => JSON.parse(fs.readFileSync(path.join(generatedDir, f))));
  submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json(submissions);
});

// Admin - download a card
app.get('/admin/card/:id', (req, res) => {
  const pw = req.headers['x-admin-password'];
  if (pw !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

  const cardPath = path.join(__dirname, 'generated', `${req.params.id}.png`);
  if (!fs.existsSync(cardPath)) return res.status(404).json({ error: 'Not found' });
  res.download(cardPath, `whalehub-card-${req.params.id}.png`);
});

app.listen(PORT, () => console.log(`Whale Hub server running on http://localhost:${PORT}`));
