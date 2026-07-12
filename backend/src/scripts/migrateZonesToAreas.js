/**
 * Migrate legacy zone keys to new Area keys and strip fee from deliveryOptions.
 * Run after seedAreas.js: node src/scripts/migrateZonesToAreas.js
 */
import mongoose from 'mongoose';
import env from '../config/env.js';
import Product from '../models/Product.js';
import { ensureSeedAreas } from '../services/areaService.js';

const LEGACY_KEY_MAP = {
  jemo: 'jemo',
  jemo_michael: 'jemo_michael',
  lebu_muzika: 'lebu_muzika',
  lebu_varnero: 'lebu_varnero',
  meberat: 'lebu_mebrat',
  german: 'german_square',
  lafto_belay: 'lafto_belay',
  garment: null,
};

function mapKey(key) {
  return LEGACY_KEY_MAP[key] ?? key;
}

async function main() {
  await mongoose.connect(env.mongodbUri);
  await ensureSeedAreas();

  const products = await Product.find({});
  let updated = 0;
  let flagged = 0;

  for (const product of products) {
    let changed = false;

    if (product.deliveryZones?.length) {
      const nextZones = [];
      for (const key of product.deliveryZones) {
        const mapped = mapKey(key);
        if (!mapped) {
          flagged += 1;
          console.warn(`Product "${product.name}" has unmappable zone "${key}" — review manually`);
          continue;
        }
        if (mapped !== key) changed = true;
        nextZones.push(mapped);
      }
      if (changed || nextZones.length !== product.deliveryZones.length) {
        product.deliveryZones = [...new Set(nextZones)];
        changed = true;
      }
    }

    if (product.deliveryOptions?.length) {
      const nextOptions = [];
      for (const opt of product.deliveryOptions) {
        const mapped = mapKey(opt.key);
        if (!mapped) {
          flagged += 1;
          console.warn(`Product "${product.name}" has unmappable option "${opt.key}" — review manually`);
          continue;
        }
        nextOptions.push({
          key: mapped,
          name: opt.name,
        });
        if (mapped !== opt.key || opt.fee != null) changed = true;
      }
      if (nextOptions.length) {
        product.deliveryOptions = nextOptions;
        product.deliveryZones = nextOptions.map((o) => o.key);
        changed = true;
      }
    }

    if (changed) {
      await product.save();
      updated += 1;
    }
  }

  console.log(`Migration complete. Updated ${updated} products. Flagged ${flagged} unmappable keys.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
