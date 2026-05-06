const sqlite3 = require("sqlite3").verbose()

const DB_PATH = "/home/comworks/.config/autoview/cameras.db"

console.log("🔥 USING DB:", DB_PATH)

const db = new sqlite3.Database(DB_PATH)

module.exports = db