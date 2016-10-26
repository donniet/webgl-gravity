
export default function domReady(callback) {
  if (document.readyState == "complete" || document.readyState == "loaded" || document.readyState == "interactive") {
    callback();
  } else {
    document.addEventListener("DOMContentLoaded", callback);
  }
}
