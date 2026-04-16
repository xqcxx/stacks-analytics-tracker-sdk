# analytics-sdk-xqcxx

TypeScript SDK for interacting with the `analytics-tracker` Clarity contract on Stacks.

## Install

```bash
npm install analytics-sdk-xqcxx
```

## Features

- Typed builders for all public contract functions.
- Read-only helper for `get-contract-info`.
- Validation that mirrors contract argument limits.
- Support for Stacks network object or API URL.

## Quick Start

```ts
import {
  buildTrackPageViewTx,
  broadcastAnalyticsTx,
  getContractInfo,
} from "analytics-sdk-xqcxx";

const network = "https://api.mainnet.hiro.so";

const tx = await buildTrackPageViewTx({
  network,
  senderKey: process.env.STACKS_PRIVATE_KEY!,
  contractAddress: "SP123...",
  projectId: "demo-project",
  page: "/pricing",
});

const broadcast = await broadcastAnalyticsTx(tx, network);
console.log(broadcast);

const info = await getContractInfo({
  network,
  contractAddress: "SP123...",
  senderAddress: "SP123...",
});

console.log(info);
```

## API

- `buildTrackPageViewTx(input)`
- `buildTrackActionTx(input)`
- `buildTrackConversionTx(input)`
- `buildTrackCustomEventTx(input)`
- `broadcastAnalyticsTx(tx, network)`
- `getContractInfo(input)`
