import express, { Express,  } from "express";
import dotenv from "dotenv";
import { getFnameFromFid } from "./utils/getFnameFromFid";
import {getPfpFromFid} from "./utils/getPfpFromFid";
import { getFarcasterUser } from "./utils/getFarcasterUser"
import { SignedKeyRequest } from "./types";
import { hexToBytes } from "@noble/hashes/utils";
import {  Message,
  NobleEd25519Signer,
  FarcasterNetwork,
  makeCastAdd,
} from "@farcaster/core"


dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
export const hubUrl = "https://hub.pinata.cloud/v1";

app.use(express.json());


export const getFeed = async (channel: any, nextPage: any) => {
  try {
    const result = await fetch(
      `${hubUrl}/castsByParent?url=${channel}&pageSize=20&reverse=true&pageToken=${nextPage}`,
    );
    const resultData = await result.json();
    const pageToken = resultData.nextPageToken;
    const casts = resultData.messages;
    const simplifiedCasts = await Promise.all(
      casts.map(async (cast: any) => {
        const fname = await getFnameFromFid(cast.data.fid);
        const pfp = await getPfpFromFid(cast.data.fid);
        const { embedUrl, embedCast } = cast.data.castAddBody.embeds.reduce((acc: any, embed: any) => {
          if (embed.url) {
            acc.embedUrl.push(embed);
          } else if (embed.castId) {
            acc.embedCast.push(embed);
          }
          return acc;
        }, { embedUrl: [], embedCast: [] });
        return {
          id: cast.hash,
          castText: cast.data.castAddBody.text,
          embedUrl: embedUrl,
          embedCast: embedCast,
          username: fname,
          pfp: pfp,
          timestamp: cast.data.timestamp,
        };
      }),
    );
    return simplifiedCasts;
  } catch (error) {
    console.log(error);
    return error;
  }
}


app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Express + TypeScript Server");
});

app.get("/feed", async (req: express.Request, res: express.Response) => {
  const {channel, pageToken} = req.query;
  try {
    const simplifiedCasts = await getFeed(channel, pageToken);
    res.json(simplifiedCasts);
  } catch (error) {
    res.status(500).json({error: error});
  }
});

app.post("/sign-in", async (req: express.Request, res: express.Response) => {
  try {
    const farcasterUser = await getFarcasterUser();
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
      res.status(200).json({"state": responseBody.result.signedKeyRequest.state, "userFid": responseBody.result.signedKeyRequest.requestFid});
    }
    catch (error) {
      res.status(500).json(error);
    }
  }
);

app.post("/message", async (req: express.Request, res: express.Response) => { 
  const NETWORK = FarcasterNetwork.MAINNET; 
  try {
    console.log(req.body);
    const SIGNER = req?.body?.signer;
    const FID = req?.body?.fid;
    const message = req?.body?.castMessage;
    const parentUrl = req?.body?.parentUrl;


    const dataOptions = {
      fid: FID,
      network: NETWORK,
    };
    // Set up the signer
    const privateKeyBytes = hexToBytes(SIGNER.slice(2));
    const ed25519Signer = new NobleEd25519Signer(privateKeyBytes);

    const castBody = {
      text: message,
      embeds: [],
      embedsDeprecated: [],
      mentions: [],
      mentionsPositions: [],
      parentUrl: parentUrl,
    };

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
