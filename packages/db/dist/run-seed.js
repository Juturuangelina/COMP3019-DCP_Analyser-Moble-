import { seed } from "./seed.js";
seed("parramatta")
    .then(() => seed("bankstown"))
    .then(() => seed("albury"))
    .then(() => process.exit(0))
    .catch((e) => {
    console.error(e);
    process.exit(1);
});
