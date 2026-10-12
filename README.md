# Sketch & Sabotage — Multiplayer Edition

A real-time browser game built with **HTML, CSS, JavaScript, Node.js, Express, and Socket.IO**. Real players connect to a shared room; no demo/bot players are added.

## 1. Understand the project files

```text
sketch-sabotage-multiplayer/
├── public/
│   ├── index.html          # Multiplayer page structure (HTML only)
│   ├── style.css           # Styling and responsive layout (CSS only)
│   └── client.js           # Browser interactions and live socket events (JavaScript)
├── standalone.html         # One-file local demo; no server required, not multiplayer
├── server.js               # Multiplayer server, rooms, roles, voting and scoring
├── package.json            # Project metadata, dependencies and start command
├── package-lock.json       # Created by npm install; records exact dependency versions
└── .gitignore              # Files Git should not upload
```

Keep the responsibilities separate: edit page structure in `public/index.html`, appearance in `public/style.css`, browser behavior in `public/client.js`, and shared room/game rules in `server.js`. The `standalone.html` file is included only as a quick, single-file local preview. It is not the multiplayer build and should not be deployed instead of `public/index.html`. There is no `demo-original.html` file in this cleaned project.

## 2. Install the tools

You need:

1. **Node.js 20 or newer:** install it from <https://nodejs.org/>. This also installs `npm`.
2. **Git:** install it from <https://git-scm.com/downloads>.
3. **A GitHub account:** create one at <https://github.com/>.
4. **A Render account:** create one at <https://render.com/>. Render will host the running server.
5. A code editor such as Visual Studio Code is recommended.

After installation, open Terminal (macOS/Linux) or PowerShell (Windows) and check:

```bash
node --version
npm --version
git --version
```

Node should report version 20 or newer. If a command is not recognized, finish installing the tool and reopen the terminal.

## 3. Run the game on your own computer first

1. Download and extract `sketch-sabotage-multiplayer.zip`.
2. Open a terminal in the extracted `sketch-sabotage-multiplayer` folder. In VS Code, use **File → Open Folder**, select the folder, then **Terminal → New Terminal**.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Open <http://localhost:3000>. This loads `public/index.html`, with its CSS and JavaScript kept in separate files.

If you only want to preview the original single-file demo, double-click `standalone.html`; it does not connect remote players.
6. To test, open the address in two or more browser tabs/windows and join the same room. These are separate browser connections, but the game starts with at least two real connections for testing. The configured room limit is 10–15.
7. Stop the local server with **Ctrl+C** in the terminal.

Do not close the terminal while testing locally; the server stops when its process stops.

## 4. Create a Git repository (`git init`)

Run these commands from the project's root folder—the folder containing `server.js` and `package.json`:

```bash
git init
git add .
git status
git commit -m "Initial Sketch and Sabotage multiplayer project"
```

What they do:

- `git init` starts version tracking in this folder.
- `git add .` stages project files for the next snapshot. `.gitignore` excludes `node_modules` and local secrets.
- `git status` shows what will be committed.
- `git commit -m "..."` saves a named snapshot locally.

If Git asks who you are, configure your commit identity (use your own details):

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Then run the `git commit` command again. If Git says there is nothing to commit, check `git status`; the commit may already exist.

## 5. Create a GitHub repository and push (`git push`)

1. Sign in to <https://github.com/>.
2. Click **+ → New repository**.
3. Name it `sketch-sabotage-multiplayer`.
4. Choose **Private** or **Public**. Do not add a README, `.gitignore`, or license on GitHub for this repository, because this folder already has project files.
5. Click **Create repository**. GitHub will show a repository URL. Copy the HTTPS URL; it looks like `https://github.com/YOUR-USERNAME/sketch-sabotage-multiplayer.git`.
6. In the project terminal, replace the example URL below with the URL you copied:

   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/sketch-sabotage-multiplayer.git
   git push -u origin main
   ```

If Git says `remote origin already exists`, use `git remote -v` to inspect it. To correct it, run `git remote set-url origin YOUR-COPIED-HTTPS-URL`, then push again. GitHub may ask you to authenticate in a browser; follow its prompts. Do not put passwords or access tokens directly in your commands.

## 6. Deploy the GitHub repository to Render

1. Push the code to GitHub first (Section 5).
2. Sign in to <https://dashboard.render.com/>.
3. Choose **New + → Web Service**.
4. Connect GitHub if asked, then select the `sketch-sabotage-multiplayer` repository.
5. Configure the service:
   - **Name:** `sketch-sabotage-multiplayer` (or another available name)
   - **Runtime:** Node
   - **Branch:** `main`
   - **Root Directory:** leave blank if `package.json` is at the repository root
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Select an available plan, then click **Create Web Service** / **Deploy Web Service**.
7. Wait for the deploy to finish. Open the HTTPS URL shown on the Render service page. If the page fails, open **Logs** in Render and check the error.
8. On the hosted site, enter a nickname and click **Create private room**. Copy the invite link and send it to your friends. They can open that public HTTPS link on their own devices and join the same room.

**Important:** use a Render **Web Service**, not a static-site deployment. Socket.IO needs a running Node.js server. The public link is generated by Render after deployment; it cannot be pre-created from the local ZIP.

## 7. Update the deployed game later (`git add`, `commit`, `push`, and `pull`)

After editing a file, test locally, then save and upload the changes:

```bash
npm start
# Test the game; stop with Ctrl+C

git status
git add .
git commit -m "Describe the change"
git push
```

Render normally redeploys automatically after a push to the connected branch. Check the Render **Events/Logs** page to confirm deployment.

To download the latest version from GitHub on another computer—or before you start work if you already cloned the repository—run this inside the repository folder:

```bash
git pull
npm install
```

If you have not cloned the repository on that computer yet, run once:

```bash
git clone https://github.com/YOUR-USERNAME/sketch-sabotage-multiplayer.git
cd sketch-sabotage-multiplayer
npm install
```

Replace `YOUR-USERNAME` with your GitHub username. `git pull` fetches and merges remote changes into your current branch. If you have local edits, commit or back them up before pulling. If Git reports a merge conflict, open the named files, resolve the conflict markers, then `git add` the fixed files and `git commit`.

### Quick Git command reference

| Command | Meaning |
|---|---|
| `git status` | See changed/staged files |
| `git add .` | Stage current changes |
| `git commit -m "message"` | Save a local snapshot |
| `git push` | Upload commits to GitHub |
| `git pull` | Bring GitHub changes into your local branch |
| `git log --oneline -5` | Show the latest five commits |

## 8. Multiplayer notes and limitations

- This is a **deployment-ready starter project**, not a site already published online. A real public URL exists only after you deploy it to a hosting account.
- Room/game state is currently stored in server memory. Restarting/redeploying the server clears active rooms; do not expect room codes to survive a restart.
- For production, add persistent storage, rate limits, moderation controls, and stronger reconnect/session handling. The current starter is suitable for testing the core remote-room flow, not yet a hardened public launch.
- Keep the private word/spy role server-side. Do not add secrets or API keys to `public/client.js` or commit `.env` files.
