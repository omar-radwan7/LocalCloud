import multer from "multer";

const maxFileSizeEnv = Number(process.env.MAX_FILE_SIZE_MB || "2048"); // default 2GB
const maxFileSizeBytes =
  Number.isFinite(maxFileSizeEnv) && maxFileSizeEnv > 0
    ? maxFileSizeEnv * 1024 * 1024
    : 2 * 1024 * 1024 * 1024;

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeBytes,
  },
});

