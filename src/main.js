
import Gravity from "gravity";
import ready from "domReady";

console.log('document.readyState', document.readyState);
console.log('listening for DOMContentLoaded event');
ready(function() {
  console.log('dom loaded.');
  window.gravity = new Gravity(document.body);
});
