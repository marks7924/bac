/**
 * build.js — Vercel build script
 * Reads SUPABASE_URL and SUPABASE_ANON_KEY from environment variables
 * and injects them into the HTML files, then copies to ./dist/
 */

const fs   = require('fs');
const path = require('path');

const SUPABASE_URL  = process.env.SUPABASE_URL  || '';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables!');
  process.exit(1);
}

// Create dist folder
const dist = path.join(__dirname, 'dist');
if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });

// Files to process
const htmlFiles = ['index.html', 'study-hub.html'];

htmlFiles.forEach(file => {
  const src = path.join(__dirname, file);
  if (!fs.existsSync(src)) return;

  let content = fs.readFileSync(src, 'utf8');

  // Replace placeholders
  content = content.replace(/YOUR_SUPABASE_URL/g,   SUPABASE_URL);
  content = content.replace(/YOUR_SUPABASE_ANON_KEY/g, SUPABASE_ANON);

  fs.writeFileSync(path.join(dist, file), content, 'utf8');
  console.log(`✅ ${file} → dist/${file}`);
});

// Also copy other static files if present
const extras = ['baccalaureate-schedule.html', 'lecture-tracker.html', 'schema.sql'];
extras.forEach(file => {
  const src = path.join(__dirname, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(dist, file));
    console.log(`📄 Copied: ${file}`);
  }
});

console.log('\n🚀 Build complete → ./dist/');
