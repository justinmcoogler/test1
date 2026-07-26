// Generate a self-signed certificate for the LAN server, so the game can be
// INSTALLED to a home screen from a tablet.
//
//   node tools/make-cert.mjs
//   npm run server -- --tls
//
// WHY THIS EXISTS AT ALL. Playing over plain http on a home network is fine.
// Installing is not: a browser will only register a service worker, and Chrome
// will only offer "Install", on a SECURE CONTEXT. localhost counts as one, which
// is why the host machine can install and the tablets cannot. The only fix that
// stays on your own network is to serve https, and the only certificate you can
// have for 192.168.x.x is one you signed yourself.
//
// The cert covers every LAN address this machine currently has, so the URL the
// server prints is the URL the certificate is valid for. Change networks and you
// will want to run this again.
//
// This shells out to openssl, which ships with macOS and every Linux I have met.
// Nothing is added to package.json — a dependency for a one-off dev convenience
// would be a poor trade in a project that has none.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';

const DIR = '.certs';

function lanAddresses() {
  const out = [];
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  }
  return out;
}

try {
  execFileSync('openssl', ['version'], { stdio: 'ignore' });
} catch {
  console.error('openssl was not found on PATH, and this script is a thin wrapper around it.');
  console.error('Install openssl, or supply your own certificate:');
  console.error('  npm run server -- --cert path/to/cert.pem --key path/to/key.pem');
  process.exit(1);
}

const ips = lanAddresses();
if (!ips.length) {
  console.error('No LAN address found — this machine is not on a network the tablets could reach.');
  process.exit(1);
}

// Subject Alternative Names are what browsers actually check; the Common Name
// has been ignored for years. Every address the server will advertise goes in,
// plus localhost so one certificate covers both ways in.
const alt = ['DNS:localhost', 'IP:127.0.0.1', ...ips.map((ip) => `IP:${ip}`)].join(',');

mkdirSync(DIR, { recursive: true });
const certFile = join(DIR, 'cert.pem');
const keyFile = join(DIR, 'key.pem');

execFileSync('openssl', [
  'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
  '-keyout', keyFile, '-out', certFile,
  '-days', '825',                    // browsers reject long-lived leaf certs
  '-subj', '/CN=Sproutlands LAN',
  '-addext', `subjectAltName=${alt}`,
], { stdio: ['ignore', 'ignore', 'inherit'] });

// Keep the private key out of git even if the ignore rule is ever lost.
const gitignore = join(DIR, '.gitignore');
if (!existsSync(gitignore)) writeFileSync(gitignore, '*\n');

console.log('');
console.log(`  Wrote ${certFile} and ${keyFile}`);
console.log(`  Valid for: ${['localhost', '127.0.0.1', ...ips].join(', ')}`);
console.log('');
console.log('  Start the server with:  npm run server -- --tls');
console.log('');
console.log('  Each device will warn once that the certificate is not trusted.');
console.log('  Accept it (Advanced → Proceed). After that the game is installable.');
console.log('');
