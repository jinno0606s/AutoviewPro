import { createRouter, createWebHashHistory } from "vue-router"

import DashboardView from "./views/DashboardView.vue"
import CameraSettingsView from "./views/CameraSettingsView.vue"
import SpeakerSettingsView from "./views/SpeakerSettingsView.vue"
import ManualEventView from "./views/ManualEventView.vue"
import LayoutSettings from "./views/LayoutSettings.vue"
import MonitoringCenterView from "./views/MonitoringCenterView.vue"
import EventListView from "./views/EventListView.vue"
import TimelapseView from "./views/TimelapseView.vue"
import PeopleCountView from "./views/PeopleCountView.vue"
import CoastalMonitorView from "./views/CoastalMonitorView.vue"
import InitSystemView from "./views/InitSystemView.vue"

const routes = [
  { path: "/", component: DashboardView },
  { path: "/cameras", component: CameraSettingsView },
  { path: "/speakers", component: SpeakerSettingsView },
  { path: "/manual-event", component: EventListView },
  { path: "/layouts", component: LayoutSettings },
  { path: "/monitoring-center", component: MonitoringCenterView },
   { path: "/event/timelapse", component: TimelapseView },
  { path: "/event/people", component: PeopleCountView },
  { path: "/event/coastal", component: CoastalMonitorView },
   { path: "/init", component: InitSystemView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router