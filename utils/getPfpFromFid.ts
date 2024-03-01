import { hubUrl } from "../src";

export async function getPfpFromFid(fid: any): Promise<string> {
    const result = await fetch(
      `${hubUrl}/userDataByFid?fid=${fid}&user_data_type=USER_DATA_TYPE_PFP`,
    );
    const resultData = await result.json();
    const pfp = resultData?.data?.userDataBody?.value || "";
    return pfp;
  
  };