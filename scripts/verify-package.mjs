import fs from 'node:fs';
import path from 'node:path';

const required = [
  'package.json',
  'next.config.mjs',
  'tsconfig.json',
  '.env.example',
  'app/page.tsx',
  'app/layout.tsx',
  'app/api/health/route.ts',
  'lib/supabase/client.ts',
  'supabase/project-navigator-setup.sql',
  'capacitor.config.ts',
  'mobile-web/index.html'
];

const missing = required.filter((file) => !fs.existsSync(path.resolve(file)));
const major = Number(process.versions.node.split('.')[0]);
const problems = [];
if (major < 22) problems.push(`Node ${process.versions.node} detected; Navigator 10.5 requires Node 22+ for Capacitor 8.`);
if (missing.length) problems.push(`Missing required files: ${missing.join(', ')}`);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const dep of ['next','react','react-dom','@supabase/supabase-js','@capacitor/core','@capacitor/android','@capacitor/ios']) {
  if (!pkg.dependencies?.[dep]) problems.push(`Missing dependency declaration: ${dep}`);
}
for (const dep of ['typescript','@capacitor/cli']) {
  if (!pkg.devDependencies?.[dep]) problems.push(`Missing devDependency declaration: ${dep}`);
}

if (problems.length) {
  console.error('Navigator package verification FAILED');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log('Navigator package verification PASSED');
console.log(`- version ${pkg.version}`);
console.log(`- Node ${process.versions.node}`);
console.log(`- ${required.length} required files present`);
console.log('- web, persistence, and native package declarations present');
