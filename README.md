# CarWeb

A car inventory web app built with **Node.js, Express and Microsoft SQL Server**, with one-click
**T-SQL export** of the data.

## Quick start

```bash
npm install
sqlcmd -S localhost -U sa -P "<password>" -i sql/schema.sql   # create DB + table
cp .env.example .env                                           # then edit DB settings
npm start                                                      # http://localhost:3000
npm run export:mssql                                           # prints the export file path
```

See **[docs/GUIDE.md](docs/GUIDE.md)** for the full step-by-step guide, including export and import.

## Project layout

```
public/          web UI (HTML/CSS/JS)
src/             Express server, DB access, validation, SQL export engine
scripts/         export-mssql.js – CLI export that prints the saved file path
sql/schema.sql   database + table + sample data
test/            unit tests (npm test)
docs/GUIDE.md    step-by-step guide
exports/         default folder for exported .sql files (git-ignored)
```
