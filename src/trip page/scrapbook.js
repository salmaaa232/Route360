// scrapbook.js — Route 360 Scrapbook
// ✅ Spawns new items where user can see (mouse OR visible viewport center)
// ✅ Auto-scrolls to new item
// ✅ Drawing layer (colors + thickness), saved in trip.scrapbook.drawStrokes
// jQuery + jQuery UI required
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const $ = window.jQuery;
    if (!$) return;

    const $stage = $("#sbStage");
    const $wrap = $("#sbWrap");
    const $tray = $("#sbStickerTray");

    // Scroll container (must be overflow:auto in CSS for scrolling to work)
    const $scroll = $("#sbScroll").length ? $("#sbScroll") : $wrap;

    if (!$stage.length || !$wrap.length) return;

    trip.scrapbook = trip.scrapbook || { bg: "#ffffff", zoom: 100, items: [] };
    trip.scrapbook.drawStrokes = trip.scrapbook.drawStrokes || []; // ✅ drawings persist

    // ---------------- helpers ----------------
    function uid(p = "sb") {
      return p + "_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
    }
    function clamp(n, a, b) {
      return Math.max(a, Math.min(b, n));
    }
    function safePersist() {
      try {
        persistTrip();
      } catch (e) {
        console.error(e);
      }
    }

    function getZoom() {
      return clamp(parseInt($("#sbZoom").val() || "100", 10), 70, 140);
    }

    function applyZoom(val) {
      const z = clamp(parseInt(val, 10) || 100, 70, 140) / 100;
      $stage.css("transform", `scale(${z})`);
      $stage.css("transform-origin", "top left");
    }

    function bringFront($el) {
      const maxZ = Math.max(
        1,
        ...$stage
          .children(".sb-item")
          .toArray()
          .map((n) => parseInt(n.style.zIndex || "1", 10))
      );
      $el.css("z-index", maxZ + 1);
    }

    function pop($el) {
      $el.removeClass("sb-pop");
      void $el[0].offsetWidth;
      $el.addClass("sb-pop");
      setTimeout(() => $el.removeClass("sb-pop"), 220);
    }

    // ---------------- pointer tracking ----------------
    const pointer = { x: 0, y: 0, inside: false };

    function updatePointerFromEvent(e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.inside = true;
    }

    $stage.on("mousemove", (e) => updatePointerFromEvent(e));
    $stage.on("mouseenter", (e) => updatePointerFromEvent(e));
    $stage.on("mouseleave", () => (pointer.inside = false));
    $stage.on("mousedown", (e) => updatePointerFromEvent(e));

    // ---------------- placement (FIXED + SCROLL) ----------------
    function stageInfo() {
      const z = getZoom() / 100;
      const stageW = $stage.outerWidth();
      const stageH = $stage.outerHeight();
      return { z, stageW, stageH };
    }

    // Convert client coords -> stage coords (unscaled), clamp inside stage
    function placeAtClientPoint($el, w, h, clientX, clientY) {
      const { z, stageW, stageH } = stageInfo();
      const rect = $stage[0].getBoundingClientRect();

      let x = (clientX - rect.left) / z - w / 2;
      let y = (clientY - rect.top) / z - h / 2;

      x = clamp(x, 0, Math.max(0, stageW - w));
      y = clamp(y, 0, Math.max(0, stageH - h));

      if (!isFinite(x) || !isFinite(y)) {
        x = 20;
        y = 20;
      }
      $el.css({ left: x + "px", top: y + "px" });
    }

    // ✅ place in the center of what the user can ACTUALLY SEE
    function placeInUserViewportCenter($el, w, h) {
      const { z, stageW, stageH } = stageInfo();
      const scrollEl = $scroll[0];
      if (!scrollEl) return;

      const viewRect = scrollEl.getBoundingClientRect();
      const stageRect = $stage[0].getBoundingClientRect();

      const visLeft = (viewRect.left - stageRect.left) / z;
      const visTop = (viewRect.top - stageRect.top) / z;
      const visW = viewRect.width / z;
      const visH = viewRect.height / z;

      let x = visLeft + visW / 2 - w / 2;
      let y = visTop + visH / 2 - h / 2;

      x = clamp(x, 0, Math.max(0, stageW - w));
      y = clamp(y, 0, Math.max(0, stageH - h));

      if (!isFinite(x) || !isFinite(y)) {
        x = 20;
        y = 20;
      }
      $el.css({ left: x + "px", top: y + "px" });
    }

    // ✅ auto-scroll viewport so the item is centered
    function scrollToItem($el) {
      const el = $scroll[0];
      if (!el) return;

      const z = getZoom() / 100;

      const attempt = () => {
        const viewW = el.clientWidth;
        const viewH = el.clientHeight;

        const left = parseFloat($el.css("left")) || 0;
        const top = parseFloat($el.css("top")) || 0;
        const w = $el.outerWidth() || 0;
        const h = $el.outerHeight() || 0;

        const targetLeft = Math.max(0, (left + w / 2) * z - viewW / 2);
        const targetTop = Math.max(0, (top + h / 2) * z - viewH / 2);

        el.scrollLeft = targetLeft;
        el.scrollTop = targetTop;
      };

      requestAnimationFrame(() => {
        attempt();
        requestAnimationFrame(attempt);
      });
    }

    // Main spawn: prefer mouse if inside; else visible viewport center; then scroll to it
    function spawnWhereUserSees($el, w, h) {
      const tryPlace = () => {
        const rect = $wrap[0].getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) {
          requestAnimationFrame(tryPlace);
          return;
        }

        if (pointer.inside) placeAtClientPoint($el, w, h, pointer.x, pointer.y);
        else placeInUserViewportCenter($el, w, h);

        requestAnimationFrame(() => {
          if (pointer.inside) placeAtClientPoint($el, w, h, pointer.x, pointer.y);
          else placeInUserViewportCenter($el, w, h);

          scrollToItem($el);
        });
      };

      tryPlace();
    }

    // ---------------- selection ----------------
    let $selected = null;

    function setRot($el, deg) {
      $el.attr("data-rot", String(deg));
      $el.css("transform", `rotate(${deg}deg)`);
    }
    function getRot($el) {
      const r = parseFloat($el.attr("data-rot") || "0");
      return isNaN(r) ? 0 : r;
    }

    function select($el) {
      $stage.find(".sb-item").removeClass("selected");
      $el.addClass("selected");
      $selected = $el;
      bringFront($el);
      $("#sbRotateSlider").slider("value", getRot($el));
    }
    function deselect() {
      $stage.find(".sb-item").removeClass("selected");
      $selected = null;
    }

    function syncEmojiScale($wrap) {
      if ($wrap.attr("data-type") !== "emoji") return;
      const w = $wrap.outerWidth();
      const h = $wrap.outerHeight();
      const size = Math.max(18, Math.floor(Math.min(w, h) * 0.65));
      $wrap.find(".sb-emoji").css("font-size", size + "px");
    }

    // ---------------- interactions ----------------
    function makeInteractive($wrap) {
      try { $wrap.draggable("destroy"); } catch {}
      try { $wrap.resizable("destroy"); } catch {}

      $wrap.draggable({
        containment: $stage,
        cancel: ".ui-resizable-handle,[contenteditable=true]",
        start: () => select($wrap),
        stop: (e, ui) => {
          $wrap.css({ left: ui.position.left, top: ui.position.top });
          pop($wrap);
          serialize();
        }
      });

      $wrap.resizable({
        containment: $stage,
        handles: "n,e,s,w,ne,nw,se,sw",
        start: () => select($wrap),
        resize: () => syncEmojiScale($wrap),
        stop: (e, ui) => {
          $wrap.css({
            left: ui.position.left,
            top: ui.position.top,
            width: ui.size.width,
            height: ui.size.height
          });
          syncEmojiScale($wrap);
          makeInteractive($wrap);
          pop($wrap);
          serialize();
        }
      });

      $wrap.on("mousedown", (e) => { e.stopPropagation(); select($wrap); });
      $wrap.on("dblclick", (e) => {
        e.stopPropagation();
        if (confirm("Delete this item?")) {
          $wrap.remove();
          serialize();
        }
      });
    }

    // ---------------- DRAWING LAYER ----------------
    // Canvas overlay inside stage; stored as vector strokes in trip.scrapbook.drawStrokes
    const $draw = $('<canvas id="sbDrawCanvas" class="sb-draw-canvas"></canvas>');
    // Keep canvas visually above items, but pointer-events off unless drawMode is on
    $draw.css({ position: "absolute", left: 0, top: 0, zIndex: 9999, pointerEvents: "none" });
    $stage.append($draw);

    const drawCanvas = $draw[0];
    const dctx = drawCanvas.getContext("2d");

    let drawMode = false;
    let drawing = false;
    let currentStroke = null;

    function resizeDrawCanvasToStage() {
      const w = Math.max(1, Math.round($stage.outerWidth() || 1));
      const h = Math.max(1, Math.round($stage.outerHeight() || 1));
      if (drawCanvas.width !== w) drawCanvas.width = w;
      if (drawCanvas.height !== h) drawCanvas.height = h;
    }

    function clientToStage(clientX, clientY) {
      const { z } = stageInfo();
      const rect = $stage[0].getBoundingClientRect();
      return { x: (clientX - rect.left) / z, y: (clientY - rect.top) / z };
    }

    function drawOneStroke(ctx, s) {
      const pts = s.points || [];
      if (pts.length < 2) return;

      ctx.save();
      ctx.strokeStyle = s.color || "#111";
      ctx.lineWidth = Math.max(1, s.size || 6);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);

      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.restore();
    }

    function redrawAllStrokes() {
      resizeDrawCanvasToStage();
      dctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      (trip.scrapbook.drawStrokes || []).forEach((s) => drawOneStroke(dctx, s));
    }

    function setDrawMode(on) {
      drawMode = !!on;
      // Pointer events ON only while drawing
      $draw.css("pointer-events", drawMode ? "auto" : "none");
      // Optional: disable item interaction while drawing (prevents drag conflicts)
      $stage.toggleClass("is-drawing", drawMode);
      $("#sbDrawToggle").toggleClass("active", drawMode);

      if (drawMode) deselect();
    }

    function startStroke(clientX, clientY) {
      if (!drawMode) return;

      const color = $("#sbPenColor").val() || "#111111";
      const size = parseInt($("#sbPenSize").val() || "6", 10);

      currentStroke = { color, size, points: [] };
      trip.scrapbook.drawStrokes.push(currentStroke);

      const p = clientToStage(clientX, clientY);
      currentStroke.points.push(p);

      drawing = true;
      redrawAllStrokes();
    }

    function addStrokePoint(clientX, clientY) {
      if (!drawMode || !drawing || !currentStroke) return;

      const p = clientToStage(clientX, clientY);
      const pts = currentStroke.points;
      const last = pts[pts.length - 1];

      const dx = p.x - last.x;
      const dy = p.y - last.y;
      if (dx * dx + dy * dy < 4) return; // ~2px threshold

      pts.push(p);
      redrawAllStrokes();
    }

    function endStroke() {
      if (!drawMode) return;
      drawing = false;
      currentStroke = null;
      serialize();
    }

    // Mouse
    $draw.on("mousedown", (e) => {
      if (!drawMode) return;
      e.preventDefault(); e.stopPropagation();
      startStroke(e.clientX, e.clientY);
    });
    $draw.on("mousemove", (e) => {
      if (!drawMode || !drawing) return;
      e.preventDefault(); e.stopPropagation();
      addStrokePoint(e.clientX, e.clientY);
    });
    $(window).on("mouseup", () => {
      if (drawing) endStroke();
    });

    // Touch
    $draw.on("touchstart", (e) => {
      if (!drawMode) return;
      const t = e.originalEvent.touches[0];
      if (!t) return;
      e.preventDefault(); e.stopPropagation();
      startStroke(t.clientX, t.clientY);
    });
    $draw.on("touchmove", (e) => {
      if (!drawMode || !drawing) return;
      const t = e.originalEvent.touches[0];
      if (!t) return;
      e.preventDefault(); e.stopPropagation();
      addStrokePoint(t.clientX, t.clientY);
    });
    $draw.on("touchend touchcancel", (e) => {
      if (!drawMode) return;
      if (drawing) { e.preventDefault(); e.stopPropagation(); endStroke(); }
    });

    // Drawing UI
    $("#sbDrawToggle").on("click", () => setDrawMode(!drawMode));
    $("#sbClearDraw").on("click", () => {
      if (!confirm("Clear all drawings?")) return;
      trip.scrapbook.drawStrokes = [];
      redrawAllStrokes();
      serialize();
    });

    // ---------------- serialize ----------------
    function serialize() {
      const items = [];
      $stage.children(".sb-item").each(function () {
        const $it = $(this);
        const type = $it.attr("data-type");
        const id = $it.attr("data-id");

        const x = parseFloat($it.css("left")) || 0;
        const y = parseFloat($it.css("top")) || 0;
        const w = $it.outerWidth() || 140;
        const h = $it.outerHeight() || 140;
        const z = parseInt($it.css("z-index") || "3", 10);
        const rot = getRot($it);

        if (type === "photo") {
          items.push({ id, type, x, y, w, h, z, rot, src: $it.find("img").attr("src") || "" });
        } else if (type === "emoji") {
          items.push({ id, type, x, y, w, h, z, rot, emoji: $it.attr("data-emoji") || "✨" });
        } else if (type === "stickerimg") {
          items.push({ id, type, x, y, w, h, z, rot, src: $it.find("img").attr("src") || "" });
        } else if (type === "text") {
          items.push({ id, type, x, y, w, h, z, rot, text: ($it.text() || "").trim() });
        }
      });

      trip.scrapbook.items = items;
      trip.scrapbook.zoom = getZoom();
      trip.scrapbook.bg = $("#sbCanvasBg").val() || "#ffffff";
      trip.scrapbook.drawStrokes = trip.scrapbook.drawStrokes || [];

      safePersist();
    }

    // ---------------- image compress ----------------
    async function fileToDataURL(file, maxSize = 1400, quality = 0.85) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });

      const w = img.naturalWidth || 1;
      const h = img.naturalHeight || 1;
      const scale = Math.min(1, maxSize / Math.max(w, h));
      const tw = Math.max(1, Math.round(w * scale));
      const th = Math.max(1, Math.round(h * scale));

      const c = document.createElement("canvas");
      c.width = tw;
      c.height = th;
      c.getContext("2d").drawImage(img, 0, 0, tw, th);
      URL.revokeObjectURL(url);

      return c.toDataURL("image/jpeg", quality);
    }

    // ---------------- add items ----------------
    function addPhoto(src) {
      const id = uid("photo");
      const $el = $(`<div class="sb-item sb-photo" data-id="${id}" data-type="photo"></div>`);
      $el.append($(`<img alt="photo">`).attr("src", src));
      $stage.append($el);

      const W = 260, H = 180;
      $el.width(W).height(H);
      $el.css("z-index", 3);

      spawnWhereUserSees($el, W, H);

      setRot($el, 0);
      makeInteractive($el);
      select($el);
      pop($el);
      serialize();
    }

    function addEmoji(emoji) {
      const id = uid("emoji");
      const $el = $(`<div class="sb-item" data-id="${id}" data-type="emoji" data-emoji="${emoji}"></div>`);
      $el.append(`<div class="sb-emoji">${emoji}</div>`);
      $stage.append($el);

      const W = 140, H = 140;
      $el.width(W).height(H);
      $el.css("z-index", 3);

      spawnWhereUserSees($el, W, H);

      setRot($el, 0);
      syncEmojiScale($el);
      makeInteractive($el);
      select($el);
      pop($el);
      serialize();
    }

    function addStickerImg(src) {
      const id = uid("stickerimg");
      const $el = $(`<div class="sb-item sb-stickerimg" data-id="${id}" data-type="stickerimg"></div>`);
      $el.append($(`<img alt="sticker">`).attr("src", src));
      $stage.append($el);

      const W = 160, H = 160;
      $el.width(W).height(H);
      $el.css("z-index", 3);

      spawnWhereUserSees($el, W, H);

      setRot($el, 0);
      makeInteractive($el);
      select($el);
      pop($el);
      serialize();
    }

    function addText() {
      const id = uid("text");
      const $el = $(`<div class="sb-item sb-text" data-id="${id}" data-type="text" contenteditable="true">My cute memory ✨</div>`);
      $stage.append($el);

      const W = 260, H = 70;
      $el.width(W).height(H);
      $el.css("z-index", 3);

      spawnWhereUserSees($el, W, H);

      setRot($el, 0);
      makeInteractive($el);
      select($el);
      pop($el);

      $el.on("input blur", () => serialize());
      setTimeout(() => $el[0].focus(), 0);
      serialize();
    }

    // ---------------- UI bindings ----------------
    $("#sbStickerTrayBtn").on("click", () => $tray.toggleClass("hide"));

    $tray.on("click", ".sb-tray-btn", function () {
      addEmoji($(this).data("emoji") || "✨");
    });

    $("#sbAddText").on("click", addText);

    $("#sbUpload").on("change", async function (e) {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        addPhoto(await fileToDataURL(f));
      } catch (err) {
        console.error(err);
      } finally {
        $("#sbUpload").val("");
      }
    });

    $("#sbCanvasBg").on("input", function () {
      $("#sbWrap").css("background", this.value);
      serialize();
    });

    $("#sbZoom").on("input", function () {
      applyZoom(this.value);
      // keep drawing backing canvas correct (stage scales visually but backing size should match stage)
      redrawAllStrokes();
    });
    $("#sbZoom").on("change", () => serialize());

    $("#sbRotateSlider").slider({
      min: -180, max: 180, value: 0,
      slide: (e, ui) => { if ($selected) setRot($selected, ui.value); },
      stop: () => { if ($selected) { pop($selected); serialize(); } }
    });

    $("#sbFront").on("click", () => { if ($selected) { bringFront($selected); serialize(); } });

    $("#sbBack").on("click", () => {
      if (!$selected) return;
      $selected.css("z-index", Math.max(1, (parseInt($selected.css("z-index") || "3", 10) - 1)));
      serialize();
    });

    $("#sbDuplicate").on("click", () => {
      if (!$selected) return;
      const $c = $selected.clone(false);
      $c.attr("data-id", uid("dup")).removeClass("selected");
      $c.css("z-index", 3);

      const W = $c.outerWidth() || 140;
      const H = $c.outerHeight() || 140;
      $stage.append($c);
      spawnWhereUserSees($c, W, H);

      if ($c.attr("data-type") === "text") {
        $c.attr("contenteditable", "true");
        $c.on("input blur", () => serialize());
      }
      syncEmojiScale($c);
      makeInteractive($c);
      select($c);
      pop($c);
      serialize();
    });

    $stage.on("mousedown", (e) => {
      // If drawing mode is on, don't deselect on stage clicks (canvas is handling drawing)
      if (drawMode) return;
      if ($(e.target).closest(".sb-item").length) return;
      deselect();
    });

    $(document).on("keydown", (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && $selected) {
        if ($selected.attr("data-type") === "text" && document.activeElement === $selected[0]) return;
        $selected.remove();
        $selected = null;
        serialize();
      }
    });

    $("#sbClear").on("click", () => {
      if (!confirm("Clear scrapbook?")) return;
      $stage.find(".sb-item").remove(); // keep draw canvas
      trip.scrapbook.items = [];
      safePersist();
    });

    $("#sbExport").on("click", async () => {
      if (!window.html2canvas) return alert("html2canvas not loaded.");
      const bg = $("#sbCanvasBg").val() || "#ffffff";
      try {
        const canvas = await window.html2canvas($("#sbWrap")[0], { backgroundColor: bg, scale: 2 });
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = (trip.title || "trip") + "_scrapbook.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err) {
        console.error(err);
        alert("Export failed.");
      }
    });

    // ---------------- Sticker Maker modal (UNCHANGED from your file) ----------------
    const $modal = $("#sbModal");
    const $preview = $("#sbPreview")[0];
    const pctx = $preview.getContext("2d");
    const $crop = $("#sbCropBox");
    let makerImg = null;
    let eraserOn = false;

    function openModal() {
      $modal.removeClass("hide").attr("aria-hidden", "false");
      $("body").css("overflow", "hidden");
      $tray.addClass("hide");
    }
    function closeModal() {
      $modal.addClass("hide").attr("aria-hidden", "true");
      $("body").css("overflow", "");
      eraserOn = false;
      $("#sbEraserToggle").removeClass("active");
    }

    $("#sbStickerMakerBtn").on("click", openModal);
    $("#sbModalClose").on("click", closeModal);

    $crop.draggable({ containment: ".sb-preview-wrap" })
      .resizable({ containment: ".sb-preview-wrap" });

    function hexToRgb(hex) {
      const m = (hex || "").replace("#", "").trim();
      return {
        r: parseInt(m.slice(0, 2), 16) || 255,
        g: parseInt(m.slice(2, 4), 16) || 255,
        b: parseInt(m.slice(4, 6), 16) || 255
      };
    }

    function drawPreviewBase() {
      pctx.clearRect(0, 0, $preview.width, $preview.height);
      if (!makerImg) return;

      const cw = $preview.width, ch = $preview.height;
      const scale = Math.min(cw / makerImg.width, ch / makerImg.height);
      const dw = makerImg.width * scale;
      const dh = makerImg.height * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;
      pctx.drawImage(makerImg, dx, dy, dw, dh);
    }

    function applyToleranceRemove() {
      if (!makerImg) return;
      drawPreviewBase();

      const bg = hexToRgb($("#sbRemoveColor").val());
      const tol = parseInt($("#sbTol").val() || "35", 10);

      const imgData = pctx.getImageData(0, 0, $preview.width, $preview.height);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        const dist = Math.abs(d[i] - bg.r) + Math.abs(d[i + 1] - bg.g) + Math.abs(d[i + 2] - bg.b);
        if (dist <= tol * 3) d[i + 3] = 0;
      }
      pctx.putImageData(imgData, 0, 0);
    }

    async function fileToImage(file) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      URL.revokeObjectURL(url);
      return img;
    }

    $("#sbStickerFile").on("change", async function (e) {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        makerImg = await fileToImage(f);
        applyToleranceRemove();
      } catch (err) {
        console.error(err);
        alert("Could not load image.");
      } finally {
        $("#sbStickerFile").val("");
      }
    });

    $("#sbRemoveColor,#sbTol").on("input change", applyToleranceRemove);

    $("#sbEraserToggle").on("click", function () {
      eraserOn = !eraserOn;
      $(this).toggleClass("active", eraserOn);
    });

    let erasing = false;
    function previewPoint(e) {
      const rect = $preview.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    $($preview).on("mousedown", (e) => {
      if (!eraserOn) return;
      erasing = true;
      eraseAt(previewPoint(e));
    });
    $($preview).on("mousemove", (e) => {
      if (!eraserOn || !erasing) return;
      eraseAt(previewPoint(e));
    });
    $(window).on("mouseup", () => { erasing = false; });

    function eraseAt(p) {
      const r = parseInt($("#sbBrush").val() || "16", 10);
      pctx.save();
      pctx.globalCompositeOperation = "destination-out";
      pctx.beginPath();
      pctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      pctx.fill();
      pctx.restore();
    }

    function cropToBox() {
      const wrap = $(".sb-preview-wrap")[0].getBoundingClientRect();
      const box = $crop[0].getBoundingClientRect();
      const sx = box.left - wrap.left;
      const sy = box.top - wrap.top;
      const sw = box.width;
      const sh = box.height;

      const out = document.createElement("canvas");
      out.width = Math.round(sw);
      out.height = Math.round(sh);
      out.getContext("2d").drawImage($preview, sx, sy, sw, sh, 0, 0, out.width, out.height);
      return out;
    }

    function addOutline(canvas, type) {
      if (type === "none") return canvas;

      const out = document.createElement("canvas");
      out.width = canvas.width + 20;
      out.height = canvas.height + 20;
      const ctx = out.getContext("2d");
      ctx.translate(10, 10);

      let color = "rgba(255,255,255,.98)";
      if (type === "pink") color = "rgba(255,107,107,.9)";
      if (type === "black") color = "rgba(0,0,0,.85)";

      ctx.save();
      for (let oy = -4; oy <= 4; oy++) {
        for (let ox = -4; ox <= 4; ox++) {
          if (ox === 0 && oy === 0) continue;
          ctx.drawImage(canvas, ox, oy);
        }
      }
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = color;
      ctx.fillRect(-9999, -9999, 20000, 20000);
      ctx.restore();

      if (type === "glow") {
        ctx.save();
        ctx.shadowColor = "rgba(185,131,255,.70)";
        ctx.shadowBlur = 18;
        ctx.drawImage(canvas, 0, 0);
        ctx.restore();
      }

      ctx.drawImage(canvas, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return out;
    }

    $("#sbAddStickerFromMaker").on("click", () => {
      if (!makerImg) return alert("Upload an image first.");
      const cropped = cropToBox();
      const outlined = addOutline(cropped, $("#sbOutline").val());
      const dataUrl = outlined.toDataURL("image/png");
      addStickerImg(dataUrl);
      closeModal();
    });

    // ---------------- render saved scrapbook ----------------
    function render() {
      $("#sbCanvasBg").val(trip.scrapbook.bg || "#ffffff");
      $("#sbWrap").css("background", trip.scrapbook.bg || "#ffffff");

      $("#sbZoom").val(trip.scrapbook.zoom || 100);
      applyZoom(trip.scrapbook.zoom || 100);

      // keep draw canvas, remove items only
      $stage.find(".sb-item").remove();

      (trip.scrapbook.items || []).forEach((it) => {
        let $el;

        if (it.type === "photo") {
          $el = $(`<div class="sb-item sb-photo" data-id="${it.id}" data-type="photo"></div>`);
          $el.append($(`<img alt="photo">`).attr("src", it.src || ""));
        } else if (it.type === "emoji") {
          $el = $(`<div class="sb-item" data-id="${it.id}" data-type="emoji" data-emoji="${it.emoji || "✨"}"></div>`);
          $el.append(`<div class="sb-emoji">${it.emoji || "✨"}</div>`);
        } else if (it.type === "stickerimg") {
          $el = $(`<div class="sb-item sb-stickerimg" data-id="${it.id}" data-type="stickerimg"></div>`);
          $el.append($(`<img alt="sticker">`).attr("src", it.src || ""));
        } else if (it.type === "text") {
          $el = $(`<div class="sb-item sb-text" data-id="${it.id}" data-type="text" contenteditable="true"></div>`);
          $el.text(it.text || "My cute memory ✨");
          $el.on("input blur", () => serialize());
        } else {
          return;
        }

        $el.css({
          left: (it.x || 0) + "px",
          top: (it.y || 0) + "px",
          zIndex: it.z || 3
        });
        $el.width(it.w || 140).height(it.h || 140);
        setRot($el, it.rot || 0);

        $stage.append($el);

        syncEmojiScale($el);
        makeInteractive($el);
      });

      // redraw drawings after stage is ready
      redrawAllStrokes();
    }

    // Hook into tab system
    const originalShowTab = window.showTab;
    window.showTab = function (name) {
      if (typeof originalShowTab === "function") originalShowTab(name);
      if (name === "scrapbook") {
        render();
        // Make sure drawing canvas backing is correct after becoming visible
        requestAnimationFrame(() => redrawAllStrokes());
      }
    };

    // Keep draw canvas correct on resize
    $(window).on("resize", () => redrawAllStrokes());

    // Initial render
    render();
    redrawAllStrokes();
  });
})();
