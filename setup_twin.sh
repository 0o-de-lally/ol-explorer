#!/bin/bash

# check if arugment passed for epoch number otherwise quit
if [ -z "$1" ]; then
    echo "Usage: $0 <epoch_number>"
    exit 1
else
    EPOCH=$1
fi

# README: 
# https://github.com/0o-de-lally/libra-framework/blob/testnet-cli-helpers/tools/testnet/README.md#config-only---configure-the-data-so-you-can-start-nodes-yourself-on-independent-hosts-or-containers

# clone the repo
cd $HOME
rm -rf $HOME/libra-framework
git clone https://github.com/0o-de-lally/libra-framework

# checkout the rc.1 tag and grab dependencies
cd $HOME/libra-framework
git checkout release-8.0.0-rc.1
sudo bash util/dev_setup.sh

# build the libra binary and copy to .cargo/bin
cd $HOME/libra-framework
cargo b --release -p libra 
cp -f target/release/libra ~/.cargo/bin/

# check version
which libra
sleep 3
libra version
sleep 3

# build the framework
export DIEM_FORGE_NODE_BIN_PATH=$HOME/.cargo/bin/libra
cd $HOME/libra-framework/framework/
libra move framework release

# run the twin testnet
libra ops testnet --framework-mrb-path ./releases/head.mrb --twin-epoch-restore=$EPOCH smoke

# if you need to stop the twin network, you can start it back up again with the previous db
libra ops testnet --framework-mrb-path ./releases/head.mrb --twin-reference-db=$HOME/.libra/db_$EPOCH smoke
