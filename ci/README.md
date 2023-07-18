# Running Taho extension on a forked Mainnet

## Configuration / running

To run the extension on a forked Mainnet:

1. Configure required environment variables (either by setting them in `../.env`
   or directly in the console):  
   `USE_MAINNET_FORK=true` (needed for building the package)  
   `MAINNET_FORK_CHAIN_ID=1337` (needed for running Hardhat, `1337` is the
   suggested and a default value)  
   `CHAIN_API_URL=<Insert_your_API_URL_here>` (needed for running Hardhat, may
   be e.g. Alchemy or Infura API URL)
   `FORKING_BLOCK=<Insert_forking_block_here>` (needed for running Hardhat, if
   not specified, current block will be used)

2. Run the following commands from root:  
   `yarn install`  
   `yarn start` (or `yarn build`)  
   `cd ci`  
   `yarn install`
   `yarn hardhat node --network hardhat`

3. Unpack `./dist/chrome` to Chrome Extensions.

## What wallet features work / don't work on the `hardhat` network

When run on `1337`:

:heavy_plus_sign: we can use specific block as a start.  
:heavy_plus_sign: we can send txs and do swaps (balances updated)  
:heavy_plus_sign: we can browse NFTs  
:heavy_minus_sign: the activities are not loading
:heavy_minus_sign: wallet shows strange assets  
:heavy_minus_sign: if no cache exists, loading assets takes long, account
avatars may look strange

State of the network is lost after Hardhat reset.

## Running E2E tests on fork

The E2E tests are located in the `../e2e-tests` directory. The tests use
`test.skip` expression, which decides whether a given test should be run based
on the value of a `USE_MAINNET_FORK` environment variable.

To run specific test, go to root and run `npx playwright test <file_name>`.

To run all tests designed for the fork, make sure `USE_MAINNET_FORK` is set to
`true` and run `yarn run test:e2e`.
