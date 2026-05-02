// core/peopleCount.js

const counts = {} // camId: count

function updateCount(camId, value){
  counts[camId] = value
}

function getCounts(){
  console.log("GET COUNTS =", counts)
  return counts
}

// ダミー（あとでAI or AXISに置き換え）
function startMock(cameras){

  console.log("🔥 startMock START")
  console.log("cameras =", cameras)

  setInterval(()=>{

    console.log("⏱ peopleCount LOOP")

    cameras.forEach(c=>{

      console.log(
        "CHECK CAM:",
        c.id,
        "enabled=", c.people_count_enabled
      )

      if(c.people_count_enabled){

        const v = Math.floor(Math.random()*5)

        counts[c.id] = v

        console.log("✅ COUNT SET:", c.id, v)

      }else{
        console.log("❌ SKIP:", c.id)
      }

    })

    console.log("📊 counts NOW =", counts)

  }, 5000)
}

module.exports = {
  updateCount,
  getCounts,
  startMock
}