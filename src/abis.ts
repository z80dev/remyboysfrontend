import { parseAbi } from 'viem'

export const remyAbi = parseAbi([
  'function owner() view returns (address)',
  'function is_minter(address) view returns (bool)',
  'function set_minter(address minter, bool status)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
  'function tokenURI(uint256) view returns (string)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved)',
])

export const reclaimAbi = parseAbi([
  'function owed(address victim) view returns (uint256[])',
  'function claimed(address victim) view returns (uint256)',
  'function remaining(address victim) view returns (uint256)',
  'function claim(uint256 maxCount)',
  'error ApprovalStillActive()',
  'error NothingToClaim()',
  'event Reclaimed(address indexed victim, uint256 indexed originalId)',
])

export const erc20Abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function totalSupply() view returns (uint256)',
])

export const stakedAbi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function previewRedeem(uint256 shares) view returns (uint256)',
  'function unlocked_shares(address) view returns (uint256)',
  'function locks(address) view returns (uint256)',
  'function TIME_LOCK() view returns (uint256)',
])

export const vaultAbi = parseAbi([
  'function deposit(uint256[] ids, address recipient)',
  'function redeem(uint256[] ids, address recipient)',
  'function inventory(uint256) view returns (bool)',
  'function blocked(uint256) view returns (bool)',
  'function inventoryCount() view returns (uint256)',
  'function reserve() view returns (uint256)',
  'function floor() view returns (address)',
  'function collection() view returns (address)',
  'function maxBatch() view returns (uint256)',
  'error Blocked(uint256 id)',
  'error InvalidOperation()',
  'error ReserveDeficit()',
  'error ConversionLocked(uint256 opensAt)',
])

export const converterAbi = parseAbi([
  'function convertRbRemy(uint256 amount, address recipient) returns (uint256)',
  'function convertStaked(uint256 shares, address recipient) returns (uint256)',
  'function convertWrapped(uint256 count, address recipient) returns (uint256)',
  'function previewRbRemy(uint256 amount) view returns (uint256)',
  'function previewStaked(uint256 shares) view returns (uint256)',
  'function maxRbRemyPerCall() view returns (uint256)',
  'function maxStakedPerCall() view returns (uint256)',
  'function paused() view returns (bool)',
  'error BatchTooLarge()',
])

export const routerAbi = parseAbi([
  'function buyNFTs(uint256[] ids, address recipient, uint256 deadline) payable',
  'function sellNFTs(uint256[] ids, uint256 minEthOut, address recipient, uint256 deadline)',
  'function buyFloor(uint256 amountOut, address recipient, uint256 deadline) payable',
  'function sellFloor(uint256 amountIn, uint256 minEthOut, address recipient, uint256 deadline)',
  'function poolKey() view returns ((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks))',
])

export const stateViewAbi = parseAbi([
  'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
  'function getLiquidity(bytes32 poolId) view returns (uint128)',
])

// The V4Quoter functions are non-view (they revert internally), but are meant to be eth_call'ed.
// Declared `view` here so they can be used with readContract.
export const quoterAbi = parseAbi([
  'struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }',
  'struct QuoteExactSingleParams { PoolKey poolKey; bool zeroForOne; uint128 exactAmount; bytes hookData; }',
  'function quoteExactInputSingle(QuoteExactSingleParams params) view returns (uint256 amountOut, uint256 gasEstimate)',
  'function quoteExactOutputSingle(QuoteExactSingleParams params) view returns (uint256 amountIn, uint256 gasEstimate)',
])
