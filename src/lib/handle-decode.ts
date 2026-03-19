/**
 * Decode Solidity type, chain ID, and version from a 32-byte handle.
 *
 * Handle layout (32 bytes):
 *   [0-25]  Prehandle (26 random bytes)
 *   [26-29] Chain ID (4 bytes, big-endian uint32)
 *   [30]    Type code (1 byte)
 *   [31]    Version (1 byte)
 *
 * Type codes (index in SOLIDITY_TYPES):
 *   0-3:   Special (bool, address, bytes, string)
 *   4-35:  uint8..uint256 (step 8)
 *   36-67: int8..int256 (step 8)
 *   68-99: bytes1..bytes32
 */

const SOLIDITY_TYPES = [
  'bool',
  'address',
  'bytes',
  'string',
  'uint8',
  'uint16',
  'uint24',
  'uint32',
  'uint40',
  'uint48',
  'uint56',
  'uint64',
  'uint72',
  'uint80',
  'uint88',
  'uint96',
  'uint104',
  'uint112',
  'uint120',
  'uint128',
  'uint136',
  'uint144',
  'uint152',
  'uint160',
  'uint168',
  'uint176',
  'uint184',
  'uint192',
  'uint200',
  'uint208',
  'uint216',
  'uint224',
  'uint232',
  'uint240',
  'uint248',
  'uint256',
  'int8',
  'int16',
  'int24',
  'int32',
  'int40',
  'int48',
  'int56',
  'int64',
  'int72',
  'int80',
  'int88',
  'int96',
  'int104',
  'int112',
  'int120',
  'int128',
  'int136',
  'int144',
  'int152',
  'int160',
  'int168',
  'int176',
  'int184',
  'int192',
  'int200',
  'int208',
  'int216',
  'int224',
  'int232',
  'int240',
  'int248',
  'int256',
  'bytes1',
  'bytes2',
  'bytes3',
  'bytes4',
  'bytes5',
  'bytes6',
  'bytes7',
  'bytes8',
  'bytes9',
  'bytes10',
  'bytes11',
  'bytes12',
  'bytes13',
  'bytes14',
  'bytes15',
  'bytes16',
  'bytes17',
  'bytes18',
  'bytes19',
  'bytes20',
  'bytes21',
  'bytes22',
  'bytes23',
  'bytes24',
  'bytes25',
  'bytes26',
  'bytes27',
  'bytes28',
  'bytes29',
  'bytes30',
  'bytes31',
  'bytes32',
] as const;

export interface HandleInfo {
  solidityType: string;
  chainId: number;
  version: number;
  unique: boolean;
}

export function decodeHandle(handle: string): HandleInfo | null {
  const hex = handle.startsWith('0x') ? handle.slice(2) : handle;
  if (hex.length !== 64) return null;

  const typeCode = parseInt(hex.slice(10, 12), 16); // byte 5
  const attributeCode = parseInt(hex.slice(12, 14), 16); // byte 6
  const chainId = parseInt(hex.slice(2, 10), 16); // bytes 1-4
  const version = parseInt(hex.slice(0, 2), 16); // byte 0

  const solidityType = SOLIDITY_TYPES[typeCode] ?? `unknown(${typeCode})`;
  const unique = attributeCode === 1; // byte 6

  return { solidityType, chainId, version, unique };
}
