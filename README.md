# VALIDATOR

Become a Solana validator in one click. Landing site for the VALIDATOR validator launchpad.

Plain static site: HTML, CSS and JavaScript. No build step, no dependencies to install.

## Project structure

```
.
├── index.html             page markup
├── styles.css             all styles (dark + light themes)
├── app.js                 wallet connect, launch console, marketplace, 3D logo
├── validator.png          3D logo front face (transparent)
├── validator-nav.png      small logo for the header
├── favicon.png
├── apple-touch-icon.png
├── logo-original.png      original artwork
├── vercel.json            Vercel config (clean URLs, security headers)
├── .gitignore
└── README.md
```

## Run locally

Wallet extensions don't inject into `file://` pages, so serve the folder over HTTP:

```bash
npx serve .
# or
python3 -m http.server 3000
```

Then open http://localhost:3000.

## Deploy to Vercel

1. Push all of these files to the root of a GitHub repo. There are no subfolders.
2. On vercel.com, choose **Add New → Project** and import the repo.
3. Framework preset: **Other**. Leave build command and output directory empty.
4. Click **Deploy**.

Or from the command line: `npx vercel` (preview) and `npx vercel --prod`.

## Wallet connect

`app.js` connects to Phantom, Solflare and Backpack through their injected providers and uses
[`@solana/web3.js`](https://github.com/solana-labs/solana-web3.js) 1.95.3 (loaded from jsDelivr) to handle public keys.
The site only reads the wallet's public address. It never requests a signature or sends a transaction.

## Live data

The epoch counter in the header reads `getEpochInfo` from `https://api.mainnet-beta.solana.com`.
The public endpoint is rate-limited, so set `RPC_URL` in `app.js` to your own provider before you get traffic.

## What's wired up today

- **Wallet connect:** live (Phantom, Solflare, Backpack).
- **Epoch counter:** live from Solana mainnet.
- **Launch console:** collects the validator's name, region, commission and colour, and generates identity and vote keypairs in the browser (they're discarded). It ends by pointing visitors to @UseValidatorfun for go-live. Nothing is provisioned yet.
- **Marketplace:** empty until a backend serves listings.
- **Delegate:** tells the visitor delegation opens at go-live. No transaction is sent.
- **Header counters:** "validators launched" and "SOL delegated" are static (0).

Making these real needs a backend for provisioning and listings, plus stake-program transactions signed by the user's wallet.

## Disclaimer

Running a Solana validator requires real infrastructure, operating funds and enough delegated stake to be economically viable.
Nothing on this site is financial advice.
