 # Twin Network Setup for Testing OL Explorer

This guide explains how to set up a containerized twin network from Libra mainnet for testing the OL Explorer.

## What is a Twin Network?

A twin network is a local copy of the Libra blockchain that mirrors the mainnet, providing a consistent and reliable environment for testing. It allows you to run tests against a known state of the blockchain, with predetermined accounts and transactions.

## Setup Options

### Option 1: Using Docker (Recommended)

This is the simplest approach and is used in our CI pipeline.

#### Prerequisites
- Docker
- Docker Compose (optional)

#### Steps

1. Build the Docker image:
   ```bash
   docker build -t libra-twin-network -f Dockerfile.testnet .
   ```

2. Run the container:
   ```bash
   docker run -d -p 34597:34597 --name libra-twin-network libra-twin-network
   ```

3. Wait for the twin network to be available:
   ```bash
   timeout 300 bash -c 'until curl -s http://127.0.0.1:34597/v1 > /dev/null; do sleep 5; done'
   ```

Alternatively, use Docker Compose:
```bash
docker-compose -f docker-compose.testnet.yml up -d
```

### Option 2: Manual Setup

For more control or when Docker is not available, you can set up the twin network manually.

#### Prerequisites
- Rust and Cargo
- Git
- jq (for monitoring)

#### Steps

```bash
cd $HOME
rm -rf ./libra-framework
git clone https://github.com/0o-de-lally/libra-framework
cd ./libra-framework
git checkout release-8.0.0-rc.0
sudo bash util/dev_setup.sh

# run the node to catch some blocks
libra config fullnode-init
libra node

# check on blocks while this runs (in another terminal)
watch -n1 'echo "\nConnections:";curl 127.0.0.1:9101/metrics 2> /dev/null | grep "_connections"; echo "\nMainnet Version:"; curl -s https://rpc.openlibra.space:8080/v1 | jq .ledger_version; echo "\nYour Node:"; curl -s localhost:9101/metrics | grep diem_state_sync_version;'

# Once synced, stop the node (Ctrl+C) and prepare the move framework
cd $HOME/libra-framework/framework/
libra move framework release

# create a twin network
cd $HOME/libra-framework/testsuites/twin
DIEM_FORGE_NODE_BIN_PATH=/root/.cargo/bin/libra cargo run -- --db-dir $HOME/.libra/data/db
```

## Using the Twin Network

Once the twin network is running, the RPC endpoint will be available at:
```
http://127.0.0.1:34597/v1
```

### Test Data

The twin network provides a consistent test environment with the following test data:

- Test account: `9A710919B1A1E67EDA335269C0085C91`
- Test transaction: `0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18`

### Running Tests with the Twin Network

Set the following environment variables when running tests:

```bash
# For Jest tests
export LIBRA_RPC_URL=http://127.0.0.1:34597/v1
export TEST_ACCOUNT=9A710919B1A1E67EDA335269C0085C91
export TEST_TRANSACTION=0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18
npm test

# For Cypress tests
export CYPRESS_twinNetworkRpc=http://127.0.0.1:34597/v1
export CYPRESS_testAccount=9A710919B1A1E67EDA335269C0085C91
export CYPRESS_testTransaction=0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18
npm run cypress:run
```

### Using with the Development Server

When running the development server, set the RPC URL to point to the twin network:

```bash
LIBRA_RPC_URL=http://127.0.0.1:34597/v1 npm run web
```

## CI/CD Integration

The CI/CD pipeline has been updated to automatically set up and use the twin network for testing. See `.github/workflows/ci.yml` for details on how this is implemented.

## Troubleshooting

### Docker Container Not Starting

If the Docker container fails to start, check the logs:
```bash
docker logs libra-twin-network
```

### RPC Endpoint Not Responding

If the RPC endpoint is not responding, ensure that the twin network is running:
```bash
# For Docker setup
docker ps | grep libra-twin-network

# For manual setup
ps aux | grep twin
```

### Stopping the Twin Network

To stop the twin network:

```bash
# For Docker setup
docker stop libra-twin-network
docker rm libra-twin-network

# For Docker Compose setup
docker-compose -f docker-compose.testnet.yml down

# For manual setup
# Find the process ID and kill it
ps aux | grep twin
kill <PID>
```