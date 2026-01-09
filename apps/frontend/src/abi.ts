export const AnchorRegistryAbi = [
  {
    "inputs": [{ "internalType": "bytes32", "name": "hash", "type": "bytes32" }],
    "name": "anchor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "hash", "type": "bytes32" }],
    "name": "isAnchored",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "hash", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "submitter", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "Anchored",
    "type": "event"
  }
] as const;
