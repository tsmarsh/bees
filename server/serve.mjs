// `make serve`: play locally, and host garden parties for phones and laptops on the same network.
// PORT and HOST come from the environment.
import { startServer, lanAddresses } from "./app.mjs";

const port = Number(process.env.PORT || 8080);
await startServer({ port, host: process.env.HOST || "0.0.0.0" });
console.log(`Allerbees is buzzing at http://localhost:${port}/`);
for (const a of lanAddresses()) console.log(`  friends on your network can join at http://${a}:${port}/`);
