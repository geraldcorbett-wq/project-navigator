import fs from 'node:fs';
import path from 'node:path';
const fail=m=>{console.error(`FAIL: ${m}`);process.exitCode=1};
const ok=m=>console.log(`PASS: ${m}`);
const exists=p=>fs.existsSync(path.resolve(p));
const read=p=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));

pkg.version==='2.0.0'?ok('Navigator version 2.0.0'):fail(`version ${pkg.version}`);
pkg.dependencies?.next==='15.5.24'?ok('Next.js 15.5.24 Maintenance LTS'):fail('Next.js security version not pinned');
pkg.dependencies?.react?.startsWith('19.')?ok('React 19 aligned'):fail('React 19 required for Next 15');
!exists('.env.local')?ok('no live environment file distributed'):fail('.env.local must not ship');
!exists('package-lock.json')?ok('no stale lockfile distributed'):fail('stale lockfile present');
for(const p of ['app/api/conversations/[conversationId]/respond/route.ts','lib/navigator/context.ts','lib/navigator/ai-client.ts','supabase/migrations/019_navigator_containment.sql','app/api/circles/[circleId]/responses/route.ts','mobile-web/index.html','ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png']) exists(p)?ok(p):fail(`missing ${p}`);
!exists('src/app')?ok('single application tree'):fail('duplicate src/app tree');
const config=read('next.config.mjs');
for(const token of ['Content-Security-Policy','frame-ancestors \'none\'','X-Frame-Options','Strict-Transport-Security','Permissions-Policy','poweredByHeader: false']) config.includes(token)?ok(`security: ${token}`):fail(`missing ${token}`);
const ai=read('app/api/conversations/[conversationId]/respond/route.ts');
for(const token of ['tools: []','navigator_ai_admit','navigator_ai_finish','MAX_INPUT_CHARS = 8000','MAX_OUTPUT_TOKENS = 900','Never imply context','CLOSED WORLD']) ai.includes(token)?ok(`AI containment: ${token}`):fail(`missing AI containment ${token}`);
!ai.includes('model });')&&!ai.includes('model: model')?ok('model/provider not returned to client'):fail('model details exposed');
const messages=read('app/api/conversations/[conversationId]/messages/route.ts');
messages.includes('body.role !== undefined && body.role !== "user"')?ok('client cannot forge assistant/system messages'):fail('message roles not locked');
const health=read('app/api/navigator-health/route.ts');
health.includes('NextResponse.json({ ok: ready }')&&!health.includes('supabase_configured')&&!health.includes('model:')?ok('health response minimal'):fail('health leaks internals');
const migration=read('supabase/migrations/019_navigator_containment.sql');
for(const token of ['Circle members view circles','Circle members respond','navigator_ai_usage','navigator_ai_leases','contact_interactions']) migration.includes(token)?ok(`migration: ${token}`):fail(`missing ${token}`);
const launcher=read('mobile-web/index.html');
const cap=read('capacitor.config.ts');
cap.includes("parsed.protocol !== 'https:'")&&cap.includes('allowNavigation: [parsed.hostname]')&&cap.includes('cleartext: false')?ok('mobile bound to one HTTPS Navigator deployment'):fail('mobile deployment containment missing');
!launcher.includes('<input')&&!launcher.includes('fetch(')?ok('mobile fallback has no arbitrary network ingress'):fail('mobile fallback permits external ingress');
!launcher.includes('supabase')&&!launcher.includes('openai')?ok('mobile fallback hides infrastructure'):fail('mobile fallback leaks infrastructure');
const sourceFiles=[];
for(const root of ['app','lib']){const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx|js|mjs)$/.test(e.name))sourceFiles.push(p)}};walk(root)}
const external=[];for(const f of sourceFiles){const t=read(f);for(const m of t.matchAll(/https:\/\/[^"'`\s)]+/g))external.push([f,m[0]])}
const unauthorized=external.filter(([f,u])=>!(f==='lib/navigator/ai-client.ts'&&u==='https://api.openai.com/v1/responses'));
unauthorized.length===0?ok('no arbitrary external HTTP destinations in app/server source'):fail(`external destinations: ${JSON.stringify(unauthorized)}`);
const icon=fs.readFileSync('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
icon.length>26&&icon[25]===2?ok('iOS App Store icon has no alpha channel'):fail(`iOS icon color type ${icon[25]}`);
if(!process.exitCode) console.log('Navigator 2.0 containment validation complete.');
