function triggerEvent(event){

 console.log("EVENT:",event)

 if(event.type==="crowd"){

   speakerAlert("混雑しています")

 }

 if(event.type==="earthquake"){

   speakerAlert("地震発生")

 }

}