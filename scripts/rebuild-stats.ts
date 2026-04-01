import fs from "fs";
import path from "path";
import { CollectResult, DailyStats } from "../src/lib/types";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const STATS_FILE = path.join(DATA_DIR, "stats.json");

async function rebuildStats() {
  console.log("--- Rebuilding stats.json ---");
  
  if (!fs.existsSync(DATA_DIR)) {
    console.error("Data directory not found.");
    return;
  }

  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    .sort();

  const stats: DailyStats[] = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const result: CollectResult = JSON.parse(content);
      
      stats.push({
        date: result.date,
        byGroup: result.stats.byGroup,
        total: result.stats.total
      });
      
      console.log(`Processed ${file}: ${result.stats.total} items`);
    } catch (e) {
      console.error(`Error processing ${file}:`, e);
    }
  }

  // Keep last 30 days and save
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats.slice(-30), null, 2), "utf-8");
  console.log(`Successfully rebuilt ${STATS_FILE} with ${stats.length} entries.`);
}

rebuildStats();
