import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
const hubUrl = "https://hub.pinata.cloud/v1";

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
          id: cast.data.hash,
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


export async function getFnameFromFid(fid: any): Promise<string> {
  const result = await fetch(
    `${hubUrl}/userDataByFid?fid=${fid}&user_data_type=USER_DATA_TYPE_USERNAME`,
  );
  const resultData = await result.json();
  const fname = resultData?.data?.userDataBody?.value || fid;
  return fname;
}

export async function getPfpFromFid(fid: any): Promise<string> {
  const result = await fetch(
    `${hubUrl}/userDataByFid?fid=${fid}&user_data_type=USER_DATA_TYPE_PFP`,
  );
  const resultData = await result.json();
  const pfp = resultData?.data?.userDataBody?.value || "";
  return pfp;

};

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