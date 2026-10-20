import crypto from "crypto";

function makeRandomIv() {
const chars =
"0123456789abcdefghijklmnopqrstuvwxyz";

let result = "";

for (let i = 0; i < 16; i++) {
result +=
chars.charAt(
Math.floor(
Math.random() * chars.length
)
);
}

return result;
}

function getAlgorithm(secret) {
const length =
Buffer.from(secret).length;

if (length === 16) {
return "aes-128-cbc";
}

if (length === 24) {
return "aes-192-cbc";
}

if (length === 32) {
return "aes-256-cbc";
}

throw new Error(
`Invalid ZEGOCLOUD_SERVER_SECRET length: ${length}. Server Secret must be 16, 24, or 32 bytes.`
);
}

export function generateToken04(
appId,
userId,
secret,
effectiveTimeInSeconds,
payload = ""
) {
if (!appId) {
throw new Error(
"ZEGOCLOUD_APP_ID is missing"
);
}

if (!userId) {
throw new Error(
"ZEGOCLOUD userId is missing"
);
}

if (!secret) {
throw new Error(
"ZEGOCLOUD_SERVER_SECRET is missing"
);
}

const now =
Math.floor(Date.now() / 1000);

const expire =
now + effectiveTimeInSeconds;

const nonce =
Math.floor(
-2147483648 +
Math.random() * 4294967295
);

const tokenInfo = {
app_id: Number(appId),
user_id: userId.toString(),
nonce,
ctime: now,
expire,
payload,
};

const iv = makeRandomIv();

const algorithm =
getAlgorithm(secret);

const cipher =
crypto.createCipheriv(
algorithm,
Buffer.from(secret),
Buffer.from(iv)
);

cipher.setAutoPadding(true);

const encryptedBuffer =
Buffer.concat([
cipher.update(
JSON.stringify(tokenInfo),
"utf8"
),
cipher.final(),
]);

const expireBuffer =
Buffer.alloc(8);

expireBuffer.writeBigInt64BE(
BigInt(expire),
0
);

const ivLengthBuffer =
Buffer.alloc(2);

ivLengthBuffer.writeUInt16BE(
Buffer.byteLength(iv),
0
);

const contentLengthBuffer =
Buffer.alloc(2);

contentLengthBuffer.writeUInt16BE(
encryptedBuffer.length,
0
);

const tokenBuffer =
Buffer.concat([
expireBuffer,
ivLengthBuffer,
Buffer.from(iv),
contentLengthBuffer,
encryptedBuffer,
]);

return `04${tokenBuffer.toString(
    "base64"
  )}`;
}

export default generateToken04;
