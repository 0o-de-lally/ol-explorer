# Touching Your Account on v8 Twin Testnet

## What is "touching" and why is it needed?

On the v8 twin testnet, accounts are **lazy loaded**. This means they require a transaction "touch" in order for the account to properly migrate its state and establish the structure needed for v8 compatibility.

This will be done automatically by any transaction sent for your account on the v8 twin network. However, we wanted to make it easier for users. Please see the instructions below for a simple one-time touch no-op transaction.

## How to Touch Your Account

Once the v8 libra binary is made available, you can touch your account on the v8 twin network by using the commands below.

### Perform a one-time touch on the v8 twin network

```bash
libra txs --url https://twin-rpc.openlibra.space/v1 user touch
```

### Configure your libra client to use the v8 twin RPC persistently

```bash
libra config fix --force-url https://twin-rpc.openlibra.space/v1
```

## Viewing Your Account

After touching your account, you can view it on the twin testnet explorer by searching for your account number:

[https://twin-explorer.openlibra.space/](https://twin-explorer.openlibra.space/)

---

**Note:** Remember that subsequent commands on your libra client will continue using your default RPC unless you persistently set your libra client to the v8 twin RPC as shown above. 