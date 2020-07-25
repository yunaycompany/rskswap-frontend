# Uniswap RSK Frontend
This is a fork of the Uniswap Protocol adapted to the RSK Network

[![Tests](https://github.com/Think-and-Dev/uniswap-frontend-rsk/workflows/Tests/badge.svg)](https://github.com/Think-and-Dev/uniswap-frontend-rsk/actions?query=workflow%3ATests)
[![Styled With Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)

An open source interface for Uniswap -- a protocol for decentralized exchange of Ethereum tokens.

- Website: [uniswap-rsk.com](https://uniswap-rsk.com/)
- Docs: [uniswap-rsk.com/docs/](https://uniswap-rsk.com/docs/)
- Whitepaper: [Link](https://hackmd.io/C-DvwDSfSxuh-Gd4WKE_ig)

## Accessing the frontend

To access the front end visit [app.uniswap-rsk.com](https://app.uniswap-rsk.com).

## Development

### Install Dependencies

```bash
yarn
```

### Configure Environment (optional)

Copy `.env` to `.env.local` and change the appropriate variables.

### Run

```bash
yarn start
```

To have the frontend default to a different network, make a copy of `.env` named `.env.local`, 
change `REACT_APP_NETWORK_ID` to `"{yourNetworkId}"`, and change `REACT_APP_NETWORK_URL` to e.g. 
`"https://public-node.testnet.rsk"`. 

Note that the front end only works properly on testnets where both 
[Uniswap V2 RSK](https://uniswap-rsk.com/docs/v2/smart-contracts/factory/) and 
[multicall](https://github.com/Think-and-Dev/multicall) are deployed.
The frontend will not work on other networks.

## Contributions

**Please open all pull requests against the `v2-rsk` branch.** 
CI checks will run against all PRs. 
