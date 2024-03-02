import { getFnameFromFid } from "./getFnameFromFid";
import { getPfpFromFid } from "./getPfpFromFid";
import { hubUrl } from "..";

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
  