import express, { Express,  } from "express";
import dotenv from "dotenv";
import { getFarcasterUser } from "./utils/getFarcasterUser"
import { SignedKeyRequest, CastBody } from "./types";
import { hexToBytes } from "@noble/hashes/utils";
import {  Message,
  NobleEd25519Signer,
  FarcasterNetwork,
  makeCastAdd,
} from "@farcaster/core"
import { getFeed } from "./utils/getFeed";
import { getUserByFid } from "./utils/geUserByFid";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

export const hubUrl = "https://hub.pinata.cloud/v1";


app.use(express.json());

app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Express + TypeScript Farcaster Server");
});

app.get("/user",async (req: express.Request, res: express.Response) => {
  const { userFid } = req.query;
  if(!userFid){
    res.status(400).json({error: "No FID provided"});
  }
  const fid = parseInt(userFid as string);
  const user = await getUserByFid(fid);
  if(user){
    res.json(user);
  }
  else{
    res.status(500).json({error: "Failed to get user"});
  }
});

app.get("/feed", async (req: express.Request, res: express.Response) => {
  const {channel, pageToken} = req.query;
  if(!channel){
    res.status(400).json({error: "No channel provided"});
  }
  if(!pageToken){
    res.status(400).json({error: "No pageToken provided"});
  }
  try {
    const simplifiedCasts = await getFeed(channel, pageToken);
    res.json(simplifiedCasts);
  } catch (error) {
    res.status(500).json({error: error});
  }
});

app.get("/sign-in/poll", async (req: express.Request, res: express.Response) => {
  const {pollingToken} = req.query;
    try {
      const fcSignerRequestResponse = await fetch(
        `https://api.warpcast.com/v2/signed-key-request?token=${pollingToken}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const responseBody = (await fcSignerRequestResponse.json()) as {
        result: { signedKeyRequest: SignedKeyRequest };
      };
      console.log(responseBody)
      res.status(200).json({"state": responseBody.result.signedKeyRequest.state, "userFid": responseBody.result.signedKeyRequest.userFid});
    }
    catch (error) {
      res.status(500).json(error);
    }
  }
);

app.post("/sign-in", async (req: express.Request, res: express.Response) => {
  try {
    const farcasterUser = await getFarcasterUser();
    if(!farcasterUser) {
      res.status(500).json({error: "Failed to sign in user"});
    }
    if(farcasterUser) {
      res.json({
        deepLinkUrl: farcasterUser?.signerApprovalUrl, 
        pollingToken: farcasterUser?.token,
        publicKey: farcasterUser?.publicKey,
        privateKey: farcasterUser?.privateKey,
      });
    }
    else{
      res.status(500).json({error: "Failed to get farcaster user"});
    }
  } catch (error) {
    res.status(500).json({error: error});
  }
});


app.post("/message", async (req: express.Request, res: express.Response) => { 
  const NETWORK = FarcasterNetwork.MAINNET; 
  try {
    console.log(req.body);
    const SIGNER = req?.body?.signer;
    const FID = req?.body?.fid;
    const message = req?.body?.castMessage;
    const parentUrl = req?.body?.parentUrl;

    if(!SIGNER) {
      return res.status(401).json({error: "No signer provided"});
    }
    if(!FID) {
      return res.status(400).json({error: "No FID provided"});
    }

    const dataOptions = {
      fid: FID,
      network: NETWORK,
    };
    // Set up the signer
    const privateKeyBytes = hexToBytes(SIGNER.slice(2));
    const ed25519Signer = new NobleEd25519Signer(privateKeyBytes);

    const castBody: CastBody = {
      text: message,
      embeds: [],
      embedsDeprecated: [],
      mentions: [],
      mentionsPositions: [],
    };

    if(parentUrl.length > 0){
      castBody["parentUrl"] = parentUrl;

    }

    const castAddReq: any = await makeCastAdd(
      castBody,
      dataOptions,
      ed25519Signer,
    );
    const castAdd: any = castAddReq._unsafeUnwrap();

    const messageBytes = Buffer.from(Message.encode(castAdd).finish());

    const castRequest = await fetch(
      "https://hub.pinata.cloud/v1/submitMessage",
      {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: messageBytes,
      },
    );

    const castResult = await castRequest.json();
    console.log(castResult);
    if (!castResult.hash) {
      return res.status(500).json({ error: "Failed to submit message" });
    } else {
      let hex = Buffer.from(castResult.hash).toString("hex");
      return res.status(200).json({hex: hex});
    }
  
  } catch (error) {
    console.log(error);
    return res.json({ "server error": error });
  }

});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
