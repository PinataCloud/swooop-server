
import dotenv from "dotenv";
import { mnemonicToAccount } from "viem/accounts";
// import { convertKeypairToHex, createKeypair } from "./crypto.ts";
import { FarcasterUser } from "../types";
import * as ed from "@noble/ed25519";

export function convertKeypairToHex({
  privateKeyBytes,
  publicKeyBytes,
}: {
  privateKeyBytes: Uint8Array;
  publicKeyBytes: Uint8Array;
}): {
  publicKey: string;
  privateKey: string;
} {
  return {
    publicKey: "0x" + Buffer.from(publicKeyBytes).toString("hex"),
    privateKey: "0x" + Buffer.from(privateKeyBytes).toString("hex"),
  };
}

export async function createKeypair(): Promise<{
  publicKeyBytes: Uint8Array;
  privateKeyBytes: Uint8Array;
}> {
  // store this securely!
  const privateKeyBytes = ed.utils.randomPrivateKey();
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);

  return {
    privateKeyBytes,
    publicKeyBytes,
  };
}

dotenv.config();

const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
    name: "Farcaster SignedKeyRequestValidator",
    version: "1",
    chainId: 10,
    verifyingContract: "0x00000000fc700472606ed4fa22623acf62c60553",
  } as const;
  
  const SIGNED_KEY_REQUEST_TYPE = [
    { name: "requestFid", type: "uint256" },
    { name: "key", type: "bytes" },
    { name: "deadline", type: "uint256" },
  ] as const;


export const getFarcasterUser = async () => {
  const keypair = await createKeypair();
  const keypairString = convertKeypairToHex(keypair);

  const appFid = process.env.FARCASTER_DEVELOPER_FID!;
  const account = mnemonicToAccount(
    process.env.FARCASTER_DEVELOPER_MNEMONIC!
  );

  const deadline = Math.floor(Date.now() / 1000) + 86400; // signature is valid for 1 day
  const requestFid = parseInt(appFid);
  const signature = await account.signTypedData({
    domain: SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
    types: {
      SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE,
    },
    primaryType: "SignedKeyRequest",
    message: {
      requestFid: BigInt(appFid),
      key: `0x${keypairString.publicKey}`,
      deadline: BigInt(deadline),
    },
  });
  const authData = {
    signature: signature,
    requestFid: requestFid,
    deadline: deadline,
    requestSigner: account.address,

  }
  const {
    result: { signedKeyRequest },
  } = (await (
    await fetch(`https://api.warpcast.com/v2/signed-key-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: keypairString.publicKey,
        signature,
        requestFid,
        deadline,
      }),
    })
  ).json()) as {
    result: { signedKeyRequest: { token: string; deeplinkUrl: string } };
  };
  const user: FarcasterUser = {
    ...authData,
    publicKey: keypairString.publicKey,
    deadline: deadline,
    token: signedKeyRequest.token,
    signerApprovalUrl: signedKeyRequest.deeplinkUrl,
    privateKey: keypairString.privateKey,
    status: "pending_approval",
  };
  return user;

};