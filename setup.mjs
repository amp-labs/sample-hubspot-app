#!/usr/bin/env node
// Points the HubSpot app's webhooks at your Ampersand integration.
//
// Fills in PROJECT_ID and INTEGRATION_ID in
// hubspot-app/src/app/webhooks/webhooks-hsmeta.json.
//
// Usage:
//   node setup.mjs                                  # look up the IDs with the Ampersand CLI, or ask for them
//   node setup.mjs --project-id <id> --integration-id <id>
//   node setup.mjs --dry-run                        # show the new URL without changing any files

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const webhooksPath = join(root, 'hubspot-app/src/app/webhooks/webhooks-hsmeta.json');
const ampYamlPath = join(root, 'ampersand/amp.yaml');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = args.includes('--dry-run');
let projectId = argValue('--project-id');
let integrationId = argValue('--integration-id');

// Reads answers one line at a time (works when typing or when answers are piped in).
const rl = createInterface({ input: process.stdin });
const lines = [];
const waiting = [];
let inputClosed = false;
rl.on('line', (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));
rl.on('close', () => {
  inputClosed = true;
  waiting.splice(0).forEach((resolve) => resolve(null));
});
async function ask(question) {
  process.stdout.write(question);
  const line = lines.length ? lines.shift() : inputClosed ? null : await new Promise((r) => waiting.push(r));
  if (line === null) throw new Error('No answer given. Run it again, or pass --project-id and --integration-id.');
  return line.trim();
}

// Runs the Ampersand CLI. Returns its output, or null if it isn't installed or fails.
function amp(...cliArgs) {
  try {
    return execFileSync('amp', cliArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    return null;
  }
}

// The integration name from amp.yaml, e.g. "hubspotIntegration".
function integrationName() {
  const match = readFileSync(ampYamlPath, 'utf8').match(/^\s*-\s*name:\s*([^\s#]+)/m);
  return match ? match[1] : null;
}

async function findProjectId() {
  const output = amp('list:projects');
  if (!output) return null;
  const projects = [...output.matchAll(/Project ID:\s*([0-9a-f-]{36}),\s*Project Name:\s*(.+)/gi)]
    .map((m) => ({ id: m[1], name: m[2].trim() }));
  if (projects.length === 0) return null;
  if (projects.length === 1) {
    console.log(`Using Ampersand project "${projects[0].name}".`);
    return projects[0].id;
  }
  console.log('Your Ampersand projects:');
  projects.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}`));
  const choice = Number(await ask(`Which one did you deploy amp.yaml to? (1-${projects.length}): `));
  return projects[choice - 1]?.id ?? null;
}

function findIntegrationId(project) {
  const name = integrationName();
  const output = name && amp('list:integrations', '-p', project);
  if (!output) return null;
  const match = [...output.matchAll(/Integration ID:\s*([0-9a-f-]{36}),\s*Integration Name:\s*(\S+)/gi)]
    .find((m) => m[2] === name);
  if (match) console.log(`Found integration "${name}".`);
  return match ? match[1] : null;
}

async function askFor(label, where) {
  for (;;) {
    const value = await ask(`${label} (${where}): `);
    if (UUID.test(value)) return value;
    console.log('That doesn\'t look like an ID. It should look like 2bbfda86-2cdd-4765-ab0b-835d7fee1d9a.');
  }
}

try {
  projectId ??= await findProjectId();
  if (!projectId) {
    console.log('Couldn\'t look up your project with the Ampersand CLI. Enter the IDs instead.');
    projectId = await askFor('Ampersand project ID', 'Dashboard > General Settings');
  }
  integrationId ??= findIntegrationId(projectId);
  if (!integrationId) {
    console.log('Couldn\'t find the integration. Did you run `amp deploy ampersand` first?');
    integrationId = await askFor('Integration ID', 'Dashboard > Home');
  }
  for (const [label, id] of [['Project ID', projectId], ['Integration ID', integrationId]]) {
    if (!UUID.test(id)) throw new Error(`${label} "${id}" isn't a valid ID.`);
  }

  const targetUrl = `https://subscribe-webhook.withampersand.com/v1/projects/${projectId}/integrations/${integrationId}`;
  const original = readFileSync(webhooksPath, 'utf8');
  const updated = original.replace(/("targetUrl"\s*:\s*")[^"]*(")/, `$1${targetUrl}$2`);
  if (updated === original && !original.includes(targetUrl)) {
    throw new Error('Couldn\'t find "targetUrl" in webhooks-hsmeta.json.');
  }

  if (dryRun) {
    console.log(`\nDry run. The webhook URL would be:\n  ${targetUrl}`);
  } else {
    writeFileSync(webhooksPath, updated);
    console.log(`\nUpdated hubspot-app/src/app/webhooks/webhooks-hsmeta.json:\n  ${targetUrl}`);
    console.log('\nNext: name your app (step 4), then run `hs project upload` in hubspot-app (step 5).');
  }
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
} finally {
  rl.close();
}
