import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useRef, useState } from 'react'
import { BigNumber } from '@uniswap/sdk'

import { useWeb3React } from '../hooks'
import { safeAccess, isAddress, getEtherBalance, getTokenBalance } from '../utils'
import { useBlockNumber } from './Application'
import { useTokenDetails, useAllTokenDetails } from './Tokens'
import { getUSDPrice } from '../utils/price'

const UPDATE = 'UPDATE'
const UPDATE_ALL_FOR_ACCOUNT = 'UPDATE_ALL_FOR_ACCOUNT'
const UPDATE_ALL_FOR_EXCHANGES = 'UPDATE_ALL_FOR_EXCHANGES'

const BalancesContext = createContext()

function useBalancesContext() {
  return useContext(BalancesContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE: {
      const { networkId, address, tokenAddress, value, blockNumber } = payload
      return {
        ...state,
        [networkId]: {
          ...(safeAccess(state, [networkId]) || {}),
          [address]: {
            ...(safeAccess(state, [networkId, address]) || {}),
            [tokenAddress]: {
              value,
              blockNumber
            }
          }
        }
      }
    }
    case UPDATE_ALL_FOR_ACCOUNT: {
      const { networkId, address, tokenAddresses, values } = payload
      return {
        ...state,
        [networkId]: {
          ...(safeAccess(state, [networkId]) || {}),
          [address]: {
            ...tokenAddresses.reduce((accumulator, currentValue, i) => {
              accumulator[currentValue] = { value: values[i] }
              return accumulator
            }, {}),
            ...(safeAccess(state, [networkId, address]) || {})
          }
        }
      }
    }
    case UPDATE_ALL_FOR_EXCHANGES: {
      const { networkId, exchangeAddresses, tokenAddresses, values } = payload
      return {
        ...state,
        [networkId]: {
          ...(safeAccess(state, [networkId]) || {}),
          ...exchangeAddresses.reduce((accumulator, currentValue, i) => {
            accumulator[currentValue] = {
              ...safeAccess(state, [networkId, currentValue]),
              [tokenAddresses[i]]: {
                value: values[i]
              }
            }
            return accumulator
          }, {})
        }
      }
    }
    default: {
      throw Error(`Unexpected action type in BalancesContext reducer: '${type}'.`)
    }
  }
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, {})

  const update = useCallback((networkId, address, tokenAddress, value, blockNumber) => {
    dispatch({ type: UPDATE, payload: { networkId, address, tokenAddress, value, blockNumber } })
  }, [])

  const updateAllForAccount = useCallback((networkId, address, tokenAddresses, values) => {
    dispatch({ type: UPDATE_ALL_FOR_ACCOUNT, payload: { networkId, address, tokenAddresses, values } })
  }, [])

  const updateAllForExchanges = useCallback((networkId, exchangeAddresses, tokenAddresses, values) => {
    dispatch({ type: UPDATE_ALL_FOR_EXCHANGES, payload: { networkId, exchangeAddresses, tokenAddresses, values } })
  }, [])

  return (
    <BalancesContext.Provider
      value={useMemo(() => [state, { update, updateAllForAccount, updateAllForExchanges }], [
        state,
        update,
        updateAllForAccount,
        updateAllForExchanges
      ])}
    >
      {children}
    </BalancesContext.Provider>
  )
}

const STAGGER_TIME = 2500
export function Updater() {
  const { library, chainId, account } = useWeb3React()

  const allTokens = useAllTokenDetails()

  const [state, { updateAllForAccount, updateAllForExchanges }] = useBalancesContext()
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const getData = async () => {
      if (chainId && library && account) {
        // get 1 eth + all token balances for the account
        Promise.all(
          Object.keys(allTokens).map(async tokenAddress => {
            await new Promise(resolve => setTimeout(resolve, STAGGER_TIME * Math.random()))

            const { value: existingValue } = safeAccess(stateRef.current, [chainId, account, tokenAddress]) || {}
            return (
              existingValue ||
              (await (tokenAddress === 'ETH'
                ? getEtherBalance(account, library).catch(() => null)
                : getTokenBalance(tokenAddress, account, library).catch(() => null)))
            )
          })
        ).then(balances => {
          updateAllForAccount(chainId, account, Object.keys(allTokens), balances)
        })

        const allTokensWithAnExchange = Object.keys(allTokens).filter(tokenAddress => tokenAddress !== 'ETH')
        // get all eth balances for all exchanges
        Promise.all(
          allTokensWithAnExchange.map(async tokenAddress => {
            await new Promise(resolve => setTimeout(resolve, STAGGER_TIME * Math.random()))

            const exchangeAddress = allTokens[tokenAddress].exchangeAddress
            const { value: existingValue } = safeAccess(stateRef.current, [chainId, exchangeAddress, 'ETH']) || {}
            return existingValue || (await getEtherBalance(exchangeAddress, library).catch(() => null))
          })
        ).then(ethBalances => {
          updateAllForExchanges(
            chainId,
            allTokensWithAnExchange.map(tokenAddress => allTokens[tokenAddress].exchangeAddress),
            Array(allTokensWithAnExchange.length).fill('ETH'),
            ethBalances
          )
        })

        // get all token balances for all exchanges
        Promise.all(
          allTokensWithAnExchange.map(async tokenAddress => {
            await new Promise(resolve => setTimeout(resolve, STAGGER_TIME * Math.random()))

            const exchangeAddress = allTokens[tokenAddress].exchangeAddress
            const { value: existingValue } =
              safeAccess(stateRef.current, [chainId, exchangeAddress, tokenAddress]) || {}
            return existingValue || (await getTokenBalance(tokenAddress, exchangeAddress, library).catch(() => null))
          })
        ).then(tokenBalances => {
          updateAllForExchanges(
            chainId,
            allTokensWithAnExchange.map(tokenAddress => allTokens[tokenAddress].exchangeAddress),
            allTokensWithAnExchange.map(tokenAddress => tokenAddress),
            tokenBalances
          )
        })
      }
    }

    getData()
  }, [chainId, library, account, allTokens, updateAllForAccount, updateAllForExchanges])

  return null
}

export function useAllBalances() {
  const { chainId } = useWeb3React()
  const [state] = useBalancesContext()
  const balances = safeAccess(state, [chainId]) || {}
  return balances
}

export function useAddressBalance(address, tokenAddress) {
  const { library, chainId } = useWeb3React()

  const globalBlockNumber = useBlockNumber()

  const [state, { update }] = useBalancesContext()
  const { value, blockNumber } = safeAccess(state, [chainId, address, tokenAddress]) || {}

  useEffect(() => {
    if (
      isAddress(address) &&
      (tokenAddress === 'ETH' || isAddress(tokenAddress)) &&
      (value === undefined || blockNumber !== globalBlockNumber) &&
      (chainId || chainId === 0) &&
      library
    ) {
      let stale = false
      ;(tokenAddress === 'ETH' ? getEtherBalance(address, library) : getTokenBalance(tokenAddress, address, library))
        .then(value => {
          if (!stale) {
            update(chainId, address, tokenAddress, value, globalBlockNumber)
          }
        })
        .catch(() => {
          if (!stale) {
            update(chainId, address, tokenAddress, null, globalBlockNumber)
          }
        })
      return () => {
        stale = true
      }
    }
  }, [address, tokenAddress, value, blockNumber, globalBlockNumber, chainId, library, update])

  return value
}

export function useExchangeReserves(tokenAddress) {
  const { exchangeAddress } = useTokenDetails(tokenAddress)

  const reserveETH = useAddressBalance(exchangeAddress, 'ETH')
  const reserveToken = useAddressBalance(exchangeAddress, tokenAddress)

  return { reserveETH, reserveToken }
}

const buildReserveObject = (chainId, tokenAddress, ethReserveAmount, tokenReserveAmount, decimals) => ({
  token: {
    chainId,
    address: tokenAddress,
    decimals
  },
  ethReserve: {
    token: {
      chainId,
      decimals: 18
    },
    amount: ethReserveAmount
  },
  tokenReserve: {
    token: {
      chainId,
      address: tokenAddress,
      decimals
    },
    amount: tokenReserveAmount
  }
})
const daiTokenAddress = '0x0d86fca9be034a363cf12c9834af08d54a10451c'
const daiExchangeAddress = '0x9ec155Df512ab8496Ef05A2F2553d9F18C724B5d'
const usdcTokenAddress = '0xCb46C0DdC60d18eFEB0e586c17AF6Ea36452DaE0' //DOC
const usdcExchangeAddress = '0xA951C44c77e1FE4672a370E04fF4C6019B77697d' //DOC
const tusdTokenAddress = '0x0a8d098e31A60DA2b9c874d97dE6e6B385C28E9D'
const tusdExchangeAddress = '0xc2Cf487cB2A18E866f13436AC137a671fF4b1A7e'
export function useETHPriceInUSD() {
  const { chainId } = useWeb3React()

  let daiReserveETH = useAddressBalance(daiExchangeAddress, 'ETH')
  let daiReserveToken = useAddressBalance(daiExchangeAddress, daiTokenAddress)
  let usdcReserveETH = useAddressBalance(usdcExchangeAddress, 'ETH')
  let usdcReserveToken = useAddressBalance(usdcExchangeAddress, usdcTokenAddress)
  let tusdReserveETH = useAddressBalance(tusdExchangeAddress, 'ETH')
  let tusdReserveToken = useAddressBalance(tusdExchangeAddress, tusdTokenAddress)

  const [price, setPrice] = useState()
  useEffect(() => {
    if (daiReserveETH && daiReserveToken && usdcReserveETH && usdcReserveToken && tusdReserveETH && tusdReserveToken) {
      const daiReservesObject = buildReserveObject(
        chainId,
        daiTokenAddress,
        new BigNumber(daiReserveETH.toString()),
        new BigNumber(daiReserveToken.toString()),
        18
      )
      const tusdReservesObject = buildReserveObject(
        chainId,
        tusdTokenAddress,
        new BigNumber(tusdReserveETH.toString()),
        new BigNumber(tusdReserveToken.toString()),
        18
      )
      const usdcReservesObject = buildReserveObject(
        chainId,
        usdcTokenAddress,
        new BigNumber(usdcReserveETH.toString()),
        new BigNumber(usdcReserveToken.toString()),
        6
      )

      const stablecoinReserves = [daiReservesObject, usdcReservesObject, tusdReservesObject]

      try {
        setPrice(getUSDPrice(stablecoinReserves))
      } catch {
        setPrice(null)
      }
    }
  }, [daiReserveETH, daiReserveToken, usdcReserveETH, usdcReserveToken, tusdReserveETH, tusdReserveToken, chainId])

  return price
}
