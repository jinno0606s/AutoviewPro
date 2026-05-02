// aoaCounter.js    人数カウント
function processFrame(frame){

 const count =
 detectPeople(frame)

 return count

}

module.exports = { processFrame }
