import React, { useState } from 'react'
import styled from 'styled-components'
import { isAddress } from '../../utils'
import { useActiveWeb3React } from '../../hooks'
import { WETH, ChainId } from 'uniswap-sdk-rsk'
import EthereumLogo from '../../assets/images/rbtc-logo.png' //import EthereumLogo from '../../assets/images/ethereum-logo.png'
import contractMap from '../../constants/tokens/contract-map.json'
import contractTestnetMap from '../../constants/tokens/contract-testnet-map.json'
const toChecksumAddress = require('rskjs-util').toChecksumAddress

const TOKEN_ICON_API = (address, chainId) => {
  let logo = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`
  if (chainId === ChainId.RSK_MAINNET) {
    const metadata = contractMap[toChecksumAddress(address, chainId)]
    logo = `https://raw.githubusercontent.com/rsksmart/rsk-contract-metadata/master/images/${metadata.logo}`
  }
  if (chainId === ChainId.RSK_TESTNET) {
    const metadata = contractTestnetMap[toChecksumAddress(address, chainId)]
    logo = `https://raw.githubusercontent.com/rsksmart/rsk-testnet-contract-metadata/master/images/${metadata.logo}`
  }
  return logo
}
const BAD_IMAGES = {}

const Image = styled.img<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  background-color: white;
  border-radius: 1rem;
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
`

const Emoji = styled.span<{ size?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ size }) => size};
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  margin-bottom: -4px;
`

const StyledEthereumLogo = styled.img<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
  border-radius: 24px;
`

export default function TokenLogo({
  address,
  size = '24px',
  ...rest
}: {
  address?: string
  size?: string
  style?: React.CSSProperties
}) {
  const [error, setError] = useState(false)
  const { chainId } = useActiveWeb3React()

  // mock rinkeby DAI
  if (chainId === 4 && address === '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735') {
    address = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  }

  let path = ''
  // hard code to show ETH instead of WETH in UI
  if (address === WETH[chainId].address) {
    return <StyledEthereumLogo src={EthereumLogo} size={size} {...rest} />
  } else if (!error && !BAD_IMAGES[address] && isAddress(address)) {
    path = TOKEN_ICON_API(address, chainId)
  } else {
    return (
      <Emoji {...rest} size={size}>
        <span role="img" aria-label="Thinking">
          🤔
        </span>
      </Emoji>
    )
  }

  return (
    <Image
      {...rest}
      // alt={address}
      src={path}
      size={size}
      onError={() => {
        BAD_IMAGES[address] = true
        setError(true)
      }}
    />
  )
}
