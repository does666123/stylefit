import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [inputPath, outputDirectory = 'training-data'] = process.argv.slice(2);
if (!inputPath) {
  console.error('Usage: node scripts/export-training-data.mjs <feedback.json> [output-directory]');
  process.exit(1);
}

const parsed = JSON.parse(await readFile(resolve(inputPath), 'utf8'));
const events = Array.isArray(parsed) ? parsed : parsed.events;
if (!Array.isArray(events)) throw new Error('Expected a feedback event array.');

const toLine = (event) => JSON.stringify({
  input: { profile: event.profile || {}, mode: event.mode || null, scene: event.scene || null, style: event.style || null, budget: event.budget || null },
  recommended_outfit: { recommendationId: event.recommendationId || null, outfitId: event.outfitId || null, products: event.products || [], scores: event.outfitScores || null },
  feedback: { feedbackId: event.feedbackId || null, action: event.action || null, reason: event.reason || null, createdAt: event.createdAt || null },
});

const output = resolve(outputDirectory);
const positive = events.filter((event) => ['like', 'favorite', 'purchase_click'].includes(event.action)).map(toLine);
const negative = events.filter((event) => event.action === 'dislike').map(toLine);
await mkdir(output, { recursive: true });
await Promise.all([
  writeFile(resolve(output, 'positive_samples.jsonl'), positive.join('\n') + (positive.length ? '\n' : ''), 'utf8'),
  writeFile(resolve(output, 'negative_samples.jsonl'), negative.join('\n') + (negative.length ? '\n' : ''), 'utf8'),
]);
console.log('Exported ' + positive.length + ' positive and ' + negative.length + ' negative samples.');
