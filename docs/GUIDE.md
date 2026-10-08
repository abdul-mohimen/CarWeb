# CarWeb – Step-by-Step Guide

This guide takes you from an empty machine to a running car inventory website backed by
Microsoft SQL Server, and shows how to **export the data to a `.sql` file**, find where that
file was saved, and import it somewhere else.

---

## 0. What you get

| Part | Location | Purpose |
|------|----------|---------|
| Web UI | `public/` | Add, list and delete cars in the browser |
| REST API | `src/server.js`, `src/cars.js` | `/api/cars`, `/api/export/sql`, `/api/health` |
| DB schema + sample data | `sql/schema.sql` | Creates database `CarWeb` and table `dbo.Cars` |
| SQL export engine | `src/export.js` | Builds a safe, re-runnable T-SQL script |
| Export CLI | `scripts/export-mssql.js` | Saves the export to disk and prints the **full file path** |
| Tests | `test/` | Unit tests for export and validation |

---

## 1. Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 18 or newer (22 LTS recommended) | `node -v` |
| npm | comes with Node | `npm -v` |
| SQL Server | 2017+ (local, Docker, or Azure SQL) | see Step 2 |
| sqlcmd (optional) | go-sqlcmd | `sqlcmd -?` |
| Git (optional) | any | `git --version` |

---

## 2. Get a SQL Server running

Choose **one** option.

**Option A – Docker (Linux/macOS/Windows):**
```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
  -p 1433:1433 --name sqlserver -d mcr.microsoft.com/mssql/server:2022-latest
```
The SA password must be at least 8 characters and include upper/lower case, digits and symbols.

**Option B – Windows installer:** install *SQL Server Express* and *SQL Server Management Studio (SSMS)*.
Use server name `localhost` (or `localhost\SQLEXPRESS`).

**Option C – Azure SQL:** create a database and copy its server name. Set `DB_ENCRYPT=true` in `.env`.

---

## 3. Get the project

```bash
git clone https://github.com/abdul-mohimen/CarWeb.git
cd CarWeb
git checkout arena/44159c93-carweb   # the branch containing this app (skip if you use main after merge)
```

Project location after cloning: the folder **`CarWeb`** you cloned into (for example `C:\Projects\CarWeb`
on Windows or `/home/user/CarWeb` in this workspace).

---

## 4. Install dependencies

```bash
npm install
```

This installs `express` (web server) and `mssql` (SQL Server driver).

---

## 5. Create the database and table

Run the schema script once:

```bash
# sqlcmd (works on every OS)
sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -i sql/schema.sql
```

Or open `sql/schema.sql` in SSMS / Azure Data Studio and press **Execute**.

This creates database `CarWeb`, table `dbo.Cars`, and three sample cars.

Optional: create a least-privilege login for the app. Uncomment the `carweb_app` lines in
`sql/schema.sql`, change the password, and run the script again.

---

## 6. Configure the app

```bash
cp .env.example .env         # Windows PowerShell: Copy-Item .env.example .env
```

Edit `.env`:

```ini
PORT=3000
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=CarWeb
DB_USER=sa                   # or carweb_app
DB_PASSWORD=YourStrong!Passw0rd
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
EXPORT_DIR=exports
```

`.env` is git-ignored, so passwords are never committed.

---

## 7. Run the website

```bash
npm start
```

Open **http://localhost:3000**.

- The status text shows **Connected** when the database is reachable.
- Fill in the *Add a car* form (Make, Model and Year are required) and click **Save car**.
- Click **Delete** on any row to remove it.

Check the API directly:
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/cars
```

Stop the server with `Ctrl+C`.

---

## 8. Export the MSSQL data to a file

There are three ways. All produce the same T-SQL script.

### 8a. From the website (download)
1. Open http://localhost:3000.
2. Click **Export MSSQL (.sql)**.
3. The browser saves `carweb-export-YYYYMMDD-HHMMSS.sql`. Your browser's **Downloads** folder is
   the location (Chrome/Edge: `Ctrl+J` shows the path).

### 8b. From the command line (saves to disk and prints the path) – recommended
```bash
npm run export:mssql
```
Example output:
```
Exported 3 row(s) from localhost/CarWeb
Export file: /home/user/CarWeb/exports/carweb-export-20261008-093005.sql
```
The last line is the **full extract path location**. Files go to the `exports/` folder by default.

Choose your own location:
```bash
# Windows example
node scripts/export-mssql.js --out "C:\backups\carweb\cars.sql"
# macOS / Linux example
node scripts/export-mssql.js --out ~/backups/cars.sql
```

Or change the default folder with `EXPORT_DIR` in `.env` (absolute or relative to the project).

### 8c. Via the API (curl)
```bash
curl -OJ http://localhost:3000/api/export/sql     # -O -J keeps the server's file name
```

### What is inside the exported file
- A header with the database name, timestamp and row count.
- `USE [CarWeb];`
- `BEGIN TRANSACTION;` … `COMMIT TRANSACTION;` (an error rolls everything back via `XACT_ABORT`).
- `DELETE FROM dbo.Cars;` – the import replaces existing rows.
- `SET IDENTITY_INSERT dbo.Cars ON;` so original `Id` values are kept.
- One `INSERT` per car, with safe escaping of quotes and NULLs.

---

## 9. Import the exported file (restore on another server)

1. Create the empty database and table on the target server (Step 5).
2. Run the export file:

```bash
sqlcmd -S TARGET_SERVER -U sa -P "Password" -i "/path/to/carweb-export-20261008-093005.sql"
```
Windows example:
```powershell
sqlcmd -S localhost -U sa -P "Password" -i "C:\backups\carweb\cars.sql"
```

Or open the `.sql` file in SSMS and click **Execute**.

3. Verify:
```sql
SELECT COUNT(*) FROM dbo.Cars;
```
The count should match the `Rows` value in the file header.

> **Warning:** the import deletes existing rows in `dbo.Cars` on the target before inserting.
> Take a backup first on any server with data you care about.

---

## 10. Run the tests

```bash
npm test
```
Expected: `# pass 12`, `# fail 0`. The tests need no database.

---

## 11. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Failed to connect ... ECONNREFUSED` | SQL Server is not running or the port is wrong. Check `DB_SERVER`, `DB_PORT`, and firewall. |
| `Login failed for user` | Wrong `DB_USER`/`DB_PASSWORD`, or the login has no access to `CarWeb`. |
| `certificate verify failed` / SSL errors | Set `DB_TRUST_SERVER_CERTIFICATE=true` (local) or install a trusted certificate. |
| `Cannot open database "CarWeb"` | Run Step 5 (`sql/schema.sql`). |
| `sqlcmd: command not found` | Install go-sqlcmd or use SSMS. |
| Export file has no rows | The table is empty. Add cars first, or check the database name in `.env`. |
| `Export failed: ... ` | Read the message after `Export failed:`; it is the database error. |
| Port 3000 in use | Set `PORT=3001` in `.env`. |

---

## 12. Quick reference

```bash
npm install                      # 1. install
sqlcmd -S localhost -U sa -P ... -i sql/schema.sql   # 2. create DB + table
cp .env.example .env             # 3. configure (then edit it)
npm start                        # 4. run website -> http://localhost:3000
npm run export:mssql             # 5. export -> prints full file path
npm test                         # 6. run tests
```
