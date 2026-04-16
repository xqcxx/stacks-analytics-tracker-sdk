import { createNetwork } from "@stacks/network";
import {
  broadcastTransaction,
  fetchCallReadOnlyFunction,
  makeContractCall,
  stringAsciiCV,
  stringUtf8CV,
  uintCV,
  cvToValue,
} from "@stacks/transactions";
import type {
  ClarityValue,
  PostCondition,
  TxBroadcastResult,
} from "@stacks/transactions";

export type AnalyticsNetwork =
  | string
  | NonNullable<Parameters<typeof makeContractCall>[0]["network"]>;

export interface ContractIdentifier {
  contractAddress: string;
  contractName?: string;
}

interface BaseCallConfig extends ContractIdentifier {
  network: AnalyticsNetwork;
}

interface BaseTxConfig extends BaseCallConfig {
  senderKey: string;
  fee?: bigint;
  nonce?: bigint;
  postConditions?: PostCondition[];
}

export interface TrackPageViewInput extends BaseTxConfig {
  projectId: string;
  page: string;
}

export interface TrackActionInput extends BaseTxConfig {
  projectId: string;
  action: string;
  target: string;
}

export interface TrackConversionInput extends BaseTxConfig {
  projectId: string;
  conversionType: string;
  value: bigint;
}

export interface TrackCustomEventInput extends BaseTxConfig {
  projectId: string;
  eventType: string;
  payload: string;
}

export interface GetContractInfoInput extends BaseCallConfig {
  senderAddress: string;
}

export interface ContractInfo {
  contract: string;
  version: string;
  stateless: boolean;
}

const DEFAULT_CONTRACT_NAME = "analytics-tracker";

function resolveContractName(contractName?: string): string {
  return contractName || DEFAULT_CONTRACT_NAME;
}

function resolveNetwork(network: AnalyticsNetwork) {
  if (typeof network === "string") {
    return createNetwork({
      network: "mainnet",
      client: { baseUrl: network },
    });
  }

  return network;
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function assertAscii(name: string, value: string, maxLen: number): void {
  if (!/^[\x20-\x7E]*$/.test(value)) {
    throw new Error(`${name} must be ASCII`);
  }
  if (value.length === 0 || value.length > maxLen) {
    throw new Error(`${name} must be 1-${maxLen} ASCII chars`);
  }
}

function assertUtf8(name: string, value: string, maxBytes: number): void {
  const byteLen = utf8ByteLength(value);
  if (byteLen === 0 || byteLen > maxBytes) {
    throw new Error(`${name} must be 1-${maxBytes} UTF-8 bytes`);
  }
}

function toContractCallOptions(
  input: BaseTxConfig,
  functionName: string,
  functionArgs: ClarityValue[],
): Parameters<typeof makeContractCall>[0] {
  return {
    contractAddress: input.contractAddress,
    contractName: resolveContractName(input.contractName),
    functionName,
    functionArgs,
    senderKey: input.senderKey,
    network: resolveNetwork(input.network),
    fee: input.fee,
    nonce: input.nonce,
    postConditions: input.postConditions,
    validateWithAbi: false,
  };
}

export async function buildTrackPageViewTx(input: TrackPageViewInput) {
  assertAscii("projectId", input.projectId, 40);
  assertUtf8("page", input.page, 120);

  return makeContractCall(
    toContractCallOptions(input, "track-page-view", [
      stringAsciiCV(input.projectId),
      stringUtf8CV(input.page),
    ]),
  );
}

export async function buildTrackActionTx(input: TrackActionInput) {
  assertAscii("projectId", input.projectId, 40);
  assertAscii("action", input.action, 40);
  assertUtf8("target", input.target, 120);

  return makeContractCall(
    toContractCallOptions(input, "track-action", [
      stringAsciiCV(input.projectId),
      stringAsciiCV(input.action),
      stringUtf8CV(input.target),
    ]),
  );
}

export async function buildTrackConversionTx(input: TrackConversionInput) {
  assertAscii("projectId", input.projectId, 40);
  assertAscii("conversionType", input.conversionType, 40);
  if (input.value < 0n) {
    throw new Error("value must be a non-negative bigint");
  }

  return makeContractCall(
    toContractCallOptions(input, "track-conversion", [
      stringAsciiCV(input.projectId),
      stringAsciiCV(input.conversionType),
      uintCV(input.value),
    ]),
  );
}

export async function buildTrackCustomEventTx(input: TrackCustomEventInput) {
  assertAscii("projectId", input.projectId, 40);
  assertAscii("eventType", input.eventType, 40);
  assertUtf8("payload", input.payload, 300);

  return makeContractCall(
    toContractCallOptions(input, "track-custom-event", [
      stringAsciiCV(input.projectId),
      stringAsciiCV(input.eventType),
      stringUtf8CV(input.payload),
    ]),
  );
}

export async function broadcastAnalyticsTx(
  tx: Awaited<ReturnType<typeof makeContractCall>>,
  network: AnalyticsNetwork,
): Promise<TxBroadcastResult> {
  return broadcastTransaction({
    transaction: tx,
    network: resolveNetwork(network),
  });
}

export async function getContractInfo(
  input: GetContractInfoInput,
): Promise<ContractInfo> {
  const response = await fetchCallReadOnlyFunction({
    contractAddress: input.contractAddress,
    contractName: resolveContractName(input.contractName),
    functionName: "get-contract-info",
    functionArgs: [],
    senderAddress: input.senderAddress,
    network: resolveNetwork(input.network),
  });

  const value = cvToValue(response) as {
    type: string;
    value: {
      contract?: string;
      version?: string;
      stateless?: boolean;
    };
  };

  if (!value || value.type !== "ok") {
    throw new Error("get-contract-info returned an error response");
  }

  return {
    contract: String(value.value.contract),
    version: String(value.value.version),
    stateless: Boolean(value.value.stateless),
  };
}
