import { getFnameFromFid } from "./getFnameFromFid";
import { getPfpFromFid } from "./getPfpFromFid";
import { hubUrl, apiUrl } from "..";

export const getFeed = async (channel: any, nextPage?: any) => {
  try {
    const result = await fetch(
      `${apiUrl}/farcaster/casts?channel=${channel}&pageLimit=100&pageToken=${nextPage}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
      },
    );
    const resultData = await result.json();
    console.log(resultData)

    //const pageToken = resultData.next.cursor;
    const casts = resultData.casts;
    const simplifiedCasts = await Promise.all(
      casts
        .map(async (cast: any) => {
          const fname = cast.author.username;
          const pfp = cast.author.pfp_url;
          const { embedUrl, embedCast } = cast.embeds.reduce(
            (acc: any, embed: any) => {
              if (embed.url) {
                acc.embedUrl.push(embed);
              } else if (embed.cast_id) {
                acc.embedCast.push(embed);
              }
              return acc;
            },
            { embedUrl: [], embedCast: [] },
          );
          return {
            id: cast.hash,
            castText: cast.text,
            embedUrl: embedUrl,
            embedCast: embedCast,
            username: fname,
            pfp: pfp,
            timestamp: cast.timestamp,
            likes: cast?.reactions?.likes?.length || 0,
            recasts: cast?.reactions?.recasts?.length || 0,
          };
        }),
    );
    return simplifiedCasts;
  } catch (error) {
    console.log(error);
    return error;
  }
};

