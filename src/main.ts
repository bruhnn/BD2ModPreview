import { createApp } from "vue";
import App from "./App.vue";
import interact from "interactjs";

import './styles/main.css'
import './styles/spine-player-4.1.css'

const app = createApp(App);

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
        edges: { left: true, right: true, bottom: true, top: true },
        inertia: true,
        modifiers: [
          interact.modifiers.restrictEdges({
            outer: "parent"
          }),
          interact.modifiers.restrictSize({
            min: { width: 100, height: 50 }
          })
        ],
        listeners: {
          move(event) {
            const target = event.target;
            let x = parseFloat(target.getAttribute("data-x")) || 0;
            let y = parseFloat(target.getAttribute("data-y")) || 0;

            // Update size
            target.style.width = event.rect.width + "px";
            target.style.height = event.rect.height + "px";

            // Translate position if resizing from top/left
            x += event.deltaRect.left;
            y += event.deltaRect.top;

            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute("data-x", x);
            target.setAttribute("data-y", y);
          }
        }
      });
    }
})

app.directive("resizable-left", {
    mounted(el) {
        interact(el)
        .resizable({
        edges: { left: true, right: false, bottom: false, top: false },
        inertia: true,
        modifiers: [
          interact.modifiers.restrictEdges({
            outer: "parent"
          }),
          interact.modifiers.restrictSize({
            min: { width: 100, height: 50 }
          })
        ],
        listeners: {
          move(event) {
            const target = event.target;
            let x = parseFloat(target.getAttribute("data-x")) || 0;
            let y = parseFloat(target.getAttribute("data-y")) || 0;

            // Update size
            target.style.width = event.rect.width + "px";
            target.style.height = event.rect.height + "px";

            // Translate position if resizing from top/left
            x += event.deltaRect.left;
            y += event.deltaRect.top;

            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute("data-x", x);
            target.setAttribute("data-y", y);
          }
        }
      });
    }
})

app.mount("#app");
