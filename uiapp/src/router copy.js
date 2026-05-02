import { createRouter, createWebHashHistory } from "vue-router"

import DashboardView from "./views/DashboardView.vue"
import CameraSettingsView from "./views/CameraSettingsView.vue"
import LayoutSettings from "./views/LayoutSettings.vue"
import MapView from "./views/MapView.vue"
import SpeakerSettingsView from "./views/SpeakerSettingsView.vue"
import MapPickerView from "./views/MapPickerView.vue"

export default createRouter({

  history: createWebHashHistory(),

  routes:[
    {path:"/",component:DashboardView},
    {path:"/cameras",component:CameraSettingsView},
    {path:"/speakers",component:SpeakerSettingsView},
    {path:"/layouts",component:LayoutSettings},
//    {path:"/map",component:MapView},
    {path: "/map-picker", component: MapPickerView }
  ]

})