import axios from "axios";
import { prisma } from "../prisma";
import { decryptToken } from "./decryption.util";
import { incrementDmCount } from "../middleware/quotaGuard.middleware";

export async function sendDM({ tenantId, username, message }: any) {
  const account = await prisma.iGAccount.findFirst({
    where: { tenantId, isActive: true }
  });

  if (!account) throw new Error("IG Account not found for tenant");

  const token = decryptToken(account);

  const url = `https://graph.instagram.com/v24.0/${account.igBusinessId}/messages`;

  await axios.post(url, {
    recipient: username,
    message: { text: message },
    access_token: token
  });

  // Increment DM count after successful send
  await incrementDmCount(tenantId, 1);
}
