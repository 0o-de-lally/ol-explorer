 # Libra Twin Network Setup for Testing

This document describes how to set up a containerized twin network from Libra mainnet for testing purposes.

## Prerequisites

- Docker installed on your system
- Git
- npm/Node.js for running tests

## Setup Instructions

### Using Docker (Recommended for Tests)

1. Build the Docker image:
   ```
   docker build -t libra-twin-network -f Dockerfile.testnet .
   ```

2. Run the container:
   ```
   docker run -d -p 34597:34597 --name libra-twin-network libra-twin-network
   ```

3. Wait for the twin network to be available (may take a few minutes):
   ```
   timeout 300 bash -c 'until curl -s http://127.0.0.1:34597/v1 > /dev/null; do sleep 5; done'
   ```

4. The twin network RPC will be available at:
   ```
   http://127.0.0.1:34597/v1
   ```

5. For testing, you can use:
   - Test account: `9A710919B1A1E67EDA335269C0085C91`
   - Test transaction: `0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18`

6. When done, stop the container:
   ```
   docker stop libra-twin-network
   ```

### Manual Setup (Alternative)

If you prefer to set up manually without Docker, follow these steps:

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

# check on blocks while this runs
watch -n1 'echo "\nConnections:";curl 127.0.0.1:9101/metrics 2> /dev/null | grep "_connections"; echo "\nMainnet Version:"; curl -s https://rpc.openlibra.space:8080/v1 | jq .ledger_version; echo "\nYour Node:"; curl -s localhost:9101/metrics | grep diem_state_sync_version;'

# stop the node, prepare the move framework
cd $HOME/libra-framework/framework/
libra move framework release

# create a twin network
cd $HOME/libra-framework/testsuites/twin
DIEM_FORGE_NODE_BIN_PATH=/root/.cargo/bin/libra cargo run -- --db-dir $HOME/.libra/data/db &
```

The RPC will be available at http://127.0.0.1:34597/v1

## Running Tests

### Environment Variables

When running tests, set the following environment variables:

```
LIBRA_RPC_URL=http://127.0.0.1:34597/v1
TEST_ACCOUNT=9A710919B1A1E67EDA335269C0085C91
TEST_TRANSACTION=0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18
```

### For Cypress Tests

Cypress environment variables:

```
CYPRESS_twinNetworkRpc=http://127.0.0.1:34597/v1
CYPRESS_testAccount=9A710919B1A1E67EDA335269C0085C91
CYPRESS_testTransaction=0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18
```

## CI Integration

The CI workflow has been updated to automatically set up the twin network for testing. See `.github/workflows/ci.yml` for details.