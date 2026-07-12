/**
 * Seed delivery areas into MongoDB.
 * Run: node src/scripts/seedAreas.js
 */
import mongoose from 'mongoose';
import env from '../config/env.js';
import { ensureSeedAreas, getAllAreas } from '../services/areaService.js';

async function main() {
  await mongoose.connect(env.mongodbUri);
  await ensureSeedAreas();
  const areas = await getAllAreas({ useCache: false });
  console.log(`Seeded ${areas.length} delivery areas.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
