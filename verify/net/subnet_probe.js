// "IP 주소와 서브넷" 실습의 모든 설정 조합을 모형과 다른 방법으로 다시 계산한다.
// 사용: node verify/net/subnet_probe.js > verify/net/subnet_probe.out.txt
// 방법 1 (bit): 화면에 보이는 것과 같은 비트 연산 코드
// 방법 2 (str): 주소를 32글자 2진수 문자열로 바꾼 뒤 잘라 붙이기
// 방법 3 (blk): Node.js의 net.BlockList에 "내 주소/길이"를 넣고, 주소를 하나씩 물어 범위의 양 끝과 개수를 찾기
// 세 방법의 결과가 서로 같은지도 확인하고, 한 줄에 하나씩 "설정 => 결과"로 낸다.
const net = require('net');
const ips = ['192.168.0.10', '192.168.0.130', '10.20.30.42'], prefixes = [16, 23, 24, 25, 26, 30], dests = ['192.168.0.200', '192.168.1.5', '10.20.31.7', '203.0.113.7'];

// 방법 1: 화면의 코드
const toNumber = ip => ip.split('.').reduce((n, part) => n * 256 + Number(part), 0);
const toText = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
function byBits(ip, prefix, dest) {
  const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
  const network = (toNumber(ip) & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  return { mask: toText(mask), network: toText(network), broadcast: toText(broadcast), hosts: 2 ** (32 - prefix) - 2, same: ((toNumber(dest) & mask) >>> 0) === network };
}

// 방법 2: 2진수 문자열
const toBin = ip => ip.split('.').map(p => Number(p).toString(2).padStart(8, '0')).join('');
const fromBin = b => [0, 8, 16, 24].map(i => parseInt(b.slice(i, i + 8), 2)).join('.');
function byString(ip, prefix, dest) {
  const head = toBin(ip).slice(0, prefix), hostLen = 32 - prefix;
  const network = head + '0'.repeat(hostLen), broadcast = head + '1'.repeat(hostLen);
  return { mask: fromBin('1'.repeat(prefix) + '0'.repeat(hostLen)), network: fromBin(network), broadcast: fromBin(broadcast),
    hosts: Number(BigInt('0b' + broadcast) - BigInt('0b' + network) - 1n), first: fromBin((BigInt('0b' + network) + 1n).toString(2).padStart(32, '0')), last: fromBin((BigInt('0b' + broadcast) - 1n).toString(2).padStart(32, '0')),
    same: toBin(dest).slice(0, prefix) === head };
}

// 방법 3: net.BlockList. 내 주소에서 아래로, 위로 한 칸씩 가며 "이 서브넷에 속하는가"를 물어 양 끝을 찾는다
const bigToText = n => [n >> 24n, (n >> 16n) & 255n, (n >> 8n) & 255n, n & 255n].join('.');
const textToBig = ip => ip.split('.').reduce((n, p) => n * 256n + BigInt(p), 0n);
function byBlockList(ip, prefix, dest) {
  const bl = new net.BlockList(); bl.addSubnet(ip, prefix, 'ipv4');
  let lo = textToBig(ip), hi = lo, count = 1;
  while (bl.check(bigToText(lo - 1n), 'ipv4')) { lo--; count++; }
  while (bl.check(bigToText(hi + 1n), 'ipv4')) { hi++; count++; }
  return { network: bigToText(lo), broadcast: bigToText(hi), hosts: count - 2, same: bl.check(dest, 'ipv4') };
}

// 사설 주소 대역(RFC 1918)도 BlockList와 2진수 문자열 두 가지로 확인한다
const priv = new net.BlockList(); priv.addSubnet('10.0.0.0', 8, 'ipv4'); priv.addSubnet('172.16.0.0', 12, 'ipv4'); priv.addSubnet('192.168.0.0', 16, 'ipv4');
const privByString = ip => { const b = toBin(ip); return b.startsWith('00001010') || b.startsWith('101011000001') || b.startsWith('1100000010101000'); };

console.log('# node ' + process.version + ' · 형식: 내 주소|길이|목적지 => 마스크|네트워크 주소|브로드캐스트 주소|호스트 수|첫 호스트|마지막 호스트|같은 네트워크|내 주소가 사설|목적지가 사설');
let n = 0, agree = 0;
for (const ip of ips) for (const prefix of prefixes) for (const dest of dests) {
  const a = byBits(ip, prefix, dest), b = byString(ip, prefix, dest), c = byBlockList(ip, prefix, dest);
  const same3 = ['network', 'broadcast', 'hosts', 'same'].every(k => a[k] === b[k] && b[k] === c[k]) && a.mask === b.mask && priv.check(ip, 'ipv4') === privByString(ip) && priv.check(dest, 'ipv4') === privByString(dest);
  // 예시가 성립하려면 내 주소와 목적지가 네트워크 주소나 브로드캐스트 주소가 아니어야 하고, 게이트웨이로 둔 첫 번째 주소가 내 주소와 겹치지 않아야 한다
  const sane = ip !== c.network && ip !== c.broadcast && ip !== b.first && !(c.same && (dest === c.network || dest === c.broadcast || dest === b.first));
  n++; if (same3 && sane) agree++; else console.log('# 방법끼리 다르거나 예시가 성립하지 않음: ' + ip + '/' + prefix + ' ' + dest);
  console.log([ip, prefix, dest].join('|') + ' => ' + [b.mask, c.network, c.broadcast, c.hosts, b.first, b.last, c.same, priv.check(ip, 'ipv4'), priv.check(dest, 'ipv4')].join('|'));
}
console.log('# 세 방법이 서로 일치하고 예시가 성립한 조합 ' + agree + ' / ' + n);
