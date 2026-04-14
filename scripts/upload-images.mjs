/**
 * Resize images and upload to Supabase Storage.
 *
 * Walks the folder tree under `photo/` and uses the directory structure
 * directly as the storage path.  e.g.:
 *   photo/kolonie/sportowe/pilka_nozna/img1.jpg
 *   → bucket: kolonie/sportowe/pilka_nozna/img1-cover.webp
 *   → bucket: kolonie/sportowe/pilka_nozna/img1-thumb.webp
 *
 * Usage:
 *   node scripts/upload-images.mjs                          # all folders
 *   node scripts/upload-images.mjs kolonie/sportowe/rolki   # specific subfolder only
 *
 * Install deps first:
 *   npm install sharp dotenv
 */

import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

for (const envName of ['.env.local', '.env']) {
  const envPath = path.join(PROJECT_ROOT, envName)
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false })
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in environment')
if (!supabaseServiceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment')

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const BUCKET = 'event-library'
const PHOTO_DIR_CANDIDATES = [
  path.resolve(PROJECT_ROOT, '..', 'photos'),
  path.resolve(PROJECT_ROOT, '..', 'photo'),
]
const PHOTO_DIR = PHOTO_DIR_CANDIDATES.find((candidate) => existsSync(candidate)) || PHOTO_DIR_CANDIDATES[0]

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.avif'])

const PRESETS = [
  { suffix: 'cover', width: 1400, quality: 78 },
  { suffix: 'thumb', width: 480, quality: 70 },
]

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET)
  if (!data) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) throw new Error(`Failed to create bucket "${BUCKET}": ${error.message}`)
    console.log(`Created bucket: ${BUCKET}`)
  }
}

async function uploadBuffer(storagePath, buffer) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'image/webp',
      upsert: true,
    })

  if (error) {
    throw new Error(`Upload failed for ${storagePath}: ${error.message}`)
  }
}

async function processImage(localFilePath, storageDirPath, setId) {
  const inputBuffer = await fs.readFile(localFilePath)

  for (const preset of PRESETS) {
    const outBuffer = await sharp(inputBuffer)
      .resize({ width: preset.width, withoutEnlargement: true })
      .webp({ quality: preset.quality })
      .toBuffer()

    const storagePath = `${storageDirPath}/${setId}-${preset.suffix}.webp`
    await uploadBuffer(storagePath, outBuffer)
    console.log(`  Uploaded: ${storagePath}`)
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const images = entries.filter(e => e.isFile() && IMAGE_EXTS.has(path.extname(e.name).toLowerCase()))

  if (images.length > 0) {
    const storageDirPath = path.relative(PHOTO_DIR, dir).split(path.sep).join('/')
    console.log(`\n${storageDirPath} (${images.length} images)`)

    for (let i = 0; i < images.length; i++) {
      const setId = String(i + 1).padStart(3, '0')
      await processImage(path.join(dir, images[i].name), storageDirPath, setId)
    }

    return images.length
  }

  let total = 0
  for (const entry of entries) {
    if (entry.isDirectory()) {
      total += await walk(path.join(dir, entry.name))
    }
  }
  return total
}

async function main() {
  const subFolder = process.argv[2]
  const scanDir = subFolder ? path.join(PHOTO_DIR, subFolder) : PHOTO_DIR

  try {
    await fs.access(scanDir)
  } catch {
    console.error(`Directory not found: ${scanDir}`)
    process.exit(1)
  }

  await ensureBucket()
  console.log(`Scanning: ${scanDir}`)
  const total = await walk(scanDir)
  console.log(`\nDone. Processed ${total} images.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
