# 🎂 Birthday Surprise

A cute, interactive birthday page with sound effects, made of six screens:

1. 🎁 **Welcome**: a gift with an "open it" button.
2. 🧐 **Are you sure?**: the "No" button runs away and teases them until it gives up.
3. 😺 **Cat guardian**: the Official Birthday Inspector sets the challenge.
4. 💝 **Catch the hearts**: a mini game where the heart gets faster the more they catch.
5. 😻 **Quest complete**: a fanfare and confetti.
6. 🎂 **Happy Birthday**: tap the cake to blow out the candles, then Happy Birthday plays on a music box over your letter.

All sounds are generated in the browser, so there are no audio files. A 🔊 button in the corner mutes them.

## Run it

You need Node.js 18 or newer. There is nothing to install.

```bash
npm start
```

- The surprise: http://localhost:3000
- The editor: http://localhost:3000/modify

## Changing the text (`/modify`)

Every piece of text can be edited at `/modify`, with a live phone preview beside the form. Click **Save** when you're done.

- Write `{name}` anywhere and it is replaced with your friend's name.
- Wrap words in `**double stars**` to make them **bold**.
- You can set how many hearts the game needs (1 to 50).

Saved text goes into `data/config.json`. **Reset to default** restores the text in `defaults.json`.

### Keep your friend out of the editor

By default anyone who finds `/modify` could edit the page. To stop that, set a password before starting the server:

```bash
MODIFY_PASSWORD=something-secret npm start
```

PowerShell:

```powershell
$env:MODIFY_PASSWORD="something-secret"; npm start
```

The editor then asks for the password before it saves.

## Sharing it

Host it anywhere that runs a Node server (Render, Railway, Fly.io, a VPS) with `npm start` as the start command. The `PORT` environment variable is respected. Note that some free hosts reset their disk on restart, which would also reset your saved text. To make your text survive that, copy your `data/config.json` over `defaults.json` before you deploy.

### On Vercel

The project is set up for Vercel already: `vercel.json` serves `public/` as the site, and `api/` holds the save/load functions.

1. Import the project in Vercel and leave **Build and Output Settings** at their defaults (all toggles off). Click **Deploy**.
2. In the project, open **Storage**, choose **Create Database** with **Upstash** (Redis, free plan), and connect it to this project. Vercel adds its connection details as environment variables.
3. Optional: add `MODIFY_PASSWORD` under **Settings > Environment Variables**.
4. Redeploy (**Deployments**, then **⋯ > Redeploy**) so the new variables take effect.

Until a database is connected, the surprise shows the default text and **Save** on `/modify` says to connect one.
