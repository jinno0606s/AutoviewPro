export function createMockCtx(){

  return {
    camera: {
      id: 1,
      name: "TEST_CAMERA",
      lat: 35.86,
      lng: 139.64
    },

    now: new Date(),

    frame: "./test/sample.jpg",

    saveFile: async ({ cameraId, path })=>{
      console.log("SAVE FILE:", cameraId, path)
    },

    emitEvent: (ev)=>{
      console.log("EVENT:", ev)
    },

    log: (...args)=>{
      console.log("[PLUGIN]", ...args)
    }

  }
}