// server/routes/cameras.js
const express = require("express")
const router = express.Router()
const db = require("../db") // パス調整

router.post("/update", (req,res)=>{
  console.log("📥 UPDATE REQ", req.body) // ←追加
  
  const c = req.body

  db.run(`
    UPDATE cameras SET
      name=?,
      rtsp_url=?,
      address=?,
      lat=?,
      lng=?,
      enabled=?, 
      people_count_enabled=?,
      people_count_type=?
    WHERE id=?
  `,
  [
    c.name,
    c.rtsp_url,
    c.address,
    c.lat,
    c.lng,
    c.enabled,  
    c.people_count_enabled,
    c.people_count_type,
    c.id
  ])

  res.json({ ok:true })

})

module.exports = router