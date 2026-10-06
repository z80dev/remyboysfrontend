"""Tiered snapshot of every wallet still holding Remy Boys exposure on Base, minus snipers and full dumpers.

Scans every Transfer log of the Remy Boys collection and each Remy token (rbREMY, rbREMYLS, wREMY, REMY,
fREMY) from the collection's deploy block to head, converts balances to Remy equivalents (so moves between
wrappers and staking receipts don't break a holding streak) and writes one CSV row per address.

    python3 scripts/participants.py [--min-hold-days 7] [--tiers 25,10,5,1] [--out FILE]

Holdings count wallet balances plus Remys parked where the wallet still owns them: live fREMY/ETH Uniswap v4
positions (ETH side valued at the pool price) and stolen NFTs RemyReclaim still owes. LP adds/removes and the
theft/re-mint don't break a streak. Kept: wallets holding now that held >= --min-hold-days in one continuous
stretch, tiered by Remys held now (tier 1 = largest). Dropped: wallets holding nothing now (dumped everything),
wallets that never held that long (snipers), protocol/marketplace contracts and the attacker. Logs are cached
per 20,000 blocks in .cache/participants/ so reruns only fetch new blocks.
"""

import argparse
import csv
import json
import pathlib
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

RPC = 'https://mainnet.base.org'  # archive logs, 500-block ranges, 10 calls per batch
TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
ZERO = '0x' + '0' * 40
START = 13378030  # Remy Boys collection deploy block
GROUP = 20000
GENESIS_TS = 1686789347  # Base block 0; blocks are exactly 2s apart
BLOCKS_PER_DAY = 43200
DUST = 0.01  # Remy equivalents below this count as "not holding"

POOL_START = 51884322  # NFTVault/fREMY deploy; the fREMY/ETH pool opened just after
POOL_ID = '0x4df9239dd817e5a8559489e0756a064de5548a15ebeb348a451a78744ae1fcd6'
MODIFY_LIQUIDITY = '0xf208f4912782fd25c7f114ca3723a2d5dd6f3bcc3ac8db5af63baa85f711d5ec'
POOL_MANAGER = '0x498581ff718922c3f8e6a244956af099b2652b2b'
POSITION_MANAGER = '0x7c5f5a4bbd8fd63184577525326123b519429bdc'
STATE_VIEW = '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71'
SEL = {'ownerOf': '0x6352211e', 'getPoolAndPositionInfo': '0x7ba03aad', 'getPositionLiquidity': '0x1efeed33',
       'getSlot0': '0xc815641c', 'claimed': '0xc884ef83'}

# key: (address, Remy equivalents per raw unit; None = one NFT)
ASSETS = {
    'remyBoys': ('0x3e9e529e32ad2821bdbfda348c2f9da94b43976c', None),
    'rbREMY': ('0x765d0443ed57eb0c89953c3ebf54885189a4aef2', 0.001 / 1e18),
    'rbREMYLS': ('0x9c6661c87a10e712b0a817184230fca4258ccc15', 0.0010437036497607925 / 1e18),
    'wREMY': ('0xed56735245fb156d94e254a061d9e65fd4a5230b', 1 / 1e18),
    'REMY': ('0x9b5e3492bad9b020a81b3a928e789b60e7240da0', 1 / 1e18),
    'fREMY': ('0x66e66f9772c9ea0b38b7cd52820af42ccbb31721', 1 / 1e18),
}
BY_ADDR = {a: k for k, (a, _) in ASSETS.items()}

# Labels for team wallets in the output.
LABELS = {
    '0xe23fa24551d36cffd2859a50e5110befa411e7c6': 'Remy owner',
    '0x07a145dbbc7e425d0f1b3b9982f955e97abad7a2': 'z80.eth',
    '0x70f4b83795af9236da8211cda3b031e503c00970': 'Legacy admin',
    '0x97a90100d77d05e309cdeb7e2aaf91f0ef8ca5ac': 'Deployer',
}
# Wave 1 (2026-09-26) EOA and exploit contract; wave 2 (2026-09-28/29) EOA, which received every NFT itself.
ATTACKER = {'0x28bc445b674940c53c227b45d4405c34e60027ad', '0xc7b9b6f2f2b41f91dc409dc429efb2013774f676',
            '0x81691b7e2936413078c2b16a320412a6014b5053'}
# Remy system contracts; some are small proxies that look like wallets.
PROTOCOL = {
    '0x2eb990a5f9adea7bcaf09fde6261469ad906635c',  # legacy vault (rbREMY)
    '0x858e3a590fbb08fd92f6b0645e75b086dff5a3ad',  # recovery vault (REMY)
    '0x0a3decd55e9dbd9a5a0ed57c9415f837544790a1',  # MigratorRouter
    '0x690e8487b015229c133f4ae6e776b6115473dd6f',  # old router
    '0xd91368768ea898c9bc09d85b13c0924b59405d1c',  # NFTVault
    '0x12d22fb38a4d5b7dd7b3b951f5342e943744e9fb',  # legacy converter
    '0x957ca7472ced1c1b3608152f83e0e69f975a37a9',  # Remy router
    '0x7c5f5a4bbd8fd63184577525326123b519429bdc',  # Uniswap v4 PositionManager
    '0x498581ff718922c3f8e6a244956af099b2652b2b',  # Uniswap v4 PoolManager
    '0x4bfa9df6f8ceef97c9808c44a1c2b4be2d4525ab',  # RemyReclaim (wave 1)
    '0xacdf2c2bccda8e13c1ec979e32ad2628f4eb4de6',  # RemyReclaim (wave 2)
}
# Contracts that hold for users: Safe proxies and minimal-proxy smart wallets (EIP-1167 runtime is 45 bytes).
WALLET_MAX_CODE = 200

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / '.cache' / 'participants'
# RemyReclaim per theft wave and its owed file: stolen NFT ids and their victims (one row per NFT).
DATA = ROOT / 'data'
RECLAIMS = {'0x4bfa9df6f8ceef97c9808c44a1c2b4be2d4525ab': DATA / 'owed.json',
            '0xacdf2c2bccda8e13c1ec979e32ad2628f4eb4de6': DATA / 'owed-2.json'}


def post(body, timeout=90):
    req = urllib.request.Request(RPC, data=json.dumps(body).encode(),
                                 headers={'content-type': 'application/json', 'user-agent': 'remy-participants/1'})
    try:
        return json.load(urllib.request.urlopen(req, timeout=timeout))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        return {'error': str(e)}


def batched(calls):
    """Run up to 10 JSON-RPC calls per request; retry the ones that fail. Returns results in order (None = reverted)."""
    out = {}
    for attempt in range(40):
        todo = [i for i in range(len(calls)) if i not in out]
        if not todo:
            return [out[i] for i in range(len(calls))]
        r = post([{'jsonrpc': '2.0', 'id': i, **calls[i]} for i in todo])
        if isinstance(r, list):
            for x in r:
                if 'result' in x:
                    out[x['id']] = x['result']
                elif x.get('error', {}).get('code') == 3:  # execution reverted: final, not transient
                    out[x['id']] = None
        time.sleep(min(20, 0.5 + attempt))
    raise RuntimeError(f'RPC kept failing: {r}')


TRANSFERS = ('', {'address': [a for a, _ in ASSETS.values()], 'topics': [TRANSFER]})
POOL_MODS = ('lp-', {'address': POOL_MANAGER, 'topics': [MODIFY_LIQUIDITY, POOL_ID]})


def fetch_group(g, head, kind):
    """Logs matching `kind` in [g, g + GROUP), cached once the group is fully below head."""
    prefix, flt = kind
    f = CACHE / 'logs' / f'{prefix}{g}.json'
    if f.exists():
        return json.loads(f.read_text())
    end = min(g + GROUP - 1, head)
    starts = range(g, end + 1, 500)
    res = batched([{'method': 'eth_getLogs', 'params': [{
        **flt, 'fromBlock': hex(s), 'toBlock': hex(min(s + 499, end))}]} for s in starts])
    logs = [l for part in res for l in part]
    if end == g + GROUP - 1:
        f.write_text(json.dumps(logs))
    return logs


def fetch_logs(head, kind=TRANSFERS, since=START):
    (CACHE / 'logs').mkdir(parents=True, exist_ok=True)
    groups = [g for g in range(START, head + 1, GROUP) if g + GROUP > since]
    logs = []
    with ThreadPoolExecutor(4) as ex:
        for i, part in enumerate(ex.map(lambda g: fetch_group(g, head, kind), groups), 1):
            logs += part
            if i % 200 == 0:
                print(f'  logs: {i}/{len(groups)} groups', flush=True)
    logs.sort(key=lambda l: (int(l['blockNumber'], 16), int(l['logIndex'], 16)))
    return logs


def eth_calls(to, datas, head):
    """eth_call `to` with each calldata at head, 10 per batch. Returns hex results in order."""
    out = []
    for i in range(0, len(datas), 10):
        out += batched([{'method': 'eth_call', 'params': [{'to': to, 'data': d}, hex(head)]} for d in datas[i:i + 10]])
    return out


def word(x):
    return format(int(x, 16) if isinstance(x, str) else x, '064x')


def lp_remys(mods, head):
    """Remy equivalents per owner of live fREMY/ETH positions minted through PositionManager (ETH at pool price)."""
    ids = sorted({int(l['data'][2 + 64 * 3:2 + 64 * 4], 16) for l in mods if l['topics'][2][-40:] == POSITION_MANAGER[2:]})
    sqrt_p = int(eth_calls(STATE_VIEW, [SEL['getSlot0'] + POOL_ID[2:]], head)[0][2:66], 16) / 2 ** 96
    infos = eth_calls(POSITION_MANAGER, [SEL['getPoolAndPositionInfo'] + word(i) for i in ids], head)
    liqs = eth_calls(POSITION_MANAGER, [SEL['getPositionLiquidity'] + word(i) for i in ids], head)
    owners = eth_calls(POSITION_MANAGER, [SEL['ownerOf'] + word(i) for i in ids], head)
    int24 = lambda v: (v & 0xffffff) - (0x1000000 if v & 0x800000 else 0)
    out = defaultdict(float)
    for info, liq, owner in zip(infos, liqs, owners):
        # PositionInfo (6th word): | 200 bits poolId prefix | 24 tickUpper | 24 tickLower | 8 hasSubscriber |
        if None in (info, liq, owner) or int(owner, 16) == 0 or int(liq, 16) == 0:
            continue  # burned or emptied
        packed = int(info[2 + 64 * 5:2 + 64 * 6], 16)
        liquidity = int(liq, 16)
        if packed >> 56 != int(POOL_ID, 16) >> 56:
            continue
        sa, sb = 1.0001 ** (int24(packed >> 8) / 2), 1.0001 ** (int24(packed >> 32) / 2)
        p = min(max(sqrt_p, sa), sb)
        eth, fremy = liquidity * (1 / p - 1 / sb), liquidity * (p - sa)  # currency0 = ETH, currency1 = fREMY
        out['0x' + owner[-40:]] += (fremy + eth * sqrt_p ** 2) / 1e18  # ETH per fREMY = 1 / sqrtP^2
    return out


def owed_victims():
    """Stolen NFTs per victim, per RemyReclaim wave."""
    return {r: Counter(v.lower() for v in json.loads(f.read_text())['victims']) for r, f in RECLAIMS.items()}


def reclaim_owed(waves, head):
    """Stolen Remy Boys each wave's RemyReclaim has yet to re-mint, per victim (a wave not deployed yet owes all)."""
    out = Counter()
    for reclaim, owed in waves.items():
        victims = sorted(owed)
        claimed = eth_calls(reclaim, [SEL['claimed'] + word(v) for v in victims], head)
        for v, c in zip(victims, claimed):
            left = owed[v] - (int(c, 16) if c and c != '0x' else 0)
            if left:
                out[v] += left
    return out


def code_sizes(addrs, head):
    """Bytecode length per address (0 = EOA). EIP-7702 delegated EOAs (0xef0100 prefix) count as EOAs."""
    f = CACHE / 'codes.json'
    known = json.loads(f.read_text()) if f.exists() else {}
    todo = [a for a in addrs if a not in known]
    for i in range(0, len(todo), 10):
        part = todo[i:i + 10]
        for a, code in zip(part, batched([{'method': 'eth_getCode', 'params': [a, hex(head)]} for a in part])):
            known[a] = -1 if code.startswith('0xef0100') else (len(code) - 2) // 2
    f.write_text(json.dumps(known))
    return known


def iso(block):
    return datetime.fromtimestamp(GENESIS_TS + 2 * block, timezone.utc).strftime('%Y-%m-%d')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--min-hold-days', type=float, default=7)
    ap.add_argument('--tiers', default='10,5,3,2',
                    help='Remys-held floors of tiers 1-4, descending; tier 5 is everything below the last floor')
    ap.add_argument('--out', type=pathlib.Path)
    args = ap.parse_args()
    floors = [float(x) for x in args.tiers.split(',')]
    if len(floors) != 4 or floors != sorted(floors, reverse=True):
        ap.error('--tiers takes 4 descending floors (tiers 1-4)')

    head = int(batched([{'method': 'eth_blockNumber', 'params': []}])[0], 16)
    print(f'head {head}; scanning Transfer logs from {START}', flush=True)
    logs = fetch_logs(head)
    mods = fetch_logs(head, POOL_MODS, POOL_START)
    lp_txs = {l['transactionHash'] for l in mods}
    waves = owed_victims()
    victims = sum(waves.values(), Counter())
    unminted = Counter()  # stolen NFTs not yet re-minted by RemyReclaim, per victim

    bal = defaultdict(float)  # Remy equivalents in the wallet
    eq = defaultdict(float)  # bal plus Remys in fREMY/ETH positions or owed after the theft; drives hold streaks
    raw = defaultdict(Counter)
    a_in, a_out, minted = defaultdict(Counter), defaultdict(Counter), Counter()
    first, last, txs = {}, {}, defaultdict(set)
    span_start, longest, held, peak = {}, Counter(), Counter(), defaultdict(float)

    def move(addr, block, tx, delta, still_held):
        first.setdefault(addr, block)
        last[addr] = block
        txs[addr].add(tx)
        bal[addr] += delta
        if still_held:
            return
        was = eq[addr] >= DUST
        eq[addr] += delta
        peak[addr] = max(peak[addr], eq[addr])
        now = eq[addr] >= DUST
        if now and not was:
            span_start[addr] = block
        elif was and not now:
            d = block - span_start.pop(addr)
            longest[addr] = max(longest[addr], d)
            held[addr] += d

    for l in logs:
        key = BY_ADDR[l['address'].lower()]
        block, tx = int(l['blockNumber'], 16), l['transactionHash']
        src, dst = '0x' + l['topics'][1][-40:], '0x' + l['topics'][2][-40:]
        ratio = ASSETS[key][1]
        amount = 1 if ratio is None else int(l['data'], 16)
        value = 1.0 if ratio is None else amount * ratio
        # Value that stays the wallet's: LP adds/removes, NFTs stolen by the attacker, and their re-mints.
        still_held = tx in lp_txs and POOL_MANAGER in (src, dst)
        if key == 'remyBoys' and dst in ATTACKER and victims[src]:
            unminted[src] += 1
            still_held = True
        if key == 'remyBoys' and src == ZERO and unminted[dst]:
            unminted[dst] -= 1
            still_held = True
        if src == ZERO:
            if key == 'remyBoys':
                minted[dst] += 1
        else:
            a_out[src][key] += 1
            raw[src][key] -= amount
            move(src, block, tx, -value, still_held)
        if dst != ZERO:
            a_in[dst][key] += 1
            raw[dst][key] += amount
            move(dst, block, tx, value, still_held)
    for addr, s in span_start.items():
        longest[addr] = max(longest[addr], head - s)
        held[addr] += head - s

    print(f'{len(logs)} transfers, {len(mods)} LP changes; reading positions, reclaim and bytecode', flush=True)
    lp = lp_remys(mods, head)
    owed = reclaim_owed(waves, head)
    addrs = sorted(set(first) | set(lp) | set(owed))
    sizes = code_sizes(addrs, head)

    min_hold = args.min_hold_days * BLOCKS_PER_DAY
    reasons = Counter()
    rows = []
    for addr in addrs:
        size = sizes[addr]
        wallet = max(bal[addr], 0)
        total = wallet + lp[addr] + owed.get(addr, 0)
        if addr in ATTACKER:
            reasons['attacker'] += 1
            continue
        if addr in PROTOCOL or addr in BY_ADDR or size > WALLET_MAX_CODE:
            reasons['protocol / marketplace contract'] += 1
            continue
        if total < DUST:
            reasons['dumper (holds nothing now: wallet, LP or reclaim)'] += 1
            continue
        if longest[addr] < min_hold:
            reasons[f'sniper (never held {args.min_hold_days:g}d in one stretch)'] += 1
            continue
        rows.append({
            'address': addr,
            'label': LABELS.get(addr, ''),
            'wallet': 'eoa' if size == 0 else ('eoa-7702' if size == -1 else 'smart-wallet'),
            'tier': 1 + sum(total < f for f in floors),
            'remys_now': round(total, 4),
            'wallet_remys': round(wallet, 4),
            'lp_remys': round(lp[addr], 4),
            'reclaim_owed': owed.get(addr, 0),
            'nfts_now': raw[addr]['remyBoys'],
            **{f'{k}_now': raw[addr][k] / 1e18 for k in ASSETS if k != 'remyBoys'},
            'peak_remys': round(max(peak[addr], total), 4),
            'longest_hold_days': round(longest[addr] / BLOCKS_PER_DAY, 1),
            'total_hold_days': round(held[addr] / BLOCKS_PER_DAY, 1),
            'minted': minted[addr],
            'transfers_in': sum(a_in[addr].values()),
            'transfers_out': sum(a_out[addr].values()),
            'txs': len(txs[addr]),
            'first_seen': iso(first[addr]) if addr in first else '',
            'last_seen': iso(last[addr]) if addr in last else '',
        })
    rows.sort(key=lambda r: (r['tier'], -r['remys_now'], -r['longest_hold_days']))

    out = args.out or CACHE / f'remy-participants-{head}.csv'
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open('w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    print(f'\nkept {len(rows)} of {len(addrs)}')
    bounds = [float('inf')] + floors + [0]
    for t in range(1, len(floors) + 2):
        tr = [r for r in rows if r['tier'] == t]
        lo, hi = bounds[t], bounds[t - 1]
        span = f'>= {lo:g}' if t == 1 else (f'< {hi:g}' if t == len(floors) + 1 else f'{lo:g}-{hi:g}')
        print(f'  tier {t} ({span} Remys): {len(tr)} wallets, {sum(r["remys_now"] for r in tr):.2f} Remys')
    staked = sum(1 for r in rows if r['lp_remys'] or r['reclaim_owed'])
    print(f'  {staked} kept wallets count LP positions or reclaim-owed NFTs')
    for why, n in reasons.most_common():
        print(f'dropped {n}: {why}')
    print(f'wrote {out}')


if __name__ == '__main__':
    main()
