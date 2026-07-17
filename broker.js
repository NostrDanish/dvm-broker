// dvm-broker: discover NIP-89 handlers, request NIP-90 jobs, pay via NWC
import { NDK } from '@nostr-dev-kit/ndk';
import { NWCClient } from 'nostrwalletconnect';

const ndk = new NDK({ explicitRelayUrls: ['wss://relay.damus.io','wss://nos.lol','wss://relay.primal.net'] });
await ndk.connect();

export async function discoverHandlers(limit = 50) {
  const handlers = [];
  const sub = ndk.subscribe({ kinds: [31990], limit });
  sub.on('event', e => handlers.push({ id: e.tagValue('d'), pubkey: e.pubkey }));
  await new Promise(r => setTimeout(r, 4000));
  return handlers;
}

export async function requestJob(kind, prompt, nwcString) {
  const req = ndk.event({ kind, tags: [['param','prompt',prompt]] });
  await req.publish();
  console.log('[DVM] job published kind', kind);
  // poll for result kind+1000, then pay via NWC on invoice tag
  const nwc = new NWCClient(nwcString);
  console.log('[DVM] balance', (await nwc.get_balance()).balance);
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('broker.js')) {
  const kind = parseInt(process.argv.find(a=>a.startsWith('--kind'))?.split('=')[1] || '5050');
  const prompt = process.argv.find(a=>a.startsWith('--prompt'))?.split('=')[1] || 'hello';
  const nwc = process.env.NWC_STRING;
  const h = await discoverHandlers();
  console.log('[DVM] handlers found:', h.length);
  if (nwc) await requestJob(kind, prompt, nwc);
}
