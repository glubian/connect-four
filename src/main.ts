import { createApp } from "vue";
import App from "./App.vue";
import { FocusTrap } from "focus-trap-vue";

import "./assets/main.scss";
import { i18n } from "./i18n";

createApp(App).component("FocusTrap", FocusTrap).use(i18n).mount("#app");
