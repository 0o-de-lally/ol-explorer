# Twin Network Setup for Testing OL Explorer

This guide explains how to set up a twin network from Libra mainnet for testing the OL Explorer.

## What is a Twin Network?

A twin network is a local copy of the Libra blockchain that mirrors the mainnet, providing a consistent and reliable environment for testing. It allows you to run tests against a known state of the blockchain, with predetermined accounts and transactions.

## Setup Options

### Option 1: Using Docker (Not Ready Yet)

> **Note:** The Docker setup method is not fully implemented yet. We recommend following the manual setup instructions below for the most reliable experience.

Docker-based setup will be available in a future update, which will simplify the process of setting up a twin network for testing.

### Option 2: Manual Setup with setup_twin.sh

For a reliable twin network setup, we provide a shell script that automates the process.

#### Prerequisites
- Rust and Cargo
- Git
- jq (for monitoring)

#### Steps

1. Run the setup script with the desired epoch number to restore from:

```bash
# Make the script executable
chmod +x setup_twin.sh

# Run the script with an epoch number (e.g., 353)
./setup_twin.sh 353
```

The script will:
- Clone the libra-framework repository
- Install dependencies
- Build the libra binary
- Set up the framework
- Start a twin network restoring from the specified epoch

The output will include the RPC endpoint port number that you'll need for connecting to the twin network.

2. If you need to restart the twin network later, the script provides a command for that:

```bash
libra ops testnet --framework-mrb-path ./releases/head.mrb --twin-reference-db=$HOME/.libra/db_353 smoke
```

## Using the Twin Network

Once the twin network is running, the RPC endpoint will be available at:
```
http://127.0.0.1:<PORT>/v1
```
Where `<PORT>` is the port number displayed when running the setup script.

### Test Data

The twin network provides a consistent test environment with the following test data:

- Test account: `9A710919B1A1E67EDA335269C0085C91`
- Test transaction: `0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18`

### Running Tests with the Twin Network

Set the following environment variables when running tests:

```bash
# For Jest tests
export LIBRA_RPC_URL=http://127.0.0.1:<PORT>/v1  # Replace <PORT> with actual port
export TEST_ACCOUNT=9A710919B1A1E67EDA335269C0085C91
export TEST_TRANSACTION=0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18
npm test

# For Cypress tests
export CYPRESS_twinNetworkRpc=http://127.0.0.1:<PORT>/v1  # Replace <PORT> with actual port
export CYPRESS_testAccount=9A710919B1A1E67EDA335269C0085C91
export CYPRESS_testTransaction=0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18
npm run cypress:run
```

### Using with the Development Server

When running the development server, set the RPC URL to point to the twin network:

```bash
LIBRA_RPC_URL=http://127.0.0.1:<PORT>/v1 npm run web
```

## Important: Initialize Test Accounts

Accounts are lazy-loaded in Open Libra, so you need to "touch" them first:

```bash
# If you have a libra-cli-config.yaml (generated when running the testnet):
libra txs --config-path /path/to/libra-cli-config.yaml user touch
```

## Troubleshooting

### RPC Endpoint Not Responding

If the RPC endpoint is not responding, ensure that the twin network is running:

```bash
# Check for running processes
ps aux | grep twin
```

### Stopping the Twin Network

To stop the twin network:

```bash
# Find the process ID and kill it
ps aux | grep twin
kill <PID>
```