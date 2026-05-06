module.exports = (app) => {

  app.post("/api/coastal/broadcast", (req, res) => {

    const { type } = req.body

    console.log("📢 放送:", type)

    // 今はダミー
    // 後で speaker.js と連携

    res.json({ ok: true })
  })

}