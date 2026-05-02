// server/routes/people.js
router.get("/", async (req, res) => {

  const cams = await dbAll(`
    SELECT id
    FROM cameras
    WHERE people_count_enabled = 1
  `)

  const result = {}

  for (const cam of cams) {
    const id = String(cam.id)

    if (global.peopleCounts[id] !== undefined) {
      result[id] = global.peopleCounts[id]
    }
  }

  res.json(result)   // ←ここ重要（countsラップしない）
})