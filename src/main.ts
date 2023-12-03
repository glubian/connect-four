import { FocusTrap } from "focus-trap-vue";
import { createApp } from "vue";
import App from "./App.vue";

import "./assets/main.scss";
import { i18n } from "./i18n";
import "./theme";

createApp(App).component("FocusTrap", FocusTrap).use(i18n).mount("#app");
