!(() =>
// in IIFE so nothing in the global scope, no export either
{
  const __DEFAULTVIDEO__ = "gebarsten_emmer";
  const __TAG_VIDEO_MANAGER__ = "video-manager";

    let $ = (x, root = document) => root.getElementById(x);
    let createElement = (tag, content = {}, inject = false) => (
      (tag = document.createElement(tag, { is: content.is })),
      typeof content === "string"
        ? (tag.innerHTML = content)
        : //todo add append
          Object.keys(content).map((attr) => {
            if (tag.hasOwnProperty(attr)) {
              tag[attr] = content[attr];
            } else tag.setAttribute(attr, content[attr]);
          }),
      //console.log(tag)            ,
      inject ? inject.append(tag) : null,
      tag // return
    );

    function formatSecondsAsTime(secs, msec, format) {
      var hr = Math.floor(secs / 3600);
      var min = Math.floor((secs - hr * 3600) / 60);
      var sec = Math.floor(secs - hr * 3600 - min * 60);
      var msec_accuracy = 1000;
      msec = msec
        ? "." + Math.floor(((secs % 1000) - sec) * msec_accuracy)
        : ""; //empty if second parameter msec==false

      if (hr < 10) {
        hr = "0" + hr;
      }
      if (min < 10) {
        min = "0" + min;
      }
      if (sec < 10) {
        sec = "0" + sec;
      }
      if (hr) {
        hr = "00";
      }

      if (format != null) {
        var formatted_time = format.replace("hh", hr);
        formatted_time = formatted_time.replace("h", hr * 1 + ""); // check for single hour formatting
        formatted_time = formatted_time.replace("mm", min);
        formatted_time = formatted_time.replace("m", min * 1 + ""); // check for single minute formatting
        formatted_time = formatted_time.replace("ss", sec);
        formatted_time = formatted_time.replace("s", sec * 1 + ""); // check for single second formatting
        return formatted_time;
      } else {
        return hr + ":" + min + ":" + sec + msec;
      }
    }
    /*
        load
        loadstart			Fired when the user agent begins looking for media data.
        loadedmetadata		Fired when the player has initial duration and dimension information.
        loadeddata			Fired when the player has downloaded data at the current playback position.
        loadedalldata		Fired when the player has finished downloading the source data.
        canplay				Fired when
        play				Fired whenever the media begins or resumes playback.
        pause				Fired whenever the media has been paused.
        timeupdate			Fired when the current playback position has changed. During playback this is fired every
        15-250 milliseconds, depending on the playback technology in use.
        ended				Fired when the end of the media resource is reached. currentTime == duration
        durationchange		Fired when the duration of the media resource is changed, or known for the first time.
        progress			Fired while the user agent is downloading media data.
        resize				Fired when the width and/or height of the video window changes.
        volumechange		Fired when the volume changes.
        error				Fired when there is an error in playback.
        fullscreenchange	Fired when the player switches in or out of fullscreen mode.
     */

    let log = function () {
      let args = [...arguments];
      console.log(`%c RT Video: ${args.shift()}`, "background:gold", ...args);
    };

    let attachListeners = ({
      root = window,
      eventlog = function (evt) {
        let args = [...arguments];
        args.shift();
        log("%c evt", "color:red", evt.type, ...args);
      },
      name = { [window]: "window", [document]: "document" }[root] ||
        root.nodeName,
      events = [
        // ["load"],
        // ["DOMContentLoaded"],
        // ["readystatechange"],
      ],
    }) =>
      events.map(([eventName, eventFunc = eventlog]) => {
        let func = (evt) => {
          eventlog(evt);
          return eventFunc(evt);
        };
        root.addEventListener(eventName, func);
        return () => root.removeEventListener(eventName, func);
      });

    class RTElement extends HTMLElement {
      constructor() {
        super();
        this.params = new URLSearchParams(location.search);
      } // constructor
      dispatch({
        name = this.nodeName,
        bubbles = true,
        composed = true,
        detail = {},
        from = this,
      }) {
        from.dispatchEvent(
          new CustomEvent(name, {
            detail,
            bubbles,
            composed,
          })
        );
      } // dispatch
      closestElement(selector, base = this) {
        function __closestFrom(el) {
          if (!el || el === document || el === window) return null;
          let found = el.closest(selector);
          if (found) return found;
          else __closestFrom(el.getRootNode().host);
        }

        return __closestFrom(base);
      } // closestElement
    }

    customElements.define(
      "roads-video",
      class extends RTElement {
        constructor() {
          super();

          // URL parameters
          this.videofilename = this.params.get("video") || __DEFAULTVIDEO__;

          this.videolanguage = this.params.get("lang") || "nl";
          VideoData.innerHTML = `video= ${this.videofilename} - lang= ${this.videolanguage}`;
          // Listeners
          this.removeListeners = [
            ...attachListeners(window),
            ...attachListeners(document),
            ...attachListeners(this),
          ];
          // init HTML
          let html = document
            .getElementById(this.nodeName)
            .innerHTML.replaceAll("[VIDEO]", this.videofilename)
            .replaceAll("[LANG]", this.videolanguage);

          this.attachShadow({ mode: "open" }).innerHTML = html;

          this.currentChapter = 1;
          this.lastChapter = 0;
          this.initElement = true; // canplay event fires also on seek!
        }
        $(selector) {
          return this.shadowRoot.querySelector(selector);
        }
        title(txt) {
          this.$("#title").innerHTML = txt;//+ " " + this.getAttribute("title");
        }
        play() {
          this.classList.add("playing");
          this.playbutton.classList.add("playing");
          this.title("Playing");
          this.video.play();
        }
        pause() {
          this.classList.remove("playing");
          this.playbutton.classList.remove("playing");
          this.title("Paused");
          this.video.pause();
        }
        get paused() {
          return this.playbutton.classList.contains("playing");
        }
        toggle() {
          if (!this.paused) this.play();
          else this.pause();
        }
        seek(chapter) {
          //this.currentChapter = 1;
          this.chapters.map((chapter) => chapter.div.seen(false));
          this.video.currentTime = chapter.getAttribute("time");
          this.play();
          this.play();
        }
        connectedCallback() {
          window.setTimeout(() => {
            let videoManager = this.closestElement(__TAG_VIDEO_MANAGER__);
            videoManager.videofilename = this.videofilename;
            let $element = this;
            this.video = this.$("video");
            this.playbutton = this.$(".play-button");
            log("Ready");
            attachListeners({
              root: this.video,
              events: [
                ["loadstart"],
                ["loadedmetadata"],
                ["loadeddata"],
                ["play"],
                ["pause"],
                [
                  "timeupdate",
                  function (evt) {
                    let timestamp = $element.video.currentTime;
                    $element.$(".time").innerHTML = formatSecondsAsTime(
                      timestamp,
                      true
                    );
                    let chapter,
                      nr = 0;
                    chapter = $element.chapters[nr];
                    while (chapter && timestamp > chapter.time) {
                      chapter.div.seen(true);
                      //console.log(timestamp > chapter.time, $element.currentChapter, $element.lastChapter)
                      chapter = $element.chapters[++nr];
                    }
                    $element.currentChapter = nr;
                    $element.setAttribute("chapter", $element.currentChapter);
                  },
                ],
                [
                  "canplay",
                  function (evt) {
                    //$element.pause();
                    //$element.pause();
                    //this = <video>
                    if ($element.initElement) {
                      $element.video.addEventListener("click", (evt) =>
                        $element.toggle()
                      );
                      $element.playbutton.addEventListener("click", (evt) =>
                        $element.toggle()
                      );
                      $element.setAttribute("chapter", $element.currentChapter);
                      $element.pause();
                    }
                    $element.initElement = false;
                  },
                ],
                [
                  "ended",
                  function (evt) {
                    //$element.pause();
                    $element.title("Ended");
                  },
                ],
              ],
            });
            this.setDefaultTrack();
            this.loadChapters("timecodes");
            this.setLanguage();
          }); // setTimeout
        } // connectedCallback
        setDefaultTrack(lang = this.videolanguage) {
          let track = this.$(`[srclang="${lang}"]`);
          if (track) track?.setAttribute("default", "default");
          else log("No track", lang);
        } //setDefaultTrack
        loadChapters(str = this.innerHTML) {
          if (this.params.get("tc") || str == "timecodes") {
            let tc = Number(this.params.get("tc") || 30);
            log(str);
            let timecodes = "";
            for (let timeseconds = 0; timeseconds < 600; timeseconds += tc) {
              timecodes += `${String(timeseconds)} == ${String(
                formatSecondsAsTime(timeseconds)
              )} ##`;
            }
            str = timecodes;
            log(str);
          }
          this.chapters = str
            .split("#")
            .map((line) => line.trim().split("=="))
            .filter((x) => x[1])
            .map(([time, title], idx) => {
              let div = createElement("roads-video-chapter");
              div.title = title;
              div.setAttribute("time", time);
              div.setAttribute("chapter", idx + 1);
              this.lastChapter++;
              return {
                chapterNr: idx + 1,
                time: parseFloat(time),
                title: title.trim(),
                div,
              };
            });

          this.$(".chapters").innerHTML = "";
          this.$(".chapters").append(
            ...this.chapters.map((chapter) => chapter.div)
          );
        } //loadChapters
        disconnectedCallback() {
          this.removeListeners((removeFunc) => removeFunc());
        }
        setLanguage(lang = this.videolanguage, subtitles = true) {
          [...this.video.textTracks].forEach((track) => {
            if (track.language == lang) track.mode = "showing";
            // disabled,hidden,showing
            else track.mode = "disabled";
          });
        }
      }
    ); // define: roads-video

    customElements.define(
      "roads-video-chapter",
      class extends HTMLElement {
        constructor() {
          super();
        }
        seen(state = false) {
          this.classList.toggle("chapter--seen", state);
        }
        connectedCallback() {
          setTimeout(() => {
            let $roads_video = this.getRootNode().host;
            let time = this.getAttribute("time");
            let title = this.getAttribute("title");
            let chapterNr = this.getAttribute("chapter");
            let timespan = createElement(
              "SPAN",
              String(formatSecondsAsTime(time))
            );
            timespan.classList.add("chapter--time");
            let titlespan = createElement("SPAN", title);
            titlespan.classList.add("chapter--title");
            this.id = "chapter" + chapterNr;
            this.append(timespan, titlespan);
            attachListeners({
              root: this,
              events: [["click", (evt) => $roads_video.seek(this)]],
            });
          });
        }
      }
    ); // define: roads-video-chapter

    const __EVENT_SET_LANGUAGE__ = "EventLanguage";

    customElements.define(
      "rt-flag",
      class extends RTElement {
        connectedCallback() {
          let videoManager = this.closestElement(__TAG_VIDEO_MANAGER__);
          let lang = this.getAttribute("lang");
          let tag = `flag-${lang == "en" ? "gb" : lang}`; // use gb flag for english
          let flag = document.createElement(tag);
          this.append(flag);
          this.onclick = () => {
            this.dispatch({
              name: __EVENT_SET_LANGUAGE__,
              detail: lang,
            });
          };
        }
      }
    ); // define: rt-flag

    customElements.define(
      __TAG_VIDEO_MANAGER__,
      class extends RTElement {
        set lang(lang) {
          //set video language
          let newlocation =
            location.origin + `?video=${this.videofilename}&lang=${lang}`;
          document.location = newlocation;
        } // set video language
        connectedCallback() {
          this.addEventListener(__EVENT_SET_LANGUAGE__, (evt) => {
            log(21, evt.detail);
            this.lang = evt.detail;
          });
        }
      }
    ); // define: __TAG_VIDEO_MANAGER__

    // end IIFE
  })({
  // IIFE parameters
});
