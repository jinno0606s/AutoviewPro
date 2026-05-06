export async function run(ctx){

  const file = `./data/test_${Date.now()}.jpg`

  await ctx.saveFile({
    cameraId: ctx.camera.id,
    path: file
  })

  return [{
    type: "TIMELAPSE_CAPTURED",
    level: "info",
    camera_id: ctx.camera.id,
    meta: { file }
  }]
}