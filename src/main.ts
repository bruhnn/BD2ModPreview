import { createApp } from "vue";
import { createPinia } from "pinia";
import interact from "interactjs";
import App from "./App.vue";

import './styles/main.css'
import { createI18n } from "vue-i18n";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia)

app.directive("draggable-resizable", {
  mounted(el) {
    interact(el)
      .draggable({
        inertia: true,
        allowFrom: ".drag-handle",
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: 'parent',
            endOnly: true
          })
        ],
        autoScroll: true,
        listeners: {
          move(event) {
            const target = event.target
            let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
            let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

            target.style.transform = `translate(${x}px, ${y}px)`
            target.setAttribute('data-x', x)
            target.setAttribute('data-y', y)
          }
        }
      })
      .resizable({
        edges: { top: true, left: true, bottom: true, right: true },
        inertia: false,
        listeners: {
          move: function (event) {
            let { x, y } = event.target.dataset

            x = (parseFloat(x) || 0) + event.deltaRect.left
            y = (parseFloat(y) || 0) + event.deltaRect.top

            Object.assign(event.target.style, {
              width: `${event.rect.width}px`,
              height: `${event.rect.height}px`,
              transform: `translate(${x}px, ${y}px)`
            })

            Object.assign(event.target.dataset, { x, y })
          }
        }
      });
  }
})

import { i18n } from "./i18n";
app.use(i18n);


app.mount("#app");

