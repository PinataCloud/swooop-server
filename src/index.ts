import express, { Express,  } from "express";
import dotenv from "dotenv";
import { getFnameFromFid } from "../utils/getFnameFromFid";
import {getPfpFromFid} from "../utils/getPfpFromFid";
import { getSigner } from "../utils/getSigner";


dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
export const hubUrl = "https://hub.pinata.cloud/v1";

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
        return {
          id: cast.hash,
          castText: cast.data.castAddBody.text,
          embeds: cast.data.castAddBody.embeds,
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


app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});