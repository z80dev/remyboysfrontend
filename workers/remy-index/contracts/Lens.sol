// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Never deployed. The indexer runs its runtime code through `eth_call` with a state override at a
/// throwaway address, so one request can read thousands of values and get them back packed (far less JSON to
/// parse than Multicall3's ABI-encoded results).
/// Regenerate `src/lens.ts` with `bun run lens` after editing.
contract Lens {
    /// `ownerOf` over ids `start .. end - 1`, aggregated per owner in an in-memory hash table so the caller gets
    /// one row per holder instead of one per token. `out` packs (owner 20 bytes, count 4 bytes) per holder;
    /// `found` counts existing ids and `maxId` is the highest existing id (0 if none).
    function holders(address nft, uint256 start, uint256 end)
        external
        view
        returns (uint256 found, uint256 maxId, bytes memory out)
    {
        uint256 n = end - start;
        uint256 size = 16;
        while (size < 2 * n) size <<= 1;
        uint256 mask = size - 1;
        uint256[] memory table = new uint256[](size); // (index + 1) << 160 | owner
        address[] memory owners = new address[](n);
        uint256[] memory counts = new uint256[](n);
        uint256 u;
        for (uint256 id = start; id < end; ++id) {
            address owner;
            assembly {
                mstore(0x00, shl(224, 0x6352211e))
                mstore(0x04, id)
                // Yul evaluates arguments right to left: read returndatasize only after the call.
                let ok := staticcall(gas(), nft, 0x00, 0x24, 0x00, 0x20)
                if and(ok, gt(returndatasize(), 31)) {
                    owner := and(mload(0x00), 0xffffffffffffffffffffffffffffffffffffffff)
                }
            }
            if (owner == address(0)) continue;
            found++;
            maxId = id;
            uint256 h = uint256(uint160(owner)) & mask;
            while (true) {
                uint256 slot = table[h];
                if (slot == 0) {
                    owners[u] = owner;
                    counts[u] = 1;
                    table[h] = ((u + 1) << 160) | uint160(owner);
                    u++;
                    break;
                }
                if (address(uint160(slot)) == owner) {
                    counts[(slot >> 160) - 1]++;
                    break;
                }
                h = (h + 1) & mask;
            }
        }
        out = new bytes(u * 24);
        for (uint256 i; i < u; ++i) {
            address o = owners[i];
            uint256 c = counts[i];
            assembly {
                let p := add(add(out, 32), mul(i, 24))
                mstore(p, shl(96, o))
                mstore(add(p, 20), shl(224, c))
            }
        }
    }

    /// `k` words of return data per `targets[i].call(data[i])`, zero-filled when the call fails or returns less.
    function calls(address[] calldata targets, bytes[] calldata data, uint256 k) external view returns (bytes memory out) {
        uint256 n = targets.length;
        uint256 w = k * 32;
        out = new bytes(n * w);
        for (uint256 i; i < n; ++i) {
            (bool ok, bytes memory ret) = targets[i].staticcall(data[i]);
            if (!ok) continue;
            uint256 len = ret.length < w ? ret.length : w;
            assembly {
                mcopy(add(add(out, 32), mul(i, w)), add(ret, 32), len)
            }
        }
    }

    /// `k` words of return data per `target.sel(arg)` call, zero-filled when the call fails or returns less.
    function words(address target, bytes4 sel, uint256[] calldata args, uint256 k)
        external
        view
        returns (bytes memory out)
    {
        uint256 n = args.length;
        uint256 w = k * 32;
        out = new bytes(n * w);
        assembly {
            let p := add(out, 32)
            let cd := mload(0x40)
            mstore(0x40, add(cd, 64))
            mstore(cd, sel)
            for { let i := 0 } lt(i, n) { i := add(i, 1) } {
                mstore(add(cd, 4), calldataload(add(args.offset, mul(i, 32))))
                if staticcall(gas(), target, cd, 36, 0, 0) {
                    let rs := returndatasize()
                    if gt(rs, w) { rs := w }
                    returndatacopy(add(p, mul(i, w)), 0, rs)
                }
            }
        }
    }

    /// Per address: 4-byte code size followed by the first 3 code bytes (EIP-7702 delegations start 0xef0100).
    function codes(address[] calldata addrs) external view returns (bytes memory out) {
        uint256 n = addrs.length;
        out = new bytes(n * 7);
        assembly {
            let p := add(out, 32)
            for { let i := 0 } lt(i, n) { i := add(i, 1) } {
                let a := calldataload(add(addrs.offset, mul(i, 32)))
                let o := add(p, mul(i, 7))
                // write size (4 bytes) then prefix (3 bytes); later iterations overwrite the spill
                mstore(o, shl(224, extcodesize(a)))
                extcodecopy(a, add(o, 4), 0, 3)
            }
        }
    }
}
