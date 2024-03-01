import { hubUrl } from "..";

export async function getFnameFromFid(fid: any): Promise<string> {
    const result = await fetch(
      `${hubUrl}/userDataByFid?fid=${fid}&user_data_type=USER_DATA_TYPE_USERNAME`,
    );
    const resultData = await result.json();
    const fname = resultData?.data?.userDataBody?.value || fid;
    return fname;
  }