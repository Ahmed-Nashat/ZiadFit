import bcrypt from "bcrypt";
import { hash_salt } from "../../config/config.service.js";
import { exceptions } from "../exceptions/index.js";

export const hash = async ({
  plainText,
}: {
  plainText: string;
}): Promise<string> => await bcrypt.hash(plainText, hash_salt);

export const compare = async ({
  plainText,
  cipherText,
}: {
  plainText: string;
  cipherText: string;
}): Promise<void> => {
  const result = await bcrypt.compare(plainText, cipherText);
  if (!result)
    throw new exceptions.BadRequestException("Invalid email or password");
};
