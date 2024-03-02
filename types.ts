export type FarcasterUser = {
    status: "approved" | "pending_approval" | "logged_out";
    signature: string;
    publicKey: string;
    privateKey: string;
    deadline: number;
    signerApprovalUrl?: string;
    token?: any;
    fid?: number;
  }; 