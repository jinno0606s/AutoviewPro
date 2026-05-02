export function makeFilePath(cameraId){
  return `./data/timelapse/${cameraId}_${Date.now()}.jpg`
}