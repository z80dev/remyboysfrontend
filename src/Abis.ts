export const VendorAbi = [
  // { "stateMutability": "nonpayable", "type": "constructor", "inputs": [{ "name": "_whitelist_manager", "type": "address" }, { "name": "_nft", "type": "address" }], "outputs": [] },
  // { "stateMutability": "nonpayable", "type": "function", "name": "open_mint", "inputs": [], "outputs": [] },
  // { "stateMutability": "nonpayable", "type": "function", "name": "close_mint", "inputs": [], "outputs": [] },
  { "stateMutability": "view", "type": "function", "name": "quote_mint", "inputs": [{ "name": "amt", "type": "uint256" }], "outputs": [{ "name": "", "type": "uint256" }] },
  { "stateMutability": "payable", "type": "function", "name": "mint_nft", "inputs": [{ "name": "amt", "type": "uint256" }], "outputs": [] },
  { "stateMutability": "view", "type": "function", "name": "mint_open", "inputs": [], "outputs": [{ "name": "", "type": "bool" }] }
] as const

export const NFTAbi = [
  {
    "inputs": [],
    "stateMutability": "view",
    "type": "function",
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ]
  },
  {
    "inputs": [],
    "stateMutability": "view",
    "type": "function",
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ]
  },
] as const
