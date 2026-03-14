window.Heavenly = window.Heavenly || {};

(function(){

  function renderContent(container, contentItem){

    if(!container || !contentItem) return;

    if(contentItem.type === "text"){
      var text = document.createElement("div");
      text.className = "mediaText";
      text.innerText = contentItem.text || "";
      container.appendChild(text);
      return;
    }

    if(contentItem.type === "image"){
      var img = document.createElement("img");
      img.className = "mediaImage";
      img.src = contentItem.imageData || "";
      container.appendChild(img);
      return;
    }

    if(contentItem.type === "gif"){
      var gif = document.createElement("img");
      gif.className = "mediaGif";
      gif.src = contentItem.gifSrc || "";
      container.appendChild(gif);
      return;
    }

    if(contentItem.type === "emote"){
      var emote = document.createElement("img");
      emote.className = "mediaEmote";
      emote.src = contentItem.emoteSrc || "";
      container.appendChild(emote);
      return;
    }

  }

  window.Heavenly.media = window.Heavenly.media || {};
  window.Heavenly.media.renderContent = renderContent;

})();