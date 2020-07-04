import { ChainId, Token } from 'uniswap-sdk-rsk'

export default [
  new Token(ChainId.RSK_MAINNET, '0x2AcC95758f8b5F583470ba265EB685a8F45fC9D5', 18, 'RIF', 'RIF Token'),
  new Token(ChainId.RSK_MAINNET, '0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db', 18, 'DOC', 'Dollar on Chain'),
  new Token(ChainId.RSK_MAINNET, '0x440CD83C160De5C96Ddb20246815eA44C7aBBCa8', 18, 'BITP', 'BitPRO'),
  new Token(ChainId.RSK_MAINNET, '0xE0cfF8a40F540657C62eB4CAC34b915e5Ed8D8Ff', 18, 'INV', 'Invecoin'),
  new Token(ChainId.RSK_MAINNET, '0x6B1A73d547F4009a26B8485B63d7015d248Ad406', 18, 'rDAI', 'Dai Stablecoin')
]
