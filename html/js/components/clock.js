window.Heavenly = window.Heavenly || {};
Heavenly.clock = Heavenly.clock || {};

(function(){
  let timer = null;

  Heavenly.clock.settings = Heavenly.clock.settings || {
    mode: "local", // "local" | "server"
    serverOffsetMs: 0
  };

  function pad(n){
    return String(n).padStart(2, "0");
  }

  function getNow(){
    if(Heavenly.clock.settings.mode === "server"){
      return new Date(Date.now() + Heavenly.clock.settings.serverOffsetMs);
    }
    return new Date();
  }

  function render(){
    const timeEl = document.getElementById("clockTime");
    const dateEl = document.getElementById("clockDate");
    if(!timeEl || !dateEl) return;

    const now = getNow();

    timeEl.textContent =
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    dateEl.textContent =
      `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
  }

  function start(){
    stop();
    render();
    timer = setInterval(render, 1000);
  }

  function stop(){
    if(timer){
      clearInterval(timer);
      timer = null;
    }
  }

  function setMode(mode){
    Heavenly.clock.settings.mode = (mode === "server") ? "server" : "local";
    render();
  }

  function setServerTime(serverTimestampMs){
    if(typeof serverTimestampMs !== "number") return;
    Heavenly.clock.settings.serverOffsetMs = serverTimestampMs - Date.now();
    render();
  }

  Heavenly.clock.start = start;
  Heavenly.clock.stop = stop;
  Heavenly.clock.setMode = setMode;
  Heavenly.clock.setServerTime = setServerTime;

  window.addEventListener("message", function(event){
    const data = event.data;
    if(!data || data.action !== "heavenly:setClock") return;

    if(data.mode){
      Heavenly.clock.setMode(data.mode);
    }

    if(typeof data.serverTime === "number"){
      Heavenly.clock.setServerTime(data.serverTime);
    }
  });
})();